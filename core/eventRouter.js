import logger from '../utils/logger.js';

export function attachHandlers(sock, sessionNumber, handlers = {}) {
  const { onMessage, onCall, onGroupUpdate } = handlers;

  if (onMessage) {
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        try { await onMessage(sock, msg, sessionNumber); }
        catch (e) { logger.debug(`msg[${sessionNumber}]: ${e.message}`); }
      }
    });
  }

  if (onCall) {
    sock.ev.on('call', async (calls) => {
      try { await onCall(sock, sessionNumber, calls); }
      catch (e) { logger.debug(`call[${sessionNumber}]: ${e.message}`); }
    });
  }

  if (onGroupUpdate) {
    sock.ev.on('group-participants.update', async (update) => {
      try { await onGroupUpdate(sock, sessionNumber, update); }
      catch (e) { logger.debug(`group[${sessionNumber}]: ${e.message}`); }
    });
  }
}
