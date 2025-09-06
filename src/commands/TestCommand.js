/**
 * Test Command Handler
 * Handles the /countdown-test command
 */

const { SlashCommandBuilder } = require('discord.js');
const BaseCommand = require('./BaseCommand');
const Logger = require('../utils/logger');

class TestCommand extends BaseCommand {
  constructor() {
    super('countdown-test', 'Test countdown message');
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
   * Execute the test command
   * @param {Object} interaction - Discord interaction
   * @param {Object} services - Service instances
   * @param {Object} client - Discord client
   * @param {Date} releaseDate - Release date
   */
  async execute(interaction, services, client, releaseDate) {
    const { configService, messageService } = services;
    
    const serverConfig = configService.getServerConfig(interaction.guildId);
    
    if (!serverConfig.channelId) {
      await interaction.reply({
        content: 'No channel configured. Use `/countdown-setup` first.',
        ephemeral: true
      });
      return;
    }
    
    await interaction.reply({
      content: 'Sending test message...',
      ephemeral: true
    });
    
    try {
      await messageService.postTestCountdownMessage(interaction.guildId, client, configService, releaseDate);
      this.logCommand(interaction, 'Test message sent');
    } catch (error) {
      Logger.error('Error testing countdown message', error);
      await interaction.followUp({
        content: `❌ Error testing countdown message: ${error.message}`,
        ephemeral: true
      });
    }
  }
}

module.exports = TestCommand;
