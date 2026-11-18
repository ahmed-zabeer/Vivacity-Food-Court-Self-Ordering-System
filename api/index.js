import express from 'express';
import cors from 'cors';
import apiRouter from '../server/routes.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Cart-Session-Id', 'X-User-Role', 'X-User-Name', 'X-User-Stall-Id']
}));

app.use(express.json({ limit: '100kb' }));

// Strip '/api' prefix and normalize Vercel serverless / catch-all query parameters
app.use((req, res, next) => {
  // 1. Check if Vercel provided matched-path header (e.g. /api/orders/manual)
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];
  if (matchedPath && typeof matchedPath === 'string' && matchedPath.startsWith('/api/')) {
    req.url = matchedPath.slice(4);
    return next();
  }

  // 2. Check req.query.path (Vercel catch-all [...path] parameter)
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

  // 3. Normal URL prefix stripping
  if (req.url.startsWith('/api/')) {
    req.url = req.url.slice(4);
  } else if (req.url.startsWith('/api')) {
    req.url = req.url.slice(4) || '/';
  }

  next();
});

app.use(apiRouter);

export default app;
