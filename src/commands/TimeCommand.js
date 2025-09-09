/**
 * Time Command Handler
 * Handles the /countdown-time command
 */

const { SlashCommandBuilder } = require('discord.js');
const BaseCommand = require('./BaseCommand');
const TimeUtil = require('../utils/time');
const Logger = require('../utils/logger');

class TimeCommand extends BaseCommand {
  constructor() {
    super('countdown-time', 'Set countdown post time in UTC');
  }

  /**
   * Get slash command builder
   * @returns {SlashCommandBuilder} - Discord slash command builder
   */
  getSlashCommand() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .addStringOption(option =>
        option.setName('time')
          .setDescription('Time to post daily in UTC (e.g., "3am", "15:00", "3:30pm")')
          .setRequired(true)
      );
  }

  /**
   * Execute the time command
   * @param {Object} interaction - Discord interaction
   * @param {Object} services - Service instances
   * @param {Object} client - Discord client
   * @param {Date} releaseDate - Release date
   */
  async execute(interaction, services, client, releaseDate) {
    const { configService } = services;

    // Check if game has already launched
    if (this.hasGameLaunched(releaseDate)) {
      await this.sendGameLaunchedResponse(interaction, releaseDate);
      return;
    }

    const timeInput = interaction.options.getString('time');
    
    // Validate time input
    const validation = TimeUtil.validateTimeInput(timeInput);
    if (!validation.valid) {
      await interaction.reply({
        content: `Invalid time format. ${validation.error}\n\nSupported formats: ${validation.suggestions.join(', ')}`,
        ephemeral: true
      });
      return;
    }
    
    // Update configuration
    configService.updateServerConfig(interaction.guildId, { postTime: timeInput });
    
    // Reschedule the cron job immediately with the new time
    const serverConfig = configService.getServerConfig(interaction.guildId);
    if (serverConfig.channelId) {
      // Get the cron handler from the client (it's attached during bot initialization)
      const cronHandler = client.cronHandler;
      if (cronHandler) {
        cronHandler.updateServerSchedule(interaction.guildId, timeInput, client, services, releaseDate);
        Logger.info(`Cron job rescheduled for guild ${interaction.guildId} with new time: ${timeInput}`);
      }
    }
    
    this.logCommand(interaction, `Time updated to ${timeInput}`);
    
    await interaction.reply({
      content: `Post time updated to ${timeInput} (UTC) and rescheduled immediately!`,
      ephemeral: true
    });
  }
}

module.exports = TimeCommand;
