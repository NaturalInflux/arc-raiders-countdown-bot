/**
 * Status Command Handler
 * Handles the /countdown-status command
 */

const { SlashCommandBuilder } = require('discord.js');
const BaseCommand = require('./BaseCommand');
const Logger = require('../utils/logger');

class StatusCommand extends BaseCommand {
  constructor() {
    super('countdown-status', 'View current config');
  }

  /**
   * Get slash command builder
   * @returns {SlashCommandBuilder} - Discord slash command builder
   */
  getSlashCommand() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description);
  }

  /**
   * Execute the status command
   * @param {Object} interaction - Discord interaction
   * @param {Object} services - Service instances
   * @param {Object} client - Discord client
   * @param {Date} releaseDate - Release date
   */
  async execute(interaction, services, client, releaseDate) {
    const { configService } = services;
    
    const serverConfig = configService.getServerConfig(interaction.guildId);
    
    const statusMessage = `Channel: ${serverConfig.channelName ? `#${serverConfig.channelName}` : 'Not configured'}
Time: ${serverConfig.postTime || '12:00'} (UTC)`;
    
    this.logCommand(interaction, 'Status viewed');
    
    await interaction.reply({ 
      content: statusMessage, 
      ephemeral: true 
    });
  }
}

module.exports = StatusCommand;
