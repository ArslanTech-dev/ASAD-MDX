/**
 * ═══════════════════════════════════════════════════════════════
 *  ASAD MD — Full Bot Engine (v2.1 — Pxxl Ready)
 *  Powered by ARSLAN TECH'S
 *  Single command: npm start (bot + API + plugins + sessions)
 * ═══════════════════════════════════════════════════════════════
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestWaWebVersion,
  Browsers,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

import { CONFIG } from './config.js';
import { LIMITS } from './core/limits.js';
import logger from './utils/logger.js';
import { sleep } from './utils/sleep.js';

// ─── Phase 2 imports ───
import { loadPlugins } from './core/pluginLoader.js';
import { handleMessage } from './handlers/message.js';
import { handleCall } from './features/anticall/anticall.js';
import { handleGroupParticipants } from './handlers/groupEvents.js';
import { startCleanup } from './features/antidelete/antidelete.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(__dirname, 'database', 'sessions');
const LOGO_PATH = path.join(__dirname, 'assets', 'logo.png');
const baileysLogger = pino({ level: 'silent' });

const IS_PXXL = !!process.env.PORT || process.env.NODE_ENV === 'production';

/* ─── State ────────────────────────────────────── */
export const activeSessions = new Map();
const pendingPairings = new Map();
const sessionStatus = new Map();
const retryCount = new Map();
const welcomedSessions = new Set();

/* ─── Banner ───────────────────────────────────── */
function displayBanner() {
  const c = {
    cyan: '\x1b[36m', purple: '\x1b[35m', green: '\x1b[32m',
    yellow: '\x1b[33m', red: '\x1b[31m', magenta: '\x1b[95m',
    bold: '\x1b[1m', dim: '\x1b[2m', reset: '\x1b[0m',
  };
  const V = '║', H = '═';

  const art = [
    ' █████╗ ███████╗ █████╗ ██████╗     ███╗   ███╗██████╗ ',
    '██╔══██╗██╔════╝██╔══██╗██╔══██╗    ████╗ ████║██╔══██╗',
    '███████║███████╗███████║██║  ██║    ██╔████╔██║██║  ██║',
    '██╔══██║╚════██║██╔══██║██║  ██║    ██║╚██╔╝██║██║  ██║',
    '██║  ██║███████║██║  ██║██████╔╝    ██║ ╚═╝ ██║██████╔╝',
    '╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝     ╚═╝     ╚═╝╚═════╝ ',
  ];

  const line = `${c.cyan}${V}${c.reset}`;
  const top = `${c.cyan}╔${H.repeat(70)}╗${c.reset}`;
  const mid = `${c.cyan}╠${H.repeat(70)}╣${c.reset}`;
  const bot = `${c.cyan}╚${H.repeat(70)}╝${c.reset}`;
  const empty = `${line}${' '.repeat(70)}${line}`;

  console.log('');
  console.log(top);
  console.log(empty);
  art.forEach((row, i) => {
    const color = i < 3 ? c.purple : c.magenta;
    console.log(`${line} ${color}${c.bold}${row.padEnd(70, ' ')}${c.reset} ${line}`);
  });
  console.log(empty);
  console.log(`${line} ${c.yellow}${c.bold}              ⚡ Powered by ARSLAN TECH'S ⚡${c.reset}               ${line}`);
  console.log(`${line} ${c.dim}          Multi-Session WhatsApp Bot Engine${c.reset}                ${line}`);
  console.log(mid);

  console.log(`${line}  ${c.green}${c.bold}▸ SYSTEM INFO${c.reset}${' '.repeat(55)}${line}`);
  console.log(`${line}   ${c.dim}├─${c.reset} Engine     ${c.cyan}Baileys v7 (rc14)${c.reset}${' '.repeat(41)}${line}`);
  console.log(`${line}   ${c.dim}├─${c.reset} Node.js    ${c.cyan}${process.version}${c.reset}${' '.repeat(Math.max(0, 42 - process.version.length))}${line}`);
  console.log(`${line}   ${c.dim}├─${c.reset} Platform   ${c.cyan}${os.platform()} ${os.arch()}${c.reset}${' '.repeat(Math.max(0, 43 - (os.platform() + os.arch()).length))}${line}`);
  console.log(`${line}   ${c.dim}├─${c.reset} Mode       ${c.cyan}${IS_PXXL ? 'Cloud (Pxxl)' : 'Local/Termux'}${c.reset}${' '.repeat(Math.max(0, 43 - (IS_PXXL ? 12 : 13)))}${line}`);
  console.log(`${line}   ${c.dim}├─${c.reset} Memory     ${c.cyan}${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB${c.reset}${' '.repeat(52)}${line}`);
  console.log(`${line}   ${c.dim}└─${c.reset} Max Users  ${c.cyan}${LIMITS.MAX_SESSIONS} sessions${c.reset}${' '.repeat(45)}${line}`);
  console.log(mid);
  console.log(`${line}  ${c.green}${c.bold}▸ SESSION STATUS${c.reset}${' '.repeat(53)}${line}`);
  console.log(`${line}   ${c.dim}├─${c.reset} Active     ${c.cyan}${activeSessions.size}${c.reset}${' '.repeat(54)}${line}`);
  console.log(`${line}   ${c.dim}└─${c.reset} Limit      ${c.cyan}${LIMITS.MAX_SESSIONS}${c.reset}${' '.repeat(54)}${line}`);
  console.log(mid);
  console.log(`${line} ${c.red}💖 For the one who makes it all worth it 💖${c.reset}${' '.repeat(18)}${line}`);
  console.log(bot);
  console.log('');
}

/* ─── Pairing formatter ───────────────────────── */
export function formatPairingCode(raw) {
  const clean = String(raw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length === 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  if (clean.length > 8) return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
  return clean;
}

/* ─── Helpers ──────────────────────────────────── */
export async function getSessionPath(number) {
  const p = path.join(SESSIONS_DIR, number);
  await fs.ensureDir(p);
  return p;
}

/* ─── Welcome ──────────────────────────────────── */
async function sendWelcomeMessage(sock, number) {
  const selfJid = `${number}@s.whatsapp.net`;
  const caption = `
╔══════════════════════════════════════╗
║      🎉 *ASAD MD CONNECTED* 🎉       ║
╚══════════════════════════════════════╝

*Assalam-o-Alaikum!* 👋
Aapka bot successfully pair ho gaya hai.

*📌 Quick Info:*
  • Bot Name  : ${CONFIG.BOT_NAME}
  • Version   : v${CONFIG.VERSION}
  • Owner     : Aap khud 👑
  • Powered by: ARSLAN TECH'S ⚡

*💡 Commands:*
  ${CONFIG.PREFIX[0]}ping  ·  ${CONFIG.PREFIX[0]}menu  ·  ${CONFIG.PREFIX[0]}alive

*⚙️ Owner Only:*
  ${CONFIG.PREFIX[0]}antidelete on/off
  ${CONFIG.PREFIX[0]}anticall on/off
  ${CONFIG.PREFIX[0]}welcome on/off
  ${CONFIG.PREFIX[0]}goodbye on/off

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💖 *Arslan Tech's* 💖
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

  try {
    if (await fs.pathExists(LOGO_PATH)) {
      try {
        await sock.sendMessage(selfJid, {
          image: fs.readFileSync(LOGO_PATH),
          caption: caption,
          mimetype: 'image/png',
        });
        logger.success(`🖼️  Welcome image sent → ${number}`);
        await sleep(1200);
      } catch (imgErr) {
        logger.warn(`Image send failed: ${imgErr.message}`);
        await sock.sendMessage(selfJid, { text: caption });
      }
    } else {
      logger.warn('⚠️  assets/logo.png missing — text only');
      await sock.sendMessage(selfJid, { text: caption });
    }
    logger.success(`📩 Welcome sent → ${number}`);
  } catch (err) {
    logger.error(`Welcome failed for ${number}`, err);
  }
}

/* ─── Delete session ──────────────────────────── */
async function deleteSession(number) {
  const p = path.join(SESSIONS_DIR, number);
  try {
    await fs.remove(p);
    logger.info(`🗑️  Session deleted: ${number}`);
  } catch (err) {
    logger.warn(`Delete failed for ${number}: ${err.message}`);
  }
}

/* ─── Start bot ───────────────────────────────── */
export async function startBotForUser(number, opts = {}) {
  const { isNew = false, autoReconnect = false } = opts;

  if (activeSessions.has(number)) {
    logger.warn(`Session ${number} already active`);
    return activeSessions.get(number);
  }
  if (activeSessions.size >= LIMITS.MAX_SESSIONS) {
    throw new Error(`Session limit (${LIMITS.MAX_SESSIONS}) reached`);
  }

  logger.info(`🔌 Starting: ${number} ${isNew ? '(new)' : '(reconnect)'}`);

  const sessionPath = await getSessionPath(number);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestWaWebVersion();

  const sock = makeWASocket({
    version,
    logger: baileysLogger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
    },
    browser: Browsers.ubuntu('Chrome'),
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    getMessage: async () => ({ conversation: '' }),
  });

  activeSessions.set(number, sock);
  sessionStatus.set(number, { status: 'connecting', since: Date.now() });

  sock.ev.on('creds.update', saveCreds);

  let pairingCodeRequested = false;
  let hasOpenedOnce = false;

  sock.ev.on('pair-device', () => {
    logger.info(`[Pairing] ✅ Server ready for ${number}`);
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    /* Pairing */
    if (qr && pendingPairings.has(number) && !sock.authState.creds.registered && !pairingCodeRequested) {
      pairingCodeRequested = true;
      const pending = pendingPairings.get(number);

      await sleep(2500);

      try {
        logger.info(`🔐 [Pairing] Requesting code for ${number}...`);
        const raw = await sock.requestPairingCode(number);

        logger.info(
          `[Pairing] 🔍 RAW: "${raw}" (type: ${typeof raw}, len: ${String(raw ?? '').length})`
        );

        const cleaned = String(raw || '').replace(/[^A-Za-z0-9]/g, '');
        if (!cleaned || cleaned.length < 6) {
          throw new Error(`Code too short (raw: "${raw}")`);
        }

        const code = formatPairingCode(raw);

        logger.success(`\n═══════════════════════════════════════`);
        logger.success(`  🔑 PAIRING CODE: ${code}`);
        logger.success(`  📱 Number: +${number}`);
        logger.success(`  ⏱️   Valid for ~60 seconds`);
        logger.success(`═══════════════════════════════════════\n`);

        pending.resolve(code);
      } catch (err) {
        logger.error(`[Pairing] ❌ Failed: ${err.message}`);
        pending.reject(new Error(`Pairing failed: ${err.message}`));
        pendingPairings.delete(number);
        try { sock.end(undefined); } catch {}
      }
    }

    /* Open */
    if (connection === 'open') {
      hasOpenedOnce = true;
      pairingCodeRequested = false;
      retryCount.set(number, 0);
      logger.success(`\n✅ [SESSION OPEN] ${number} connected!`);
      sessionStatus.set(number, { status: 'connected', since: Date.now() });

      if (isNew || !welcomedSessions.has(number)) {
        welcomedSessions.add(number);
        await sleep(2000);
        await sendWelcomeMessage(sock, number);
      }
    }

    /* Close */
    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reasonName = Object.keys(DisconnectReason).find(
        (k) => DisconnectReason[k] === statusCode
      ) || `code_${statusCode}`;

      logger.warn(`⚠️  [CLOSE] ${number} — ${reasonName} (${statusCode})`);

      activeSessions.delete(number);
      sessionStatus.delete(number);

      if (statusCode === 405) {
        logger.error(`🚫 [405] Not Allowed — aborting ${number}`);
        await deleteSession(number);
        const p = pendingPairings.get(number);
        if (p) { p.reject(new Error('405')); pendingPairings.delete(number); }
        return;
      }

      if (statusCode === DisconnectReason.loggedOut) {
        logger.warn(`🗑️  [401] Logged out: ${number}`);
        await deleteSession(number);
        welcomedSessions.delete(number);
        retryCount.delete(number);
        return;
      }

      if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
        logger.info(`🔄 [515] Restart — reconnecting ${number}...`);
        await sleep(2000);
        startBotForUser(number, { isNew: false, autoReconnect: true }).catch((err) =>
          logger.error(`Reconnect failed ${number}`, err)
        );
        return;
      }

      if (!hasOpenedOnce) {
        logger.error(`❌ [${statusCode}] Initial connect failed ${number}`);
        await deleteSession(number);
        const p = pendingPairings.get(number);
        if (p) { p.reject(new Error(reasonName)); pendingPairings.delete(number); }
        return;
      }

      if (autoReconnect) {
        const retries = (retryCount.get(number) || 0) + 1;
        retryCount.set(number, retries);

        if (retries > LIMITS.MAX_RETRIES) {
          logger.error(`💀 Max retries reached for ${number}`);
          return;
        }

        const delay = Math.min(3000 * Math.pow(2, retries - 1), 60_000);
        logger.info(`🔄 Reconnect #${retries} for ${number} in ${delay / 1000}s...`);
        await sleep(delay);
        startBotForUser(number, { isNew: false, autoReconnect: true }).catch((err) =>
          logger.error(`Reconnect #${retries} failed ${number}`, err)
        );
      }
    }
  });

  /* Messages */
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      try { await handleMessage(sock, msg, number); }
      catch (err) { logger.debug(`msg: ${err.message}`); }
    }
  });

  /* Calls */
  sock.ev.on('call', async (calls) => {
    try { await handleCall(sock, number, calls); }
    catch (err) { logger.debug(`call: ${err.message}`); }
  });

  /* Groups */
  sock.ev.on('group-participants.update', async (update) => {
    try { await handleGroupParticipants(sock, number, update); }
    catch (err) { logger.debug(`group: ${err.message}`); }
  });

  return sock;
}

/* ─── Request pairing ─────────────────────────── */
export async function requestPairingCode(number) {
  const clean = String(number).replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(clean)) throw new Error('Invalid number (10-15 digits)');
  if (activeSessions.has(clean)) throw new Error('Already paired');
  if (activeSessions.size >= LIMITS.MAX_SESSIONS) throw new Error(`Limit (${LIMITS.MAX_SESSIONS}) reached`);
  if (pendingPairings.has(clean)) throw new Error('Pairing in progress');

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingPairings.delete(clean);
      reject(new Error(`Timeout (${LIMITS.PAIRING_TIMEOUT_MS / 1000}s)`));
    }, LIMITS.PAIRING_TIMEOUT_MS);

    pendingPairings.set(clean, {
      resolve: (code) => { clearTimeout(timeout); pendingPairings.delete(clean); resolve(code); },
      reject: (err) => { clearTimeout(timeout); pendingPairings.delete(clean); reject(err); },
      createdAt: Date.now(),
    });

    startBotForUser(clean, { isNew: true }).catch((err) => {
      clearTimeout(timeout);
      pendingPairings.delete(clean);
      reject(err);
    });
  });
}

/* ─── Unpair ──────────────────────────────────── */
export async function unpairUser(number) {
  const clean = String(number).replace(/\D/g, '');
  const sock = activeSessions.get(clean);
  try {
    if (sock) {
      await sock.logout().catch(() => {});
      activeSessions.delete(clean);
      sessionStatus.delete(clean);
    }
    await deleteSession(clean);
    welcomedSessions.delete(clean);
    retryCount.delete(clean);
    logger.success(`✅ Unpaired: ${clean}`);
    return true;
  } catch (err) {
    logger.error(`Unpair failed ${clean}`, err);
    return false;
  }
}

/* ─── Session list ────────────────────────────── */
export function getSessionList() {
  const out = [];
  for (const [number, sock] of activeSessions.entries()) {
    const meta = sessionStatus.get(number) || { status: 'unknown', since: Date.now() };
    out.push({ number, name: sock.user?.name || '', status: meta.status, since: meta.since });
  }
  return out;
}

/* ─── Auto-load ───────────────────────────────── */
async function autoLoadSessions() {
  await fs.ensureDir(SESSIONS_DIR);
  const entries = await fs.readdir(SESSIONS_DIR).catch(() => []);
  let loaded = 0;

  for (const num of entries) {
    if (!/^\d{10,15}$/.test(num)) continue;
    const credsFile = path.join(SESSIONS_DIR, num, 'creds.json');
    if (!(await fs.pathExists(credsFile))) continue;

    try {
      await startBotForUser(num, { isNew: false, autoReconnect: true });
      loaded++;
      await sleep(800);
    } catch (err) {
      logger.error(`Auto-load ${num}`, err);
    }
  }
  return loaded;
}

/* ─── Memory guard ────────────────────────────── */
function startMemoryGuard() {
  setInterval(() => {
    if (global.gc) global.gc();
    const rss = process.memoryUsage().rss / 1024 / 1024;
    if (rss > LIMITS.MEMORY_WARN_MB) {
      logger.warn(`⚠️  High RAM: ${rss.toFixed(0)}MB`);
    }
  }, LIMITS.GC_INTERVAL_MS);
}

/* ─── Init ────────────────────────────────────── */
export async function init() {
  displayBanner();
  logger.info('🚀 Booting ASAD MD core...');
  await sleep(400);

  await fs.ensureDir(SESSIONS_DIR);
  logger.success('📁 Session storage ready');
  await sleep(200);

  startMemoryGuard();
  logger.success('🧹 Memory guard active');
  await sleep(200);

  // Plugins
  try {
    await loadPlugins();
    startCleanup();
    logger.success('🔌 Plugin system ready');
  } catch (e) {
    logger.warn(`Plugin system failed: ${e.message}`);
  }
  await sleep(200);

  // API server (Pxxl or local)
  try {
    const { startServer } = await import('./api/server.js');
    const { port } = await startServer();
    logger.success(`🌐 API on port ${port}`);
  } catch (e) {
    logger.warn(`⚠️  API failed: ${e.message}`);
    if (IS_PXXL) {
      logger.error('❌ Pxxl mode requires API — exiting');
      process.exit(1);
    }
  }
  await sleep(200);

  // Auto-load
  logger.info('🔄 Scanning saved sessions...');
  const loaded = await autoLoadSessions();
  if (loaded > 0) {
    logger.success(`✅ Auto-loaded ${loaded} session(s)`);
  } else {
    logger.info('⏳ No saved sessions — waiting for pairing.');
  }

  if (IS_PXXL) {
    logger.success('🌍 Pxxl deploy ready — use API to pair');
  } else {
    logger.info('💡 Bot ready. Use requestPairingCode(number) to pair.\n');
  }
}

/* ─── CLI entry ───────────────────────────────── */
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  process.on('uncaughtException', (err) => logger.error('💥 Uncaught:', err));
  process.on('unhandledRejection', (err) => logger.error('💥 Unhandled:', err));

  init().catch((err) => {
    logger.error('Fatal boot:', err);
    process.exit(1);
  });
}