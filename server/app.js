import express from 'express';
import cors from 'cors';
import apiRouter from './routes.js';
import { flushDurableStore } from './persist.js';

/**
 * Shared Express application for serverless deployments (Vercel).
 *
 * Both `api/index.js` and `api/[...path].js` import this factory so there is a
 * single implementation of CORS, body parsing, path normalization and durable
 * storage flushing.
 */
export function createApiApp() {
  const app = express();

  // Vercel terminates TLS in front of the function.
  app.set('trust proxy', 1);

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Cart-Session-Id',
      'X-User-Role',
      'X-User-Name',
      'X-User-Stall-Id'
    ]
  }));

  // Persist any data written by this request to the durable store *before* the
  // response is returned. Serverless functions may be frozen right after the
  // response ends, so a background write would be lost.
  app.use((req, res, next) => {
    const originalEnd = res.end;
    let flushed = false;
    res.end = function patchedEnd(...args) {
      if (flushed) {
        return originalEnd.apply(res, args);
      }
      flushed = true;
      flushDurableStore()
        .catch(err => console.error('[storage] Flush failed:', err && err.message))
        .finally(() => {
          originalEnd.apply(res, args);
        });
      return res;
    };
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  // Strip '/api' prefix and normalize Vercel serverless / catch-all parameters.
  app.use((req, res, next) => {
    // 1. Vercel's matched path header (e.g. /api/orders/manual)
    const matchedPath = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];
    if (matchedPath && typeof matchedPath === 'string' && matchedPath.startsWith('/api/')) {
      req.url = matchedPath.slice(4);
      return next();
    }

    // 2. req.query.path (Vercel catch-all [...path] parameter)
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      const pathParam = req.query?.path || parsedUrl.searchParams.getAll('path');
      if (pathParam && (Array.isArray(pathParam) ? pathParam.length > 0 : Boolean(pathParam))) {
        const segments = Array.isArray(pathParam) ? pathParam : [pathParam];
        if (req.query && req.query.path) delete req.query.path;
        parsedUrl.searchParams.delete('path');
        const remainingQuery = parsedUrl.searchParams.toString();
        req.url = '/' + segments.join('/') + (remainingQuery ? '?' + remainingQuery : '');
        return next();
      }
    } catch {}

    // 3. Plain prefix stripping
    if (req.url.startsWith('/api/')) {
      req.url = req.url.slice(4);
    } else if (req.url.startsWith('/api')) {
      req.url = req.url.slice(4) || '/';
    }

    next();
  });

  app.use(apiRouter);

  // Always answer unmatched API calls with JSON (never an HTML error page).
  app.use((req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[api] Unhandled error:', err);
    if (res.headersSent) return;
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

export default createApiApp;
