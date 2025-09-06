/**
 * Guild Handler
 * Handles Discord guild events (join/leave)
 */

const { EmbedBuilder } = require('discord.js');
const { CONFIG } = require('../config/constants');
const Logger = require('../utils/logger');

class GuildHandler {
  constructor(configService, healthService) {
    this.configService = configService;
    this.healthService = healthService;
  }

  /**
   * Handle guild join event
   * @param {Object} guild - Discord guild object
   * @param {Object} client - Discord client
   */
  async handleGuildJoin(guild, client) {
    Logger.guildEvent('JOINED', guild);
    this.healthService.updateServerCount(client.guilds.cache.size);
    
    // Send welcome message to the first available channel
    try {
      const channel = guild.channels.cache.find(ch => 
        ch.type === 0 && ch.permissionsFor(guild.members.me).has('SendMessages')
      );
      
      if (channel) {
        const welcomeEmbed = new EmbedBuilder()
          .setTitle('⚙️ Arc Raiders Countdown Bot')
          .setDescription(`Thanks for adding me :)\nRun \`/countdown-setup\` to get started.\n\n📖 [View on GitHub](https://github.com/NaturalInflux/arc-raiders-countdown-bot)`)
          .setColor(0x5294E2)
          .setTimestamp();
        
        await channel.send({ embeds: [welcomeEmbed] });
        Logger.info(`Welcome message sent to guild: ${guild.name} (${guild.id})`);
      }
    } catch (error) {
      Logger.error('Error sending welcome message', error);
    }
  }

  /**
   * Handle guild leave event
   * @param {Object} guild - Discord guild object
   * @param {Object} client - Discord client
   */
  async handleGuildLeave(guild, client) {
    Logger.guildEvent('LEFT', guild);
    this.healthService.updateServerCount(client.guilds.cache.size);
    
    // Remove server configuration when bot leaves
    this.configService.removeServerConfig(guild.id);
    Logger.info(`Removed configuration for server: ${guild.name} (${guild.id})`);
  }

  /**
   * Clean up orphaned server configurations
   * @param {Object} client - Discord client
   * @returns {number} - Number of orphaned configs removed
   */
  async cleanupOrphanedConfigs(client) {
    const currentGuilds = client.guilds.cache.map(guild => guild.id);
    const removedCount = this.configService.cleanupOrphanedConfigs(currentGuilds);
    
    if (removedCount > 0) {
      Logger.info(`Cleaned up ${removedCount} orphaned server configurations`);
    }
    
    return removedCount;
  }

  /**
   * Get guild statistics
   * @param {Object} client - Discord client
   * @returns {Object} - Guild statistics
   */
  getGuildStats(client) {
    const guilds = client.guilds.cache;
    const configStats = this.configService.getConfigStats();
    
    return {
      totalGuilds: guilds.size,
      configuredGuilds: configStats.configuredServers,
      totalMembers: guilds.reduce((total, guild) => total + guild.memberCount, 0),
      averageMembers: guilds.size > 0 ? Math.round(guilds.reduce((total, guild) => total + guild.memberCount, 0) / guilds.size) : 0,
      configStats
    };
  }

  /**
   * Validate guild permissions
   * @param {Object} guild - Discord guild object
   * @returns {Object} - Permission validation result
   */
  validateGuildPermissions(guild) {
    const botMember = guild.members.me;
    const requiredPermissions = [
      'SendMessages',
      'EmbedLinks',
      'AttachFiles',
      'UseExternalEmojis'
    ];

    const missingPermissions = requiredPermissions.filter(permission => 
      !botMember.permissions.has(permission)
    );

    return {
      hasAllPermissions: missingPermissions.length === 0,
      missingPermissions,
      canOperate: missingPermissions.length === 0
    };
  }

  /**
   * Get guild information
   * @param {Object} guild - Discord guild object
   * @returns {Object} - Guild information
   */
  getGuildInfo(guild) {
    const config = this.configService.getServerConfig(guild.id);
    const permissions = this.validateGuildPermissions(guild);
    
    return {
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      joinedAt: guild.joinedAt,
      isConfigured: this.configService.isServerConfigured(guild.id),
      config,
      permissions
    };
  }
}

module.exports = GuildHandler;
