import jwt from 'jsonwebtoken';
import { CONFIG } from '../../config.js';

export function signToken(payload) {
  return jwt.sign(payload, CONFIG.API.JWT_SECRET, { expiresIn: CONFIG.API.JWT_EXPIRES });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, CONFIG.API.JWT_SECRET);
  } catch {
    return null;
  }
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  req.user = user;
  next();
}