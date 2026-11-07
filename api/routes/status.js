import express from 'express';
import { getSessionList } from '../../index.js';

const router = express.Router();

router.get('/:number', (req, res) => {
  const list = getSessionList();
  const s = list.find((x) => x.number === req.params.number);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  res.json(s);
});

// SSE — live status stream
router.get('/:number/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = () => {
    const list = getSessionList();
    const s = list.find((x) => x.number === req.params.number);
    res.write(`data: ${JSON.stringify(s || { error: 'not found' })}\n\n`);
  };

  send();
  const interval = setInterval(send, 5000);

  req.on('close', () => clearInterval(interval));
});

export default router;