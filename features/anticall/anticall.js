import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.join(__dirname, '..', '..', 'database', 'configs');
const cfgPath = (n) => path.join(BASE, `${n}.json`);

export async function getConfig(sessionNumber) {
  try {
    const p = cfgPath(sessionNumber);
    if (await fs.pathExists(p)) return await fs.readJson(p);
  } catch {}
  return { anticall: true, antidelete: true, welcome: true, goodbye: true };
}

export async function setConfig(sessionNumber, patch) {
  const cfg = await getConfig(sessionNumber);
  const merged = { ...cfg, ...patch };
  await fs.ensureDir(BASE);
  await fs.writeJson(cfgPath(sessionNumber), merged, { spaces: 2 });
  return merged;
}

export async function handleCall(sock, sessionNumber, calls) {
  const cfg = await getConfig(sessionNumber);
  if (!cfg.anticall) return;

  for (const call of calls) {
    if (call.status !== 'offer') continue;
    try {
      await sock.rejectCall(call.id, call.from);
      logger.info(`📵 Call rejected: ${call.from}`);
      await sock.sendMessage(`${sessionNumber}@s.whatsapp.net`, {
        text: `📵 *Call Rejected*\n\n👤 From: ${call.from.split('@')[0]}\n⏰ ${new Date().toLocaleTimeString()}`,
      });
    } catch (e) { logger.warn(`Reject fail: ${e.message}`); }
  }
}