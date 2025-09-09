/**
 * Arc Raiders Countdown Bot - Main Entry Point
 * Modular Discord bot for countdown messages with Reddit integration
 */

// Load environment variables
require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { CONFIG } = require('./config/constants');
const Logger = require('./utils/logger');

// Services
const ConfigService = require('./services/ConfigService');
const EmojiService = require('./services/EmojiService');
const RedditService = require('./services/RedditService');
const MessageService = require('./services/MessageService');
const HealthService = require('./services/HealthService');

// Handlers
const InteractionHandler = require('./handlers/InteractionHandler');
const GuildHandler = require('./handlers/GuildHandler');
const CronHandler = require('./handlers/CronHandler');

// Commands
const SetupCommand = require('./commands/SetupCommand');
const TimeCommand = require('./commands/TimeCommand');
const StatusCommand = require('./commands/StatusCommand');
const TestCommand = require('./commands/TestCommand');
const LoveCommand = require('./commands/LoveCommand');

class ArcRaidersCountdownBot {
  constructor() {
    this.client = null;
    this.services = {};
    this.handlers = {};
    this.releaseDate = null;
    this.isReady = false;
  }

  /**
   * Initialize the bot
   */
  async initialize() {
    try {
      Logger.info('Initializing Arc Raiders Countdown Bot...');
      
      // Validate configuration
      this.validateConfig();
      
      // Initialize services
      await this.initializeServices();
      
      // Initialize Discord client
      await this.initializeDiscordClient();
      
      // Initialize handlers
      this.initializeHandlers();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Register slash commands
      await this.registerSlashCommands();
      
      // Start health service
      this.services.healthService.initialize();
      
      // Login to Discord
      await this.client.login(process.env.DISCORD_TOKEN);
      
      Logger.success('Bot initialization completed successfully');
    } catch (error) {
      Logger.error('Failed to initialize bot', error);
      process.exit(1);
    }
  }

  /**
   * Validate required configuration
   */
  validateConfig() {
    const errors = [];
    
    if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN === 'your_bot_token_here') {
      errors.push('DISCORD_TOKEN is not configured');
    }
    
    if (errors.length > 0) {
      Logger.error('Configuration errors:', null, { errors });
      Logger.error('Please check your .env file and ensure all values are properly set.');
      process.exit(1);
    }
    
    // Set release date
    this.releaseDate = new Date(process.env.RELEASE_DATE || CONFIG.GAME.DEFAULT_RELEASE_DATE);
    Logger.info(`Release date set to: ${this.releaseDate.toISOString()}`);
  }

  /**
   * Initialize all services
   */
  async initializeServices() {
    Logger.info('Initializing services...');
    
    // Initialize core services
    this.services.configService = new ConfigService();
    this.services.emojiService = new EmojiService();
    this.services.redditService = new RedditService();
    this.services.healthService = new HealthService();
    
    // Initialize message service with dependencies
    this.services.messageService = new MessageService(
      this.services.emojiService,
      this.services.redditService
    );
    
    Logger.success('Services initialized successfully');
  }

  /**
   * Initialize Discord client
   */
  async initializeDiscordClient() {
    Logger.info('Initializing Discord client...');
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
      ]
    });
    
    Logger.success('Discord client initialized');
  }

  /**
   * Initialize handlers
   */
  initializeHandlers() {
    Logger.info('Initializing handlers...');
    
    // Initialize command handlers
    const commands = [
      new SetupCommand(),
      new TimeCommand(),
      new StatusCommand(),
      new TestCommand(),
      new LoveCommand()
    ];
    
    this.handlers.interactionHandler = new InteractionHandler(commands);
    this.handlers.guildHandler = new GuildHandler(
      this.services.configService,
      this.services.healthService
    );
    this.handlers.cronHandler = new CronHandler();
    
    Logger.success('Handlers initialized successfully');
  }

  /**
   * Set up Discord event listeners
   */
  setupEventListeners() {
    Logger.info('Setting up event listeners...');
    
    // Bot ready event
    this.client.once('ready', async () => {
      await this.handleReady();
    });
    
    // Guild events
    this.client.on('guildCreate', async (guild) => {
      await this.handlers.guildHandler.handleGuildJoin(guild, this.client);
    });
    
    this.client.on('guildDelete', async (guild) => {
      await this.handlers.guildHandler.handleGuildLeave(guild, this.client);
    });
    
    // Interaction events
    this.client.on('interactionCreate', async (interaction) => {
      await this.handlers.interactionHandler.handleInteraction(interaction, this.services, this.client, this.releaseDate);
    });
    
    // Error handling
    this.client.on('error', (error) => {
      Logger.error('Discord client error', error);
    });
    
    this.client.on('warn', (warning) => {
      Logger.warn('Discord client warning', null, { warning });
    });
    
    Logger.success('Event listeners set up successfully');
  }

  /**
   * Handle bot ready event
   */
  async handleReady() {
    try {
      Logger.success(`Bot ready - ${this.client.guilds.cache.size} servers`);
      
      // Update server count
      this.services.healthService.updateServerCount(this.client.guilds.cache.size);
      
      // Clean up orphaned server configurations
      await this.handlers.guildHandler.cleanupOrphanedConfigs(this.client);
      
      // Attach cron handler to client for command access
      this.client.cronHandler = this.handlers.cronHandler;
      
      // Schedule countdown messages for all configured servers
      this.handlers.cronHandler.scheduleCountdownMessages(
        this.client,
        this.services,
        this.releaseDate
      );
      
      this.isReady = true;
      Logger.success('Bot is fully operational');
    } catch (error) {
      Logger.error('Error in ready handler', error);
    }
  }

  /**
   * Register slash commands with Discord
   */
  async registerSlashCommands() {
    try {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      const commands = this.handlers.interactionHandler.getCommands();
      
      Logger.info('Started refreshing application (/) commands.');
      
      await rest.put(
        Routes.applicationCommands(CONFIG.DISCORD.BOT_CLIENT_ID),
        { body: commands.map(cmd => cmd.getSlashCommand().toJSON()) }
      );
      
      Logger.success('Successfully reloaded application (/) commands.');
    } catch (error) {
      Logger.error('Error registering commands', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    Logger.info('Initiating graceful shutdown...');
    
    try {
      // Stop all cron jobs
      this.handlers.cronHandler.stopAllCronJobs();
      
      // Stop health service
      this.services.healthService.stop();
      
      // Destroy Discord client
      if (this.client) {
        this.client.destroy();
      }
      
      Logger.success('Graceful shutdown completed');
    } catch (error) {
      Logger.error('Error during shutdown', error);
    }
  }

  /**
   * Get bot status
   * @returns {Object} - Bot status information
   */
  getStatus() {
    return {
      isReady: this.isReady,
      guilds: this.client ? this.client.guilds.cache.size : 0,
      uptime: process.uptime(),
      releaseDate: this.releaseDate,
      services: {
        reddit: this.services.redditService.getStatus(),
        health: this.services.healthService.getHealthStatus()
      },
      cron: this.handlers.cronHandler.getStats()
    };
  }
}

// Create and initialize bot instance
const bot = new ArcRaidersCountdownBot();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  Logger.info('Received SIGINT, shutting down gracefully...');
  await bot.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  Logger.info('Received SIGTERM, shutting down gracefully...');
  await bot.shutdown();
  process.exit(0);
});

// Handle uncaught exceptions (bot continues running)
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught exception', error);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled rejection', null, { reason, promise });
});

// Initialize bot
bot.initialize().catch(error => {
  Logger.error('Failed to initialize bot', error);
  process.exit(1);
});

module.exports = bot;
