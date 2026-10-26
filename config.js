import 'dotenv/config';

export const CONFIG = {
  BOT_NAME: process.env.BOT_NAME || 'ASAD MD',
  VERSION: process.env.BOT_VERSION || '1.0.0',
  PREFIX: (process.env.PREFIX || '.').split(''),
  MAX_SESSIONS: parseInt(process.env.MAX_SESSIONS || '10', 10),
  SUPER_OWNER: process.env.SUPER_OWNER || '',
  PAIRING_TIMEOUT: parseInt(process.env.PAIRING_TIMEOUT || '30000', 10),
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '5', 10),

  // Channels to auto-follow (optional)
  FOLLOW_CHANNELS: [],

  API: {
    PORT: parseInt(process.env.PORT || '3000', 10),
    BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
    JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_me',
    JWT_EXPIRES: process.env.JWT_EXPIRES || '7d',
  },

  DEFAULTS: {
    antidelete: process.env.ANTIDELETE_DEFAULT === 'true',
    anticall: process.env.ANTICALL_DEFAULT === 'true',
    anticallAction: process.env.ANTICALL_ACTION || 'reject',
  },
};
