/**
 * ASAD MD — General Commands Bundle
 * 9 commands: ping, ping2, alive, uptime, info, owner, hello, arslan, help
 */

import { CONFIG } from '../../config.js';

/* ─── Helpers ─── */
const fmtUptime = () => {
  const up = process.uptime();
  const d = Math.floor(up / 86400);
  const h = Math.floor((up % 86400) / 3600);
  const m = Math.floor((up % 3600) / 60);
  const s = Math.floor(up % 60);
  const p = [];
  if (d) p.push(`${d}d`);
  if (h) p.push(`${h}h`);
  if (m) p.push(`${m}m`);
  p.push(`${s}s`);
  return p.join(' ');
};

const ram = () => (process.memoryUsage().rss / 1024 / 1024).toFixed(0);

/* ═══════════════════════════════════════════════
 *  Command bundle (array of plugins)
 * ═══════════════════════════════════════════════ */
export default [
  /* 1. PING */
  {
    command: 'ping',
    category: 'general',
    execute: async ({ reply }) => {
      const t = Date.now();
      await reply(`🏓 *Pong!*\n⚡ Response: *${Date.now() - t}ms*`);
    },
  },

  /* 2. PING2 — with reaction */
  {
    command: 'ping2',
    category: 'general',
    execute: async ({ sock, from, msg }) => {
      const t = Date.now();
      try {
        await sock.sendMessage(from, { react: { text: '🏓', key: msg.key } });
      } catch {}
      await sock.sendMessage(
        from,
        { text: `⚡ *Ping2:* ${Date.now() - t}ms\n💚 Bot is healthy` },
        { quoted: msg }
      );
    },
  },

  /* 3. ALIVE */
  {
    command: 'alive',
    category: 'general',
    execute: async ({ reply, sessionNumber }) => {
      await reply(
        `╔══════════════════════════════╗\n` +
        `║    ✅ *${CONFIG.BOT_NAME} ALIVE*    ║\n` +
        `╚══════════════════════════════╝\n\n` +
        `⏱️ *Uptime:* ${fmtUptime()}\n` +
        `💾 *RAM:* ${ram()}MB\n` +
        `📱 *Session:* +${sessionNumber}\n` +
        `💻 *Node:* ${process.version}\n` +
        `⚡ *Powered by:* ARSLAN TECH'S`
      );
    },
  },

  /* 4. UPTIME */
  {
    command: 'uptime',
    category: 'general',
    execute: async ({ reply }) => {
      const boot = new Date(Date.now() - process.uptime() * 1000);
      await reply(
        `⏱️ *BOT UPTIME*\n\n` +
        `▸ *Running:* ${fmtUptime()}\n` +
        `▸ *Booted:* ${boot.toLocaleString()}\n` +
        `▸ *Now:* ${new Date().toLocaleString()}\n` +
        `▸ *PID:* ${process.pid}`
      );
    },
  },

  /* 5. INFO */
  {
    command: 'info',
    category: 'general',
    execute: async ({ reply, sessionNumber }) => {
      await reply(
        `ℹ️ *BOT INFORMATION*\n\n` +
        `▸ *Name:* ${CONFIG.BOT_NAME}\n` +
        `▸ *Version:* v${CONFIG.VERSION}\n` +
        `▸ *Engine:* Baileys v7 (rc14)\n` +
        `▸ *Node:* ${process.version}\n` +
        `▸ *Platform:* ${process.platform} ${process.arch}\n` +
        `▸ *Session:* +${sessionNumber}\n` +
        `▸ *Prefix:* ${CONFIG.PREFIX.join(' ')}\n` +
        `▸ *Powered by:* ARSLAN TECH'S ⚡`
      );
    },
  },

  /* 6. OWNER */
  {
    command: 'owner',
    aliases: ['creator', 'dev', 'contact'],
    category: 'general',
    execute: async ({ sock, from, reply, msg, sessionNumber }) => {
      const ownerNum = String(CONFIG.SUPER_OWNER || sessionNumber).replace(/\D/g, '');
      if (!ownerNum || ownerNum.includes('xxxxx') || ownerNum.length < 10) {
        return reply('⚠️ Owner number set nahi hai.\n.env me *SUPER_OWNER* add karo.');
      }
      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:Arslan Tech's
ORG:ASAD MD
TEL;type=CELL;type=VOICE;waid=${ownerNum}:+${ownerNum}
END:VCARD`;

      await sock.sendMessage(
        from,
        {
          contacts: {
            displayName: "Arslan Tech's",
            contacts: [{ vcard }],
          },
        },
        { quoted: msg }
      );
    },
  },

  /* 7. HELLO */
  {
    command: 'hello',
    aliases: ['hi', 'hey', 'salam'],
    category: 'general',
    execute: async ({ reply, msg }) => {
      const name = msg.pushName || 'there';
      await reply(
        `👋 *Hello ${name}!*\n\n` +
        `Kaise ho bhai? Main *${CONFIG.BOT_NAME}* hoon.\n` +
        `Type *${CONFIG.PREFIX[0]}menu* to see all commands.`
      );
    },
  },

  /* 8. ARSLAN */
  {
    command: 'arslan',
    aliases: ['arslanmd', 'tech'],
    category: 'general',
    execute: async ({ reply }) => {
      await reply(
        `╔════════════════════════════════════╗\n` +
        `║     ⚡ *ARSLAN TECH'S* ⚡          ║\n` +
        `╚════════════════════════════════════╝\n\n` +
        `💻 *Developer:* Arslan\n` +
        `🚀 *Project:* ASAD MD\n` +
        `🔧 *Stack:* Node.js + Baileys v7\n` +
        `📦 *Deploy:* Pxxl Cloud\n` +
        `🌐 *Bot:* ${CONFIG.BOT_NAME}\n\n` +
        `💖 *Made with love by Arslan Tech's*`
      );
    },
  },

  /* 9. HELP */
  {
    command: 'help',
    aliases: ['h', 'support'],
    category: 'general',
    execute: async ({ reply }) => {
      await reply(
        `🆘 *HELP CENTER*\n\n` +
        `*▸ General:*\n` +
        `  ${CONFIG.PREFIX[0]}menu — full list\n` +
        `  ${CONFIG.PREFIX[0]}ping — test response\n` +
        `  ${CONFIG.PREFIX[0]}ping2 — with reaction\n` +
        `  ${CONFIG.PREFIX[0]}alive — bot status\n` +
        `  ${CONFIG.PREFIX[0]}uptime — running time\n` +
        `  ${CONFIG.PREFIX[0]}info — bot info\n\n` +
        `*▸ Contact:*\n` +
        `  ${CONFIG.PREFIX[0]}owner — contact card\n` +
        `  ${CONFIG.PREFIX[0]}arslan — developer info\n` +
        `  ${CONFIG.PREFIX[0]}hello — greeting\n\n` +
        `💡 *Tip:* Commands self-chat me bhi kaam karte hain.`
      );
    },
  },
];