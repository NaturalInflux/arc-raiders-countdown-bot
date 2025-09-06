/**
 * Interaction Handler
 * Handles Discord slash command interactions
 */

const Logger = require('../utils/logger');

class InteractionHandler {
  constructor(commands) {
    this.commands = new Map();
    
    // Register commands
    commands.forEach(command => {
      this.commands.set(command.getName(), command);
    });
  }

  /**
   * Handle slash command interactions
   * @param {Object} interaction - Discord interaction
   * @param {Object} services - Service instances
   */
  async handleInteraction(interaction, services) {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, guildId, user } = interaction;
    const command = this.commands.get(commandName);

    if (!command) {
      Logger.warn(`Unknown command: ${commandName}`);
      return;
    }

    // Check if user has permission to manage the server
    if (!command.hasPermission(interaction)) {
      await command.sendPermissionDenied(interaction);
      return;
    }

    try {
      Logger.info(`Executing command: ${commandName}`, {
        guildId,
        userId: user.id,
        username: user.username
      });

      await command.execute(interaction, services);
    } catch (error) {
      Logger.error(`Error handling slash command: ${commandName}`, error, {
        guildId,
        userId: user.id
      });

      try {
        await interaction.reply({
          content: 'An error occurred while processing the command.',
          ephemeral: true
        });
      } catch (replyError) {
        Logger.error('Failed to send error reply', replyError);
      }
    }
  }

  /**
   * Get all registered commands
   * @returns {Array} - Array of command instances
   */
  getCommands() {
    return Array.from(this.commands.values());
  }

  /**
   * Get command by name
   * @param {string} name - Command name
   * @returns {Object|null} - Command instance or null
   */
  getCommand(name) {
    return this.commands.get(name) || null;
  }

  /**
   * Register a new command
   * @param {Object} command - Command instance
   */
  registerCommand(command) {
    this.commands.set(command.getName(), command);
    Logger.info(`Registered command: ${command.getName()}`);
  }

  /**
   * Unregister a command
   * @param {string} name - Command name
   */
  unregisterCommand(name) {
    if (this.commands.has(name)) {
      this.commands.delete(name);
      Logger.info(`Unregistered command: ${name}`);
    }
  }
}

module.exports = InteractionHandler;
