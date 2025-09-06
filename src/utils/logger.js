/**
 * Centralized Logging Utility
 * Provides consistent logging throughout the application
 */

class Logger {
  /**
   * Log an info message
   * @param {string} message - The message to log
   * @param {Object} meta - Additional metadata
   */
  static info(message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[INFO] ${timestamp} - ${message}${metaStr}`);
  }

  /**
   * Log a warning message
   * @param {string} message - The message to log
   * @param {Object} meta - Additional metadata
   */
  static warn(message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    console.warn(`[WARN] ${timestamp} - ${message}${metaStr}`);
  }

  /**
   * Log an error message
   * @param {string} message - The message to log
   * @param {Error} error - The error object
   * @param {Object} meta - Additional metadata
   */
  static error(message, error = null, meta = {}) {
    const timestamp = new Date().toISOString();
    let errorStr = '';
    
    if (error) {
      errorStr = ` - Error: ${error.message}`;
      if (error.stack) {
        errorStr += `\nStack: ${error.stack}`;
      }
    }
    
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    console.error(`[ERROR] ${timestamp} - ${message}${errorStr}${metaStr}`);
  }

  /**
   * Log a debug message (only in development)
   * @param {string} message - The message to log
   * @param {Object} meta - Additional metadata
   */
  static debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      console.log(`[DEBUG] ${timestamp} - ${message}${metaStr}`);
    }
  }

  /**
   * Log a success message
   * @param {string} message - The message to log
   * @param {Object} meta - Additional metadata
   */
  static success(message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[SUCCESS] ${timestamp} - ${message}${metaStr}`);
  }

  /**
   * Log guild events
   * @param {string} event - The event type (JOINED, LEFT)
   * @param {Object} guild - The Discord guild object
   */
  static guildEvent(event, guild) {
    this.info(`Guild ${event}: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
  }

  /**
   * Log emoji selection
   * @param {number} daysRemaining - Days remaining until release
   * @param {Array} selectedEmojis - Selected emojis
   * @param {number} targetCount - Target emoji count
   */
  static emojiSelection(daysRemaining, selectedEmojis, targetCount) {
    this.info(`Emoji selection for ${daysRemaining} days: ${selectedEmojis.length} emojis selected (target: ${targetCount})`);
    
    if (selectedEmojis.length !== targetCount) {
      this.warn(`Emoji count mismatch! Expected ${targetCount}, got ${selectedEmojis.length}`);
    }
    
    this.debug(`Selected emojis: ${selectedEmojis.join(' ')}`);
  }

  /**
   * Log API requests
   * @param {string} service - The service name (Discord, Reddit)
   * @param {string} endpoint - The API endpoint
   * @param {string} method - HTTP method
   * @param {number} statusCode - Response status code
   * @param {number} duration - Request duration in ms
   */
  static apiRequest(service, endpoint, method, statusCode, duration) {
    this.debug(`${service} API: ${method} ${endpoint} - ${statusCode} (${duration}ms)`);
  }
}

module.exports = Logger;
