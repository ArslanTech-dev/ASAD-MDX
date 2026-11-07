/**
 * ASAD MD — Plugin Loader
 * Supports:
 *   • Single plugin:  export default { command: 'ping', execute() {} }
 *   • Multi plugin:   export default [ { command: 'ping' }, { command: 'alive' } ]
 *   • Aliases, categories, nested folders
 *   • Auto hot-reload friendly (cache-bust via ?t=)
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');

/* ─── Registry ─────────────────────────────────── */
export const plugins = new Map();        // command/alias → plugin object
export const pluginMeta = new Map();     // plugin object → { file, category, aliases }

/* ─── Load ─────────────────────────────────────── */
export async function loadPlugins() {
  plugins.clear();
  pluginMeta.clear();

  const t0 = Date.now();
  const files = await walk(PLUGINS_DIR);

  let fileCount = 0;
  let cmdCount = 0;
  const byCategory = {};

  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    if (file.endsWith('index.js')) continue;   // skip index files

    fileCount++;
    const fileName = path.relative(PLUGINS_DIR, file);

    try {
      // cache-bust for hot reload
      const mod = await import(pathToFileURL(file).href + '?t=' + Date.now());
      const exported = mod.default || mod;
      const list = Array.isArray(exported) ? exported : [exported];

      for (const p of list) {
        if (!p || typeof p !== 'object') continue;
        if (!p.command || typeof p.command !== 'string') {
          logger.warn(`⚠️  ${fileName}: missing "command"`);
          continue;
        }

        const cmd = p.command.toLowerCase();
        const aliases = (p.aliases || []).map((a) => String(a).toLowerCase());
        const category = p.category || 'misc';

        // Main command register
        plugins.set(cmd, p);
        cmdCount++;

        // Aliases register
        for (const a of aliases) plugins.set(a, p);

        // Metadata
        pluginMeta.set(p, { file: fileName, category, aliases });
        byCategory[category] = (byCategory[category] || 0) + 1;
      }
    } catch (e) {
      logger.error(`❌ Plugin failed: ${fileName}`, e);
    }
  }

  /* ─── Summary ─────────────────────────────── */
  const ms = Date.now() - t0;
  const categorySummary = Object.entries(byCategory)
    .map(([c, n]) => `${c}(${n})`)
    .join(' ');

  logger.success(
    `🔌 ${cmdCount} command(s) from ${fileCount} file(s) — ${ms}ms`
  );
  if (categorySummary) {
    logger.info(`   📂 ${categorySummary}`);
  }

  return { fileCount, cmdCount, plugins: plugins.size };
}

/* ─── Get single plugin ────────────────────────── */
export const getPlugin = (cmd) => plugins.get(String(cmd).toLowerCase());

/* ─── Get all commands ─────────────────────────── */
export function getCommandList() {
  const seen = new Set();
  const out = [];
  for (const [, p] of plugins) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

/* ─── Get commands by category ─────────────────── */
export function getCommandsByCategory() {
  const cats = {};
  for (const p of getCommandList()) {
    const cat = p.category || 'misc';
    (cats[cat] = cats[cat] || []).push(p);
  }
  return cats;
}

/* ─── Reload (hot swap) ────────────────────────── */
export async function reloadPlugins() {
  logger.info('♻️  Reloading plugins...');
  return await loadPlugins();
}

/* ─── Recursive walk ───────────────────────────── */
async function walk(dir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // skip node_modules & hidden dirs
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      await walk(full, out);
    } else if (e.isFile()) {
      out.push(full);
    }
  }
  return out;
}