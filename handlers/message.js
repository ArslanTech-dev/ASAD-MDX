import { CONFIG } from '../config.js';
import { getPlugin } from '../core/pluginLoader.js';
import { cacheMessage, handleRevoke } from '../features/antidelete/antidelete.js';
import { getConfig } from '../features/anticall/anticall.js';
import logger from '../utils/logger.js';

export async function handleMessage(sock, msg, sessionNumber) {
  const { key, message } = msg;
  if (!message) return;
  if (message.reactionMessage || message.editedMessage) return;

  // 🚨 Revoke detection (antidelete)
  if (message.protocolMessage?.type === 0) {
    const cfg = await getConfig(sessionNumber);
    if (cfg.antidelete) {
      await handleRevoke(sock, sessionNumber, message.protocolMessage.key).catch(() => {});
    }
    return;
  }

  // Cache for antidelete
  await cacheMessage(sessionNumber, msg).catch(() => {});

  const from = key.remoteJid;
  const isFromMe = key.fromMe;
  const isSelfChat = from === `${sessionNumber}@s.whatsapp.net`;
  const isGroup = from.endsWith('@g.us');

  const text = message.conversation
    || message.extendedTextMessage?.text
    || message.imageMessage?.caption
    || message.videoMessage?.caption
    || '';

  const isOwner = isFromMe && isSelfChat;
  const sender = isGroup ? key.participant : key.remoteJid;
  const prefix = CONFIG.PREFIX.find((p) => text.startsWith(p));

  const reply = (t) => sock.sendMessage(from, { text: t }, { quoted: msg });

  // No command
  if (!prefix) {
    if (isSelfChat && isFromMe && text.trim()) {
      return reply(`👋 *${CONFIG.BOT_NAME}* here!\n\nType *${CONFIG.PREFIX[0]}menu* to see commands.`);
    }
    return;
  }

  const body = text.slice(prefix.length).trim();
  const [cmd, ...args] = body.split(/\s+/);
  if (!cmd) return;

  const plugin = getPlugin(cmd);
  if (!plugin) {
    if (isSelfChat || isOwner) return reply(`❓ Unknown: *${cmd}*\nTry *${CONFIG.PREFIX[0]}menu*`);
    return;
  }

  if (plugin.ownerOnly && !isOwner) return reply('🔒 Owner command — use self-chat');
  if (plugin.groupOnly && !isGroup) return reply('👥 Group only command');

  const ctx = {
    sock, msg, from, isGroup, isOwner, isSelfChat, sender,
    sessionNumber, ownerJid: `${sessionNumber}@s.whatsapp.net`,
    args, text, prefix, reply,
  };

  try {
    await plugin.execute(ctx);
  } catch (e) {
    logger.error(`Plugin ${cmd}:`, e);
    ctx.reply(`❌ Error: ${e.message}`);
  }
}