import http from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import apiRouter, { getNetworkInfo } from './routes.js';
import { eventBus } from './events.js';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT, 10) || 3000;

/**
 * Checks whether an active, healthy Vivacity Food Court instance is already serving on port.
 */
async function checkExistingServer(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/tables`, { timeout: 1500 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            resolve({ isVivacity: true, healthy: true, status: res.statusCode });
            return;
          }
        } catch {}
        resolve({ isVivacity: false, healthy: false });
      });
    });
    req.on('error', () => resolve({ isVivacity: false, healthy: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ isVivacity: false, healthy: false });
    });
  });
}

/**
 * Identifies the process ID currently bound to the specified port.
 */
function findProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const netstat = execSync('netstat -ano -p tcp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      for (const line of netstat.split('\n')) {
        if (line.includes(`:${port}`) && line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1], 10);
          if (pid && pid !== process.pid) {
            return pid;
          }
        }
      }
    } else {
      const lsof = execSync(`lsof -t -i :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const pid = parseInt(lsof.trim(), 10);
      if (pid && pid !== process.pid) return pid;
    }
  } catch {}
  return null;
}

/**
 * Safely verifies if a given PID belongs to this project (Vivacity node server).
 * Never targets unrelated external applications.
 */
function isProjectProcess(pid) {
  if (!pid) return false;
  try {
    if (process.platform === 'win32') {
      const cmd = `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter ('ProcessId = ' + ${pid})).CommandLine"`;
      const cmdLine = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).toLowerCase();
      return (
        cmdLine.includes('node') &&
        (cmdLine.includes('vivacity') || cmdLine.includes('server/index.js') || cmdLine.includes('server\\index.js'))
      );
    } else {
      const ps = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).toLowerCase();
      return (
        ps.includes('node') &&
        (ps.includes('vivacity') || ps.includes('server/index.js'))
      );
    }
  } catch {}
  return false;
}

/**
 * Safely terminates only a verified stale process from this project.
 */
function safelyStopProcess(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
    return true;
  } catch {
    return false;
  }
}

function printBanner(port, isAlreadyRunning = false) {
  const net = getNetworkInfo(port);
  console.log(`\n==================================================`);
  console.log(`🍽️  Vivacity Food Court • Unified Dining OS`);
  console.log(`🚀 Laptop URL:   http://localhost:${port}`);
  if (net.isReachableOnLan) {
    console.log(`📡 Phone / Wi-Fi:${net.recommendedBaseUrl}`);
    console.log(`📱 Table T17 QR: ${net.activeQrBaseUrl}/t/T17`);
  } else {
    console.log(`⚠️  Local Wi-Fi:  No active Wi-Fi LAN IP detected (offline)`);
    console.log(`📱 Table T17 QR: http://localhost:${port}/t/T17 (Laptop only)`);
  }
  console.log(`📊 Admin Panel:  http://localhost:${port}/admin`);
  console.log(`👨‍🍳 Kitchen KDS:  http://localhost:${port}/kitchen`);
  console.log(`==================================================`);
  if (!net.isReachableOnLan) {
    console.log(`💡 Restaurant Demo Tip: Connect your laptop to the restaurant's Wi-Fi`);
    console.log(`   (or turn on your phone's Personal Hotspot) so your phone can open the app.\n`);
  } else if (isAlreadyRunning) {
    console.log(`ℹ️  Vivacity Food Court is already active and healthy on port ${port}.`);
    console.log(`🌐 Existing instance verified. App is accessible and ready.\n`);
  } else {
    console.log(``);
  }
}

async function startServer() {
  // 1. Check if an instance of this project is already running and healthy on port 3000
  const existing = await checkExistingServer(PORT);
  if (existing.healthy) {
    printBanner(PORT, true);
    // Keep process open gracefully without crashing or throwing EADDRINUSE
    const keepAlive = setInterval(() => {}, 60000);
    const cleanExit = () => {
      clearInterval(keepAlive);
      process.exit(0);
    };
    process.on('SIGINT', cleanExit);
    process.on('SIGTERM', cleanExit);
    return;
  }

  // 2. If port is occupied by a stale, non-responsive project process, safely clean it up
  const occupyingPid = findProcessOnPort(PORT);
  if (occupyingPid) {
    if (isProjectProcess(occupyingPid)) {
      console.log(`[Startup Recovery] Port ${PORT} occupied by stale project process (PID: ${occupyingPid}). Stopping stale process...`);
      safelyStopProcess(occupyingPid);
      // Brief pause to allow OS socket release
      await new Promise(r => setTimeout(r, 600));
    } else {
      console.warn(`[Startup Warning] Port ${PORT} is in use by an external application (PID: ${occupyingPid}). Preserving external process.\n`);
    }
  }

  const app = express();
  const httpServer = http.createServer(app);

  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      callback(null, Boolean(origin && allowedOrigins.includes(origin)));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'X-Cart-Session-Id',
      'X-User-Role',
      'X-User-Name',
      'X-User-Stall-Id'
    ],
    credentials: false
  }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    res.setHeader('X-XSS-Protection', '0');
    if (isProd && process.env.ENABLE_HSTS === 'true') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    }
    next();
  });
  app.use(express.json({ limit: '100kb', strict: true }));

  // Static assets
  app.use(express.static(path.resolve(__dirname, '../public')));

  // REST API Routes
  app.use('/api', apiRouter);

  if (!isProd) {
    // Integrate Vite in development with HMR attached to the shared HTTP server (prevents separate WebSocket port bindings)
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
          clientPort: PORT,
        },
      },
      appType: 'spa',
      root: path.resolve(__dirname, '..'),
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build
    app.use(express.static(path.resolve(__dirname, '../dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../dist/index.html'));
    });
  }

  // Handle potential EADDRINUSE error gracefully
  httpServer.on('error', async (err) => {
    if (err.code === 'EADDRINUSE') {
      const recheck = await checkExistingServer(PORT);
      if (recheck.healthy) {
        printBanner(PORT, true);
        return;
      }
      const stalePid = findProcessOnPort(PORT);
      if (stalePid && isProjectProcess(stalePid)) {
        console.log(`[Startup Recovery] Stale process PID ${stalePid} detected on port ${PORT}. Stopping and binding...`);
        safelyStopProcess(stalePid);
        await new Promise(r => setTimeout(r, 600));
        httpServer.listen(PORT, '0.0.0.0', () => printBanner(PORT, false));
        return;
      }
      console.warn(`\n[Notice] Port ${PORT} is occupied by another application. Existing QR codes and system routes rely on port ${PORT}.\n`);
      return;
    }
    console.error('[Server Error]', err);
    process.exit(1);
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    printBanner(PORT, false);

    // Continuous Wi-Fi network change monitor:
    // Detects when the laptop connects to a new restaurant Wi-Fi and updates QR URLs in real time
    let lastKnownIp = getNetworkInfo(PORT).primaryIp;
    setInterval(() => {
      try {
        const currentNet = getNetworkInfo(PORT);
        if (currentNet.primaryIp && currentNet.primaryIp !== lastKnownIp) {
          console.log(`\n📡 [Wi-Fi Network Change Detected]`);
          console.log(`   Previous IP:  ${lastKnownIp || 'none'}`);
          console.log(`   New LAN IP:   ${currentNet.primaryIp}`);
          console.log(`🚀 Phone URL:    ${currentNet.recommendedBaseUrl}`);
          console.log(`📱 Table T17 QR: ${currentNet.activeQrBaseUrl}/t/T17\n`);
          lastKnownIp = currentNet.primaryIp;
          eventBus.broadcast('network_updated', currentNet);
        }
      } catch {}
    }, 4000);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
