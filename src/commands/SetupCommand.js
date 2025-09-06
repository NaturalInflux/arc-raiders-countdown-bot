/**
 * Setup Command Handler
 * Handles the /countdown-setup command
 */

const { SlashCommandBuilder } = require('discord.js');
const BaseCommand = require('./BaseCommand');
const Logger = require('../utils/logger');

class SetupCommand extends BaseCommand {
  constructor() {
    super('countdown-setup', 'Set countdown channel');
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
        option.setName('channel')
          .setDescription('Channel name to post countdown messages (e.g., "general")')
          .setRequired(true)
      );
  }

  /**
   * Execute the setup command
   * @param {Object} interaction - Discord interaction
   * @param {Object} services - Service instances
   */
  async execute(interaction, services) {
    const { configService, releaseDate } = services;

    // Check if game has already launched
    if (this.hasGameLaunched(releaseDate)) {
      await this.sendGameLaunchedResponse(interaction, releaseDate);
      return;
    }

    const channelName = interaction.options.getString('channel');
    
    // Find channel by name
    const channel = interaction.guild.channels.cache.find(
      ch => ch.name.toLowerCase() === channelName.toLowerCase() && ch.type === 0
    );
    
    if (!channel) {
      await interaction.reply({
        content: `Channel "#${channelName}" not found. Make sure the channel exists and I have access to it.`,
        ephemeral: true
      });
      return;
    }
    
    // Update configuration
    configService.updateServerConfig(interaction.guildId, { 
      channelId: channel.id,
      channelName: channelName,
      postTime: '12:00' // Default time
    });
    
    this.logCommand(interaction, `Channel set to #${channelName}`);
    
    await interaction.reply({
      content: `Configuration complete!\nChannel: #${channelName}\nTime: 12:00 (UTC) - Use \`/countdown-time\` to change`,
      ephemeral: true
    });
  }
}

module.exports = SetupCommand;
