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

// Strip '/api' prefix if present so router matches cleanly
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    req.url = req.url.slice(4) || '/';
  }
  next();
});

app.use(apiRouter);

export default app;
