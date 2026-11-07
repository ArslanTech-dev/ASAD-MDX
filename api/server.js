/**
 * ASAD MD — API Server (Dynamic Port)
 * Start: node api/server.js
 * Auto-integrates with bot if BOT_AUTOSTART=true
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

export function createApp() {
  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(generalLimiter);

  app.get('/', (req, res) => {
    res.json({
      name: CONFIG.BOT_NAME,
      version: CONFIG.VERSION,
      powered: "ARSLAN TECH'S",
      status: 'online',
      time: new Date().toISOString(),
    });
  });

  app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

  app.use('/api/pair', pairRoute);
  app.use('/api/session', sessionRoute);
  app.use('/api/status', statusRoute);
  app.use('/api/admin', adminRoute);

  app.use((err, req, res, next) => {
    logger.error('API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

/**
 * 🔥 Dynamic port binding
 * Start from PORT (default 3000), try next ports on EADDRINUSE
 */
export async function startServer(startPort = CONFIG.API.PORT, maxAttempts = 10) {
  const app = createApp();

  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    try {
      const server = await tryListen(app, port);
      await fs.writeJson(PORT_FILE, { port, startedAt: new Date().toISOString() });

      logger.success(`🌐 API running: http://localhost:${port}`);
      logger.info(`📁 Port saved to: api/.port`);

      return { server, port };
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        logger.warn(`⚠️  Port ${port} busy — trying ${port + 1}...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`All ports ${startPort}-${startPort + maxAttempts - 1} are busy`);
}

function tryListen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => resolve(server));
    server.on('error', reject);
  });
}

/* ─── CLI entry ─── */
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  startServer()
    .then(({ server, port }) => {
      const shutdown = () => {
        logger.info('🛑 Shutting down API...');
        server.close(() => process.exit(0));
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    })
    .catch((err) => {
      logger.error('Fatal API error:', err);
      process.exit(1);
    });
}