import express from 'express';
import { getSessionList, unpairUser } from '../../index.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

// List all sessions (public or admin-protected)
router.get('/', (req, res) => {
  res.json({ sessions: getSessionList() });
});

// Unpair (auth required)
router.delete('/:number', authRequired, async (req, res) => {
  const ok = await unpairUser(req.params.number);
  if (ok) res.json({ success: true });
  else res.status(400).json({ error: 'Unpair failed' });
});

export default router;