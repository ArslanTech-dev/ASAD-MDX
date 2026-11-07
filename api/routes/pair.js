import express from 'express';
import { requestPairingCode } from '../../index.js';
import { validateNumber } from '../middleware/validate.js';
import { pairLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/', pairLimiter, validateNumber, async (req, res, next) => {
  try {
    const code = await requestPairingCode(req.cleanNumber);
    res.json({
      success: true,
      number: req.cleanNumber,
      code,
      expiresIn: 60,
      message: 'Enter this code in WhatsApp → Linked Devices',
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;