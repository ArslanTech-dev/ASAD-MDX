/**
 * ═══════════════════════════════════════════════════════════════
 *  🧪 ASAD MD — Pairing Test Script
 *  Compatible with index.js (rc14)
 *  Run: node test-pair.js
 * ═══════════════════════════════════════════════════════════════
 */

import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import {
  init,
  requestPairingCode,
  activeSessions,
  getSessionList,
  unpairUser,
} from './index.js';

const rl = readline.createInterface({ input, output });

const COLORS = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[95m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};

function box(title, lines) {
  const c = COLORS;
  const width = 51;
  const top = `╔${'═'.repeat(width)}╗`;
  const mid = `╠${'═'.repeat(width)}╣`;
  const bot = `╚${'═'.repeat(width)}╝`;
  const v = '║';

  console.log(`${c.cyan}${top}${c.reset}`);
  console.log(`${c.cyan}${v}${c.reset} ${c.bold}${c.yellow}${title.padEnd(width - 1)}${c.reset}${c.cyan}${v}${c.reset}`);
  console.log(`${c.cyan}${mid}${c.reset}`);
  for (const line of lines) {
    // strip ANSI for length calc
    const visible = line.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = width - 2 - visible.length;
    console.log(`${c.cyan}${v}${c.reset} ${line}${' '.repeat(Math.max(0, pad))} ${c.cyan}${v}${c.reset}`);
  }
  console.log(`${c.cyan}${bot}${c.reset}`);
}

function showPairingCode(code, number) {
  console.log('');
  box('🔑 PAIRING CODE GENERATED', [
    `${COLORS.green}${COLORS.bold}    ▸ ${code}${COLORS.reset}`,
    '',
    `${COLORS.dim}   Number:${COLORS.reset} +${number}`,
    `${COLORS.dim}   Valid:${COLORS.reset}  ~60 seconds`,
  ]);
  console.log('');
  console.log(`${COLORS.yellow}${COLORS.bold}📱 Ab WhatsApp me ye karo:${COLORS.reset}`);
  console.log(`   ${COLORS.dim}1.${COLORS.reset} WhatsApp kholo (us number pe)`);
  console.log(`   ${COLORS.dim}2.${COLORS.reset} Settings → Linked Devices`);
  console.log(`   ${COLORS.dim}3.${COLORS.reset} "Link with phone number"`);
  console.log(`   ${COLORS.dim}4.${COLORS.reset} Enter code: ${COLORS.green}${COLORS.bold}${code}${COLORS.reset}`);
  console.log('');
  console.log(`${COLORS.dim}⏳ Waiting for connection... (Ctrl+C to cancel)${COLORS.reset}`);
  console.log('');
}

function showConnected(number, sessionList) {
  console.log('');
  box('✅ SESSION CONNECTED', [
    `${COLORS.green}${COLORS.bold}   +${number} is now online!${COLORS.reset}`,
    '',
    `${COLORS.dim}   Welcome message + logo sent to self-chat.${COLORS.reset}`,
  ]);
  console.log('');
  console.log(`${COLORS.cyan}${COLORS.bold}🎯 Ab ye try karo (self-chat me):${COLORS.reset}`);
  console.log(`   ${COLORS.dim}▸${COLORS.reset} ${COLORS.green}.ping${COLORS.reset}     → Pong test`);
  console.log(`   ${COLORS.dim}▸${COLORS.reset} ${COLORS.green}.alive${COLORS.reset}    → Bot status`);
  console.log(`   ${COLORS.dim}▸${COLORS.reset} ${COLORS.green}.menu${COLORS.reset}     → Command list`);
  console.log('');
  console.log(`${COLORS.cyan}${COLORS.bold}📋 Active sessions:${COLORS.reset} ${sessionList.length}`);
  for (const s of sessionList) {
    console.log(`   ${COLORS.dim}•${COLORS.reset} +${s.number}  ${COLORS.green}[${s.status}]${COLORS.reset}  ${s.name || ''}`);
  }
  console.log('');
}

async function waitForConnection(number, timeoutMs = 90_000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (activeSessions.has(number)) {
        // Session exists in map — now check if status is 'connected'
        // We'll poll getSessionList for status
        const list = getSessionList();
        const found = list.find((s) => s.number === number);
        if (found && found.status === 'connected') {
          clearInterval(interval);
          resolve({ success: true, sessionList: list });
          return;
        }
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve({ success: false, sessionList: getSessionList() });
      }
    }, 1000);
  });
}

async function main() {
  // 1. Boot bot
  await init();

  console.log('');
  console.log(`${COLORS.cyan}${'═'.repeat(53)}${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.yellow}  🧪 ASAD MD — PAIRING TEST${COLORS.reset}`);
  console.log(`${COLORS.cyan}${'═'.repeat(53)}${COLORS.reset}`);
  console.log('');

  // 2. Show active sessions if any
  const existing = getSessionList();
  if (existing.length > 0) {
    console.log(`${COLORS.cyan}📋 Active sessions:${COLORS.reset}`);
    for (const s of existing) {
      console.log(`   ${COLORS.dim}•${COLORS.reset} +${s.number}  ${COLORS.green}[${s.status}]${COLORS.reset}`);
    }
    console.log('');
  }

  // 3. Ask for number
  const raw = await rl.question(`${COLORS.cyan}📱 Enter WhatsApp number${COLORS.reset} (country code, no +): `);
  const number = raw.replace(/\D/g, '');

  if (!/^\d{10,15}$/.test(number)) {
    console.log(`\n${COLORS.red}❌ Invalid number. Example: 923001234567${COLORS.reset}\n`);
    rl.close();
    process.exit(1);
  }

  if (activeSessions.has(number)) {
    console.log(`\n${COLORS.yellow}⚠️  Ye number already active hai — unpair karo pehle.${COLORS.reset}`);
    const ans = await rl.question(`${COLORS.cyan}Unpair karna hai? (y/n): ${COLORS.reset}`);
    if (ans.trim().toLowerCase() === 'y') {
      await unpairUser(number);
      console.log(`${COLORS.green}✅ Unpaired. Ab pairing request bhejo.${COLORS.reset}\n`);
    } else {
      rl.close();
      process.exit(0);
    }
  }

  console.log(`\n${COLORS.dim}⏳ Requesting pairing code for +${number}...${COLORS.reset}\n`);

  try {
    // 4. Request code
    const code = await requestPairingCode(number);

    if (!code) {
      throw new Error('No code returned');
    }

    // 5. Show code
    showPairingCode(code, number);

    // 6. Wait for connection
    const result = await waitForConnection(number, 90_000);

    if (result.success) {
      showConnected(number, result.sessionList);

      // 7. Keep alive — user commands test kare
      console.log(`${COLORS.dim}Bot running in background. Self-chat me commands test karo.${COLORS.reset}`);
      console.log(`${COLORS.dim}Ctrl+C karke exit karo.${COLORS.reset}\n`);

      // Auto-exit after 5 minutes if user doesn't act
      setTimeout(() => {
        console.log(`\n${COLORS.dim}⏱️  5 min passed — auto-exit.${COLORS.reset}`);
        process.exit(0);
      }, 5 * 60 * 1000);
    } else {
      console.log(`\n${COLORS.red}❌ Connection timeout (90s)${COLORS.reset}`);
      console.log(`${COLORS.yellow}💡 Tips:${COLORS.reset}`);
      console.log(`   ${COLORS.dim}•${COLORS.reset} Code 60 sec me enter karo`);
      console.log(`   ${COLORS.dim}•${COLORS.reset} WhatsApp me "Linked Devices" check karo`);
      console.log(`   ${COLORS.dim}•${COLORS.reset} Number WhatsApp registered hona chahiye`);
      console.log(`   ${COLORS.dim}•${COLORS.reset} Fresh try ke liye: ${COLORS.green}node test-pair.js${COLORS.reset}\n`);
      process.exit(1);
    }
  } catch (err) {
    console.log(`\n${COLORS.red}❌ Pairing failed:${COLORS.reset} ${err.message}\n`);
    console.log(`${COLORS.yellow}💡 Possible reasons:${COLORS.reset}`);
    console.log(`   ${COLORS.dim}•${COLORS.reset} Baileys version purana (rc14 chahiye)`);
    console.log(`   ${COLORS.dim}•${COLORS.reset} Number invalid ya already registered`);
    console.log(`   ${COLORS.dim}•${COLORS.reset} WhatsApp server issue (retry after 1 min)`);
    console.log(`   ${COLORS.dim}•${COLORS.reset} Node 26 compatibility (try Node 22 LTS)\n`);
    rl.close();
    process.exit(1);
  }
}

// ─── Graceful shutdown ──────────────────────
process.on('SIGINT', () => {
  console.log(`\n\n${COLORS.yellow}👋 Exiting...${COLORS.reset}`);
  console.log(`${COLORS.dim}Sessions saved to database/sessions/${COLORS.reset}\n`);
  rl.close();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.log(`\n${COLORS.red}💥 Uncaught:${COLORS.reset} ${err.message}\n`);
});

process.on('unhandledRejection', (err) => {
  console.log(`\n${COLORS.red}💥 Unhandled:${COLORS.reset} ${err?.message || err}\n`);
});

// ─── Run ────────────────────────────────────
main().catch((err) => {
  console.log(`\n${COLORS.red}💥 Fatal:${COLORS.reset} ${err.message}\n`);
  process.exit(1);
});
