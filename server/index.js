import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter, { getNetworkInfo } from './routes.js';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Static assets
  app.use(express.static(path.resolve(__dirname, '../public')));

  // REST API Routes
  app.use('/api', apiRouter);

  if (!isProd) {
    // Integrate Vite in development for seamless HMR and unified port
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    const net = getNetworkInfo(PORT);
    console.log(`\n==================================================`);
    console.log(`🍽️  Vivacity Food Court • Unified Dining OS`);
    console.log(`🚀 System Online: http://localhost:${PORT}`);
    if (net.primaryIp && net.primaryIp !== 'localhost') {
      console.log(`📡 Local Wi-Fi:   ${net.recommendedBaseUrl}`);
      console.log(`📱 Phone Scans:   ${net.activeQrBaseUrl}/t/T17`);
    } else {
      console.log(`📱 Table T17 URL: http://localhost:${PORT}/t/T17`);
    }
    console.log(`📊 Admin Control: http://localhost:${PORT}/admin`);
    console.log(`👨‍🍳 Kitchen KDS:  http://localhost:${PORT}/kitchen`);
    console.log(`==================================================\n`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
