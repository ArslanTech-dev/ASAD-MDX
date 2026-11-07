import express from 'express';
import { getSessionList } from '../../index.js';
import { LIMITS } from '../../core/limits.js';
import { listStoredSessions } from '../../core/sessionManager.js';

const router = express.Router();

router.get('/stats', async (req, res) => {
  const active = getSessionList();
  const stored = await listStoredSessions();
  const mem = process.memoryUsage();

  res.json({
    bot: {
      uptime: Math.floor(process.uptime()),
      node: process.version,
      platform: process.platform,
    },
    sessions: {
      active: active.length,
      stored: stored.length,
      limit: LIMITS.MAX_SESSIONS,
      list: active,
    },
    memory: {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapMB: Math.round(mem.heapUsed / 1024 / 1024),
    },
  });
});

export default router;