import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Optional durable storage for serverless deployments (Vercel).
 *
 * Vercel's filesystem is ephemeral: every cold start gets a fresh /tmp and
 * concurrent instances do not share it. To keep orders, payments, inventory and
 * accounting records across requests we mirror the JSON data files to a
 * Redis-compatible REST store (Vercel KV / Upstash Redis).
 *
 * Enable by setting either:
 *   KV_REST_API_URL + KV_REST_API_TOKEN            (Vercel KV)
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *
 * When those variables are absent (normal local development) this module is a
 * no-op and the app keeps using the local filesystem exactly as before.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const kvEnabled = Boolean(KV_URL && KV_TOKEN);

const KEY_PREFIX = process.env.DATA_KEY_PREFIX || 'vivacity:data:';

// Transactional / business data that must survive cold starts.
const PERSISTED_FILES = [
  'orders.json',
  'archived_orders.json',
  'expenses.json',
  'purchases.json',
  'inventory.json',
  'inventory_movements.json',
  'recipes.json',
  'reviews.json',
  'stall_status.json',
  'cart_reservations.json',
  'customization_config.json',
  'cash_reconciliation.json',
  'void_requests.json',
  'archived_void_requests.json',
  'reset_history.json',
  'removed_wastage.json',
  'revenue_resets.json'
];

// Static configuration that can safely be seeded from the deployed bundle when
// the durable store has no value yet (first deploy).
const SEEDABLE_FILES = [
  'recipes.json',
  'customization_config.json',
  'inventory.json',
  'stall_status.json',
  'expenses.json',
  'purchases.json',
  'reviews.json'
];

const lastPersisted = new Map();

// The Database class writes JSON files synchronously. We track whether anything
// changed so the serverless adapter can flush only when needed (and await it
// before the response is sent).
let durableDirty = false;
let activeDataDir = null;
let lastPersistAt = null;
let lastStorageError = null;

export function getDurableStatus() {
  return {
    enabled: kvEnabled,
    lastPersistAt,
    lastError: lastStorageError
  };
}

export function markDurableDirty() {
  durableDirty = true;
}

/**
 * Flush changed data files to the durable store.
 * Returns true when there was nothing to do or the write succeeded.
 */
export async function flushDurableStore() {
  if (!kvEnabled || !activeDataDir) return true;
  if (!durableDirty) return true;
  durableDirty = false;
  const ok = await persistToKv(activeDataDir);
  if (!ok) durableDirty = true;
  return ok;
}

async function kvCommand(command) {
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  if (!res.ok) {
    throw new Error(`KV command failed (${res.status}): ${await res.text().catch(() => '')}`);
  }
  return res.json();
}

async function kvPipeline(commands) {
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands)
  });
  if (!res.ok) {
    throw new Error(`KV pipeline failed (${res.status}): ${await res.text().catch(() => '')}`);
  }
  return res.json();
}

/**
 * Locate the static config files shipped with the deployment. On Vercel the
 * bundle lives in a different directory than `server/`, so check the known
 * layouts instead of assuming one.
 */
function resolveBundledDataDir() {
  const candidates = [
    path.join(__dirname, 'data'),
    path.join(process.cwd(), 'server', 'data'),
    path.join(__dirname, '..', 'server', 'data'),
    path.join(process.cwd(), 'api', 'server', 'data')
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {}
  }
  return null;
}

function seedBundledConfig(dataDir) {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const bundled = resolveBundledDataDir();
    if (!bundled || path.resolve(bundled) === path.resolve(dataDir)) return 0;
    let seeded = 0;
    for (const file of SEEDABLE_FILES) {
      const target = path.join(dataDir, file);
      if (fs.existsSync(target)) continue;
      const source = path.join(bundled, file);
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, target);
        seeded++;
      }
    }
    return seeded;
  } catch (err) {
    console.error('[storage] Failed to seed bundled config:', err.message);
    return 0;
  }
}

/**
 * Copy the data files stored in the durable store into `dataDir` so the
 * synchronous Database class can read them normally.
 */
export async function hydrateFromKv(dataDir) {
  activeDataDir = dataDir;
  const seeded = seedBundledConfig(dataDir);
  if (!kvEnabled) return { hydrated: 0, seeded };

  try {
    const results = await kvPipeline(PERSISTED_FILES.map(file => ['GET', KEY_PREFIX + file]));
    let hydrated = 0;
    results.forEach((entry, index) => {
      const value = entry?.result;
      if (typeof value !== 'string' || value.length === 0) return;
      try {
        JSON.parse(value); // only store valid JSON
        fs.writeFileSync(path.join(dataDir, PERSISTED_FILES[index]), value, 'utf-8');
        lastPersisted.set(PERSISTED_FILES[index], value);
        hydrated++;
      } catch {
        // Ignore a corrupted key rather than breaking startup.
      }
    });

    lastStorageError = null;
    return { hydrated, seeded };
  } catch (err) {
    lastStorageError = err.message;
    console.error('[storage] Failed to hydrate data from KV:', err.message);
    return { hydrated: 0, seeded };
  }
}

/**
 * Mirror the data files to the durable store. Only files whose contents changed
 * are written, so the command count stays low.
 */
export async function persistToKv(dataDir) {
  activeDataDir = dataDir;
  if (!kvEnabled) return true;
  try {
    const pending = [];
    for (const file of PERSISTED_FILES) {
      const fullPath = path.join(dataDir, file);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (lastPersisted.get(file) === content) continue;
      pending.push({ file, content });
    }
    if (pending.length === 0) return true;
    const commands = pending.map(({ file, content }) => ['SET', KEY_PREFIX + file, content]);
    await kvPipeline(commands);
    // Only remember a value after the write actually succeeded, so a transient
    // KV failure is retried on the next request instead of being skipped.
    for (const { file, content } of pending) {
      lastPersisted.set(file, content);
    }
    lastPersistAt = new Date().toISOString();
    lastStorageError = null;
    return true;
  } catch (err) {
    lastStorageError = err.message;
    console.error('[storage] Failed to persist data to KV:', err.message);
    return false;
  }
}
