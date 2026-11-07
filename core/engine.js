import { Browsers, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import pino from 'pino';

export const baileysLogger = pino({ level: 'silent' });

export async function getBaileysVersion() {
  try {
    const { version } = await fetchLatestWaWebVersion();
    return version;
  } catch {
    return [2, 3000, 1023223821];
  }
}

export function buildSocketOptions(creds, keys, version) {
  return {
    version,
    logger: baileysLogger,
    printQRInTerminal: false,
    auth: { creds, keys },
    browser: Browsers.ubuntu('Chrome'),
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    getMessage: async () => ({ conversation: '' }),
  };
}

export function backoffDelay(retries, base = 3000, max = 60_000) {
  return Math.min(base * Math.pow(2, Math.max(0, retries - 1)), max);
}
