import rateLimit from 'express-rate-limit';
import { LIMITS } from '../../core/limits.js';

export const generalLimiter = rateLimit({
  windowMs: LIMITS.RATE_LIMIT_WINDOW_MS,
  max: LIMITS.RATE_LIMIT_MAX,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const pairLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: { error: 'Too many pairing attempts — wait 60s' },
  standardHeaders: true,
  legacyHeaders: false,
});