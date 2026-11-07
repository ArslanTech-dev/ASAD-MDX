import { getConfig } from '../features/anticall/anticall.js';
import logger from '../utils/logger.js';

const WELCOME_MSG = (name, group, count) => `
╔══════════════════════════════════════╗
║      🌟 *WELCOME* 🌟                 ║
╚══════════════════════════════════════╝

🎉 *Assalam-o-Alaikum ${name}!*

Aapko is group me shamil hone pe
dil se khush aamdeed 👏

╭─────────────────────────────────────╮
│  📌 *Group:* ${group}
│  👥 *Members:* ${count}
│  ⏰ *Joined:* ${new Date().toLocaleString()}
╰─────────────────────────────────────╯

📖 *Rules reminder:*
  ▸ Respect everyone
  ▸ No spam
  ▸ Stay on topic

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💖 _Powered by ASAD MD · Arslan Tech's_
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

const GOODBYE_MSG = (name, group) => `
╔══════════════════════════════════════╗
║      👋 *GOODBYE* 👋                 ║
╚══════════════════════════════════════╝

😢 *${name}* ne group chhod diya.

╭─────────────────────────────────────╮
│  📌 *Group:* ${group}
│  ⏰ *Left:* ${new Date().toLocaleString()}
╰─────────────────────────────────────╯

💭 _Allah Hafiz — hope to see you again!_

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💖 _ASAD MD · Arslan Tech's_
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

export async function handleGroupParticipants(sock, sessionNumber, update) {
  const { id, participants, action } = update;
  const cfg = await getConfig(sessionNumber);

  let meta;
  try { meta = await sock.groupMetadata(id); } catch { return; }
  const groupName = meta.subject || id.split('@')[0];

  for (const p of participants) {
    const jid = typeof p === 'string' ? p : p.id;
    const name = jid.split('@')[0];
    try {
      if (action === 'add' && cfg.welcome !== false) {
        await sock.sendMessage(id, { text: WELCOME_MSG(name, groupName, meta.participants.length) });
      } else if (action === 'remove' && cfg.goodbye !== false) {
        await sock.sendMessage(id, { text: GOODBYE_MSG(name, groupName) });
      } else if (action === 'promote') {
        await sock.sendMessage(id, { text: `⬆️ *${name}* is now admin! 🎖️` });
      } else if (action === 'demote') {
        await sock.sendMessage(id, { text: `⬇️ *${name}* is no longer admin.` });
      }
    } catch (e) { logger.warn(`Group event: ${e.message}`); }
  }
}