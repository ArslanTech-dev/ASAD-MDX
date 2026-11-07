import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { LIMITS } from '../../core/limits.js';
import logger from '../../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.join(__dirname, '..', '..', 'database', 'antidelete');

const cache = new Map();
const k = (s, id) => `${s}:${id}`;

export async function cacheMessage(sessionNumber, msg) {
  const id = msg.key.id;
  if (!id) return;
  const text = msg.message?.conversation
    || msg.message?.extendedTextMessage?.text
    || msg.message?.imageMessage?.caption
    || msg.message?.videoMessage?.caption
    || '';

  const data = {
    id,
    from: msg.key.remoteJid,
    fromMe: msg.key.fromMe,
    sender: msg.key.participant || msg.key.remoteJid,
    pushName: msg.pushName || '',
    timestamp: msg.messageTimestamp,
    text,
    mediaType: msg.message?.imageMessage ? '🖼️ Image'
      : msg.message?.videoMessage ? '🎥 Video'
      : msg.message?.audioMessage ? '🎤 Audio'
      : msg.message?.documentMessage ? '📄 Document'
      : msg.message?.stickerMessage ? '🎨 Sticker'
      : null,
  };

  cache.set(k(sessionNumber, id), { ...data, expires: Date.now() + LIMITS.ANTIDELETE_TTL_MS });

  try {
    const dir = path.join(BASE, sessionNumber);
    await fs.ensureDir(dir);
    await fs.writeJson(path.join(dir, `${id}.json`), data);
  } catch {}
}

export async function getCached(sessionNumber, id) {
  let entry = cache.get(k(sessionNumber, id));
  if (entry && entry.expires > Date.now()) return entry;
  try {
    const file = path.join(BASE, sessionNumber, `${id}.json`);
    if (await fs.pathExists(file)) return await fs.readJson(file);
  } catch {}
  return null;
}

export async function handleRevoke(sock, sessionNumber, revokeKey) {
  const id = revokeKey?.id;
  if (!id) return;
  const cached = await getCached(sessionNumber, id);
  if (!cached) return;

  const isGroup = cached.from.endsWith('@g.us');
  const chatLabel = isGroup ? `Group ${cached.from.split('@')[0]}` : 'DM';
  const senderLabel = cached.pushName || cached.sender.split('@')[0];

  const body = cached.text || cached.mediaType || '📎 Media';
  const header = `
╔══════════════════════════════════════╗
║      🚨 *ANTIDELETE ALERT* 🚨        ║
╚══════════════════════════════════════╝

👤 *Sender:* ${senderLabel}
💬 *Chat:* ${chatLabel}
⏰ *Time:* ${new Date(Number(cached.timestamp) * 1000).toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 *Deleted Message:*
${body}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

  try {
    await sock.sendMessage(`${sessionNumber}@s.whatsapp.net`, { text: header });
  } catch (e) { logger.warn(`Antidelete notify: ${e.message}`); }

  cache.delete(k(sessionNumber, id));
  try { await fs.remove(path.join(BASE, sessionNumber, `${id}.json`)); } catch {}
}

export function startCleanup() {
  setInterval(() => {
    const now = Date.now();
    for (const [key, v] of cache) if (v.expires < now) cache.delete(key);
  }, 60_000);
}