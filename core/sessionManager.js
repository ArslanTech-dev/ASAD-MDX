import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(__dirname, '..', 'database', 'sessions');

export async function ensureSessionRoot() {
  await fs.ensureDir(SESSIONS_DIR);
}

export async function getSessionPath(number) {
  const p = path.join(SESSIONS_DIR, String(number));
  await fs.ensureDir(p);
  return p;
}

export async function deleteSession(number) {
  const p = path.join(SESSIONS_DIR, String(number));
  try {
    await fs.remove(p);
    return true;
  } catch {
    return false;
  }
}

export async function listStoredSessions() {
  await ensureSessionRoot();
  const entries = await fs.readdir(SESSIONS_DIR).catch(() => []);
  const out = [];
  for (const num of entries) {
    if (!/^\d{10,15}$/.test(num)) continue;
    if (await fs.pathExists(path.join(SESSIONS_DIR, num, 'creds.json'))) out.push(num);
  }
  return out;
}

export async function sessionExists(number) {
  return fs.pathExists(path.join(SESSIONS_DIR, String(number), 'creds.json'));
}
