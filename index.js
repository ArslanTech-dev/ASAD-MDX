/**
 * ═══════════════════════════════════════════════════════════════
 *  ASAD MD — Ultra Strong Pairing Engine (v1.2)
 *  Powered by ARSLAN TECH'S
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(__dirname, 'database', 'sessions');
const LOGO_PATH = path.join(__dirname, 'assets', 'logo.png');
const baileysLogger = pino({ level: 'silent' });

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
  const isTermux = process.env.PREFIX?.includes('com.termux') || os.hostname().includes('localhost');

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
    const padded = row.padEnd(70, ' ');
    console.log(`${line} ${color}${c.bold}${padded}${c.reset} ${line}`);
  });
  console.log(empty);
  console.log(`${line} ${c.yellow}${c.bold}              ⚡ Powered by ARSLAN TECH'S ⚡${c.reset}               ${line}`);
  console.log(`${line} ${c.dim}          Multi-Session WhatsApp Bot Engine${c.reset}                ${line}`);
  console.log(mid);

  console.log(`${line}  ${c.green}${c.bold}▸ SYSTEM INFO${c.reset}${' '.repeat(55)}${line}`);
  console.log(`${line}   ${c.dim}├─${c.reset} Engine     ${c.cyan}Baileys v7 (rc14)${c.reset}${' '.repeat(41)}${line}`);
  console.log(`${line}   ${c.dim}├─${c.reset} Node.js    ${c.cyan}${process.version}${c.reset}${' '.repeat(Math.max(0, 42 - process.version.length))}${line}`);
  console.log(`${line}   ${c.dim}├─${c.reset} Platform   ${c.cyan}${os.platform()} ${os.arch()}${c.reset}${' '.repeat(Math.max(0, 43 - (os.platform() + os.arch()).length))}${line}`);
  console.log(`${line}   ${c.dim}├─${c.reset} Termux     ${isTermux ? c.green + 'Yes ✓' : c.yellow + 'No ✗'}${c.reset}${' '.repeat(50)}${line}`);
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

/* ═══════════════════════════════════════════════════════════════
 * 🔑 PAIRING CODE FORMATTER — THE KEY FIX
 * WhatsApp codes are ALPHANUMERIC (e.g., "829A7KMP")
 * NOT just numbers — must keep letters!
 * ═══════════════════════════════════════════════════════════════ */
export function formatPairingCode(raw) {
  // Keep letters AND digits, uppercase, strip everything else
  const clean = String(raw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // WhatsApp codes are typically 8 chars
  if (clean.length === 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`;

  // If longer than 8 (rare), take first 8
  if (clean.length > 8) return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;

  // Return as-is if short (will fail validation later)
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

*💡 Try These Commands:*
  ${CONFIG.PREFIX[0]}ping    → Check bot alive
  ${CONFIG.PREFIX[0]}menu    → Full command list
  ${CONFIG.PREFIX[0]}alive   → Bot status

*Yeh bot aapke apne messages ka bhi reply karega* (self-chat).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💖 *Made with love by Arslan Tech's* 💖
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

/* ─── Inline message handler ──────────────────── */
async function inlineMessageHandler(sock, msg, sessionNumber) {
  const { key, message } = msg;
  if (!message) return;
  if (message.reactionMessage || message.protocolMessage || message.editedMessage) return;

  const from = key.remoteJid;
  const isFromMe = key.fromMe;
  const isSelfChat = from === `${sessionNumber}@s.whatsapp.net`;

  const text =
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    '';

  const prefix = CONFIG.PREFIX.find((p) => text.startsWith(p));
  const cmd = prefix ? text.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase() : null;

  const reply = (txt) => sock.sendMessage(from, { text: txt }, { quoted: msg });

  if (isFromMe && isSelfChat) {
    if (!cmd) {
      return reply(`👋 *${CONFIG.BOT_NAME} here!*\nType *${CONFIG.PREFIX[0]}menu* for commands.`);
    }
    if (cmd === 'ping') return reply('🏓 *Pong!* Bot is alive.');
    if (cmd === 'alive') {
      const up = process.uptime();
      return reply(
        `✅ *${CONFIG.BOT_NAME} is ALIVE*\n\n` +
        `⏱️  Uptime: ${Math.floor(up / 60)}m ${Math.floor(up % 60)}s\n` +
        `💾 RAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(0)}MB\n` +
        `🔗 Sessions: ${activeSessions.size}/${LIMITS.MAX_SESSIONS}`
      );
    }
    if (cmd === 'menu') {
      return reply(
        `📋 *${CONFIG.BOT_NAME} — Commands*\n\n` +
        `*Public:*\n  ${CONFIG.PREFIX[0]}ping\n  ${CONFIG.PREFIX[0]}alive\n  ${CONFIG.PREFIX[0]}menu\n\n` +
        `_More coming soon..._`
      );
    }
    return reply(`❓ Unknown: *${cmd}*\nType *${CONFIG.PREFIX[0]}menu*.`);
  }

  if (!isFromMe) {
    if (cmd === 'ping') return reply('🏓 Pong!');
    if (cmd === 'alive') return reply(`✅ ${CONFIG.BOT_NAME} is alive.`);
    if (cmd === 'menu' || cmd === 'help') {
      return reply(`📋 Type *${CONFIG.PREFIX[0]}ping* to test.`);
    }
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

/* ─── Start bot for user ──────────────────────── */
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

  /* ─── pair-device event (rc14) ─── */
  sock.ev.on('pair-device', () => {
    logger.info(`[Pairing] ✅ Server ready for ${number}`);
  });

  /* ─── Connection updates ─── */
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    /* ─── PAIRING — single attempt with debug logging ─── */
    if (qr && pendingPairings.has(number) && !sock.authState.creds.registered && !pairingCodeRequested) {
      pairingCodeRequested = true;
      const pending = pendingPairings.get(number);

      await sleep(2500);

      try {
        logger.info(`🔐 [Pairing] Requesting code for ${number}...`);
        const raw = await sock.requestPairingCode(number);

        // 🔍 Debug log — shows exactly what server sent
        logger.info(
          `[Pairing] 🔍 RAW from server: "${raw}" ` +
          `(type: ${typeof raw}, len: ${String(raw ?? '').length})`
        );

        // Validation — must be at least 6 alphanumeric chars
        const cleaned = String(raw || '').replace(/[^A-Za-z0-9]/g, '');
        if (!cleaned || cleaned.length < 6) {
          throw new Error(
            `Code too short (raw: "${raw}", cleaned: "${cleaned}", len: ${cleaned.length})`
          );
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

    /* ─── Connection opened ─── */
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

    /* ─── Connection closed ─── */
    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reasonName = Object.keys(DisconnectReason).find(
        (k) => DisconnectReason[k] === statusCode
      ) || `code_${statusCode}`;

      logger.warn(`⚠️  [CLOSE] ${number} — ${reasonName} (${statusCode})`);

      activeSessions.delete(number);
      sessionStatus.delete(number);

      // 405
      if (statusCode === 405) {
        logger.error(`🚫 [405] Not Allowed — aborting ${number}`);
        await deleteSession(number);
        const p = pendingPairings.get(number);
        if (p) { p.reject(new Error('405')); pendingPairings.delete(number); }
        return;
      }

      // 401
      if (statusCode === DisconnectReason.loggedOut) {
        logger.warn(`🗑️  [401] Logged out: ${number}`);
        await deleteSession(number);
        welcomedSessions.delete(number);
        retryCount.delete(number);
        return;
      }

      // 515 / restartRequired
      if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
        logger.info(`🔄 [515] Restart — reconnecting ${number}...`);
        await sleep(2000);
        startBotForUser(number, { isNew: false, autoReconnect: true }).catch((err) =>
          logger.error(`Reconnect failed ${number}`, err)
        );
        return;
      }

      // First-time failed
      if (!hasOpenedOnce) {
        logger.error(`❌ [${statusCode}] Initial connect failed ${number}`);
        await deleteSession(number);
        const p = pendingPairings.get(number);
        if (p) { p.reject(new Error(reasonName)); pendingPairings.delete(number); }
        return;
      }

      // Backoff reconnect
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

  /* ─── Messages ─── */
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message) continue;
      try {
        await inlineMessageHandler(sock, msg, number);
      } catch (err) {
        logger.debug(`Msg handler: ${err.message}`);
      }
    }
  });

  return sock;
}

/* ─── Public: request pairing ─────────────────── */
export async function requestPairingCode(number) {
  const clean = String(number).replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(clean)) {
    throw new Error('Invalid number (10-15 digits)');
  }
  if (activeSessions.has(clean)) {
    throw new Error('Already paired');
  }
  if (activeSessions.size >= LIMITS.MAX_SESSIONS) {
    throw new Error(`Limit (${LIMITS.MAX_SESSIONS}) reached`);
  }
  if (pendingPairings.has(clean)) {
    throw new Error('Pairing in progress');
  }

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

/* ─── Public: unpair ──────────────────────────── */
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

/* ─── Public: list ────────────────────────────── */
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

  logger.info('🔄 Scanning saved sessions...');
  const loaded = await autoLoadSessions();
  if (loaded > 0) {
    logger.success(`✅ Auto-loaded ${loaded} session(s)`);
  } else {
    logger.info('⏳ No saved sessions — waiting for pairing.');
  }

  logger.info('💡 Bot ready. Use requestPairingCode(number) to pair.\n');
}

/* ─── CLI entry ───────────────────────────────── */
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  process.on('uncaughtException', (err) => logger.error('💥 Uncaught:', err));
  process.on('unhandledRejection', (err) => logger.error('💥 Unhandled:', err));

  init().catch((err) => {
    logger.error('Fatal boot:', err);
    process.exit(1);
  });
}
