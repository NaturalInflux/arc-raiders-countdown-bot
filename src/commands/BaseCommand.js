/**
 * Base Command Class
 * Provides common functionality for all Discord commands
 */

const { EmbedBuilder } = require('discord.js');
const { CONFIG } = require('../config/constants');
const Logger = require('../utils/logger');

class BaseCommand {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }

  /**
   * Check if user has required permissions
   * @param {Object} interaction - Discord interaction
   * @returns {boolean} - True if user has permissions
   */
  hasPermission(interaction) {
    return interaction.member.permissions.has('ManageGuild');
  }

  /**
   * Send permission denied response
   * @param {Object} interaction - Discord interaction
   */
  async sendPermissionDenied(interaction) {
    await interaction.reply({
      content: 'You need the "Manage Server" permission to use this command.',
      ephemeral: true
    });
  }

  /**
   * Check if game has already launched
   * @param {Date} releaseDate - Game release date
   * @returns {boolean} - True if game has launched
   */
  hasGameLaunched(releaseDate) {
    const now = new Date();
    return now >= releaseDate;
  }

  /**
   * Send game launched response
   * @param {Object} interaction - Discord interaction
   * @param {Date} releaseDate - Game release date
   */
  async sendGameLaunchedResponse(interaction, releaseDate) {
    const now = new Date();
    await interaction.reply({
      content: `🎉 Arc Raiders has already launched! Countdown messages have stopped.\n\nLaunch date: ${releaseDate.toLocaleDateString()}\nCurrent time: ${now.toLocaleDateString()}\n\n*The bot may be updated with new features in the future!*`,
      ephemeral: true
    });
  }

  /**
   * Create error embed
   * @param {string} title - Error title
   * @param {string} description - Error description
   * @returns {EmbedBuilder} - Error embed
   */
  createErrorEmbed(title, description) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0xFF6B6B)
      .setTimestamp();
  }

  /**
   * Create success embed
   * @param {string} title - Success title
   * @param {string} description - Success description
   * @returns {EmbedBuilder} - Success embed
   */
  createSuccessEmbed(title, description) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0x2AA198)
      .setTimestamp();
  }

  /**
   * Create info embed
   * @param {string} title - Info title
   * @param {string} description - Info description
   * @returns {EmbedBuilder} - Info embed
   */
  createInfoEmbed(title, description) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0x5294E2)
      .setTimestamp();
  }

  /**
   * Log command execution
   * @param {Object} interaction - Discord interaction
   * @param {string} action - Action performed
   */
  logCommand(interaction, action) {
    Logger.info(`Command executed: ${this.name}`, {
      guildId: interaction.guildId,
      userId: interaction.user.id,
      action
    });
  }

  /**
   * Handle command execution (to be implemented by subclasses)
   * @param {Object} interaction - Discord interaction
   * @param {Object} services - Service instances
   */
  async execute(interaction, services) {
    throw new Error('Execute method must be implemented by subclass');
  }

  /**
   * Get command name
   * @returns {string} - Command name
   */
  getName() {
    return this.name;
  }

  /**
   * Get command description
   * @returns {string} - Command description
   */
  getDescription() {
    return this.description;
  }
}

module.exports = BaseCommand;
