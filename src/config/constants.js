/**
 * Application Constants
 * Centralized configuration for the Arc Raiders Countdown Bot
 */

const CONFIG = {
  // Discord Configuration
  DISCORD: {
    PERMISSIONS: 234881024,
    INTENTS: ['Guilds', 'GuildMessages'],
    BOT_CLIENT_ID: '1413486967525478462',
    INVITE_URL: 'https://discord.com/api/oauth2/authorize?client_id=1413486967525478462&permissions=234881024&scope=bot'
  },

  // Reddit API Configuration
  REDDIT: {
    API_BASE: 'https://oauth.reddit.com',
    TOKEN_ENDPOINT: 'https://www.reddit.com/api/v1/access_token',
    SUBREDDIT: 'arcraiders',
    USER_AGENT: 'ArcRaidersCountdownBot/1.0.0',
    RATE_LIMIT: 60, // requests per minute
    TIMEOUT: 10000, // 10 seconds
    TOKEN_CACHE_DURATION: 45 * 60 * 1000, // 45 minutes
    RETRY_ATTEMPTS: 3,
    RETRY_DELAYS: [1000, 2000, 4000] // exponential backoff
  },

  // Game Configuration
  GAME: {
    STEAM_APP_ID: '2389730',
    STEAM_THUMBNAIL_URL: 'https://cdn.akamai.steamstatic.com/steam/apps/2389730/header.jpg',
    DEFAULT_RELEASE_DATE: '2025-10-30T00:00:00Z',
    STUDIO: 'Embark Studios'
  },

  // Health Check Configuration
  HEALTH: {
    DEFAULT_PORT: 3000,
    ENDPOINT: '/health'
  },

  // File Configuration
  FILES: {
    CONFIG_FILE: 'server-config.json',
    SOCIAL_MESSAGE_FILE: 'next-message.txt',
    MONITOR_FILE: 'monitor-data.json',
    BACKUP_PREFIX: 'server-config-backup-',
    MAX_BACKUPS: 5
  },

  // Emoji Configuration
  EMOJI: {
    MAX_TITLE_EMOJIS: 4,
    MAX_SELECTION_ATTEMPTS: 100,
    TITLE_CHAR_LIMIT: 256
  },

  // Cron Configuration
  CRON: {
    DEFAULT_TIME: '12:00',
    TIMEZONE: 'UTC'
  },

  // Error Configuration
  ERROR: {
    MAX_RETRIES: 3,
    DEFAULT_RETRY_DELAY: 1000
  }
};

// Emoji Phase Configuration
const EMOJI_PHASES = {
  early: {
    name: 'Early Days',
    daysRange: [55, Infinity],
    emojiCount: 1,
    mood: 'depressed',
    description: 'Depressed/Melancholy'
  },
  mid: {
    name: 'Mid Countdown',
    daysRange: [30, 54],
    emojiCount: 2,
    mood: 'hopeful',
    description: 'Hopeful/Excited'
  },
  final_month: {
    name: 'Final Month',
    daysRange: [15, 29],
    emojiCount: 3,
    mood: 'hype_building',
    description: 'Hype Building'
  },
  final_week: {
    name: 'Final Week',
    daysRange: [7, 14],
    emojiCount: 4,
    mood: 'maximum_hype',
    description: 'Maximum Hype'
  },
  final_days: {
    name: 'Final Days',
    daysRange: [1, 6],
    emojiCount: 4,
    mood: 'insane_hype',
    description: 'Insane Hype'
  }
};

// Discord Permission Flags
const PERMISSIONS = {
  SEND_MESSAGES: 0x800, // 2048
  EMBED_LINKS: 0x4000, // 16384
  ATTACH_FILES: 0x8000, // 32768
  MENTION_EVERYONE: 0x2000000, // 33554432
  USE_EXTERNAL_EMOJIS: 0x4000000, // 67108864
  ADD_REACTIONS: 0x40, // 64
  USE_SLASH_COMMANDS: 0x8000000 // 134217728
};

module.exports = {
  CONFIG,
  EMOJI_PHASES,
  PERMISSIONS
};
