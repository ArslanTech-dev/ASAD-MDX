/**
 * ASAD MD — API Server
 * Supports:
 *   • Local dev  → dynamic port (3000, 3001, ...)
 *   • Pxxl/PaaS  → process.env.PORT (0.0.0.0 bind)
 *   • Static website serving from /public
 * 
 * Start: npm start (auto from index.js) or node api/server.js
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { CONFIG } from '../config.js';

import pairRoute from './routes/pair.js';
import sessionRoute from './routes/session.js';
import statusRoute from './routes/status.js';
import adminRoute from './routes/admin.js';
import { generalLimiter } from './middleware/rateLimit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT_FILE = path.join(__dirname, '.port');

/* ─── Express app ─────────────────────────────── */
export function createApp() {
  const app = express();

  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '1mb' }));
  
  // 👇 WEBSITE SERVE KARNE KE LIYE (public/index.html) 👇
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use(generalLimiter);

  // API Info (Moved to '/api/info' taake website block na ho)
  app.get('/api/info', (req, res) => {
    res.json({
      name: CONFIG.BOT_NAME,
      version: CONFIG.VERSION,
      powered: "ARSLAN TECH'S",
      status: 'online',
      port: process.env.PORT || 'local',
      uptime: Math.floor(process.uptime()),
      time: new Date().toISOString(),
    });
  });

  // Health check (Pxxl/Render/Railway probes this)
  app.get('/health', (req, res) => {
    res.json({
      ok: true,
      uptime: Math.floor(process.uptime()),
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    });
  });

  // API routes
  app.use('/api/pair', pairRoute);
  app.use('/api/session', sessionRoute);
  app.use('/api/status', statusRoute);
  app.use('/api/admin', adminRoute);

  // 404 Handler
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found', path: req.path });
    }
    // Agar koi galat URL daale to index.html (website) show karo
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  // Error handler
  app.use((err, req, res, next) => {
    logger.error('API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

/* ─── Listen helper ───────────────────────────── */
function tryListen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => resolve(server));
    server.on('error', reject);
    server.on('listening', () => {
      const addr = server.address();
      logger.success(`🌐 Listening on 0.0.0.0:${addr.port}`);
    });
  });
}

/* ─── Start server ────────────────────────────── */
export async function startServer() {
  const app = createApp();

  // 🔵 Pxxl/PaaS: PORT env assigned by platform — use it strictly
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid PORT env: ${process.env.PORT}`);
    }

    const server = await tryListen(app, port);
    await fs.writeJson(PORT_FILE, {
      port,
      env: 'paas',
      startedAt: new Date().toISOString(),
    });
    logger.success(`🌐 API & WEBSITE live on PORT ${port} (Pxxl mode)`);
    return { server, port };
  }

  // 🟢 Local dev: try 3000 → 3009
  const basePort = CONFIG.API.PORT || 3000;
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    const port = basePort + i;
    try {
      const server = await tryListen(app, port);
      await fs.writeJson(PORT_FILE, {
        port,
        env: 'local',
        startedAt: new Date().toISOString(),
      });
      logger.success(`🌐 API & WEBSITE live on http://localhost:${port} (local mode)`);
      return { server, port };
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        logger.warn(`⚠️  Port ${port} busy — trying ${port + 1}...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`All ports ${basePort}-${basePort + maxAttempts - 1} busy`);
}

/* ─── CLI entry (standalone) ──────────────────── */
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  startServer()
    .then(({ server }) => {
      const shutdown = (sig) => {
        logger.info(`🛑 ${sig} — shutting down...`);
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 5000);
      };
      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGTERM', () => shutdown('SIGTERM'));
    })
    .catch((err) => {
      logger.error('Fatal API error:', err);
      process.exit(1);
    });
}