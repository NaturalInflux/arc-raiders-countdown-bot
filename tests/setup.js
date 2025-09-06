/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DISCORD_TOKEN = 'test-token';
process.env.REDDIT_CLIENT_ID = 'test-client-id';
process.env.REDDIT_CLIENT_SECRET = 'test-client-secret';
process.env.REDDIT_USER_AGENT = 'test-user-agent';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console output during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Create mock Discord interaction
  createMockInteraction: (overrides = {}) => ({
    isChatInputCommand: () => true,
    guildId: '123456789',
    user: { id: '987654321', username: 'testuser' },
    reply: jest.fn(),
    followUp: jest.fn(),
    deferReply: jest.fn(),
    ...overrides
  }),
  
  // Create mock Discord client
  createMockClient: (overrides = {}) => ({
    user: { id: 'bot-user-id', username: 'test-bot' },
    guilds: {
      cache: new Map([
        ['123456789', { id: '123456789', name: 'Test Guild' }]
      ])
    },
    channels: {
      cache: new Map([
        ['111111111', { id: '111111111', name: 'general', type: 0 }]
      ])
    },
    ...overrides
  }),
  
  // Create mock services
  createMockServices: (overrides = {}) => ({
    configService: {
      getServerConfig: jest.fn(),
      updateServerConfig: jest.fn(),
      removeServerConfig: jest.fn(),
      saveConfigs: jest.fn()
    },
    messageService: {
      postCountdownMessage: jest.fn(),
      postTestCountdownMessage: jest.fn()
    },
    emojiService: {
      getEmojiForDays: jest.fn(),
      getEmojiPhase: jest.fn()
    },
    redditService: {
      getTopPosts: jest.fn(),
      isAuthenticated: jest.fn()
    },
    healthService: {
      start: jest.fn(),
      stop: jest.fn(),
      getStatus: jest.fn()
    },
    ...overrides
  }),
  
  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create test date
  createTestDate: (daysFromNow = 30) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  }
};

// Suppress specific warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('DeprecationWarning') || 
     args[0].includes('Supplying "ephemeral"'))
  ) {
    return; // Suppress deprecation warnings
  }
  originalWarn.apply(console, args);
};
