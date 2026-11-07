import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');

export const plugins = new Map();

export async function loadPlugins() {
  plugins.clear();
  const files = await walk(PLUGINS_DIR);
  for (const f of files) {
    if (!f.endsWith('.js') || f.endsWith('index.js')) continue;
    try {
      const mod = await import(pathToFileURL(f).href + '?t=' + Date.now());
      const p = mod.default || mod;
      if (!p.command) continue;
      plugins.set(p.command.toLowerCase(), p);
      for (const a of (p.aliases || [])) plugins.set(a.toLowerCase(), p);
    } catch (e) {
      logger.warn(`Plugin fail ${path.basename(f)}: ${e.message}`);
    }
  }
  logger.success(`🔌 ${plugins.size} command(s) loaded`);
}

async function walk(dir) {
  const out = [];
  try {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...await walk(p));
      else out.push(p);
    }
  } catch {}
  return out;
}

export const getPlugin = (cmd) => plugins.get(String(cmd).toLowerCase());
