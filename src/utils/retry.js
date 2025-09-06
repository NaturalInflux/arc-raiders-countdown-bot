/**
 * Retry Utility
 * Provides retry logic with exponential backoff for API calls
 */

const Logger = require('./logger');

class RetryUtil {
  /**
   * Execute a function with retry logic
   * @param {Function} fn - The function to execute
   * @param {Object} options - Retry options
   * @param {number} options.maxRetries - Maximum number of retries (default: 3)
   * @param {Array} options.delays - Array of delay times in ms (default: [1000, 2000, 4000])
   * @param {Function} options.shouldRetry - Function to determine if error should be retried
   * @param {string} options.operation - Description of the operation for logging
   * @returns {Promise} - The result of the function execution
   */
  static async execute(fn, options = {}) {
    const {
      maxRetries = 3,
      delays = [1000, 2000, 4000],
      shouldRetry = () => true,
      operation = 'operation'
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        if (attempt > 1) {
          Logger.success(`${operation} succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if we should retry this error
        if (!shouldRetry(error) || attempt === maxRetries) {
          Logger.error(`${operation} failed after ${attempt} attempts`, error);
          throw error;
        }

        // Calculate delay for this attempt
        const delay = delays[Math.min(attempt - 1, delays.length - 1)];
        Logger.warn(`${operation} failed on attempt ${attempt}, retrying in ${delay}ms`, {
          error: error.message,
          attempt,
          maxRetries
        });

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Check if a Discord API error should be retried
   * @param {Error} error - The error to check
   * @returns {boolean} - Whether the error should be retried
   */
  static shouldRetryDiscordError(error) {
    return error.code === 50013 || error.status === 429;
  }

  /**
   * Check if a Reddit API error should be retried
   * @param {Error} error - The error to check
   * @returns {boolean} - Whether the error should be retried
   */
  static shouldRetryRedditError(error) {
    // Retry on network errors, timeouts, and 5xx errors
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' || 
           error.code === 'ENOTFOUND' ||
           (error.response && error.response.status >= 500);
  }

  /**
   * Send a Discord message with retry logic
   * @param {Object} channel - Discord channel object
   * @param {Object} messageOptions - Message options
   * @param {number} maxRetries - Maximum retries (default: 3)
   * @returns {Promise} - The sent message
   */
  static async sendDiscordMessage(channel, messageOptions, maxRetries = 3) {
    return this.execute(
      () => channel.send(messageOptions),
      {
        maxRetries,
        shouldRetry: this.shouldRetryDiscordError,
        operation: `Discord message send to channel ${channel.id}`
      }
    );
  }

  /**
   * Make an HTTP request with retry logic
   * @param {Function} requestFn - Function that makes the HTTP request
   * @param {Object} options - Retry options
   * @returns {Promise} - The response
   */
  static async httpRequest(requestFn, options = {}) {
    return this.execute(requestFn, {
      maxRetries: 3,
      delays: [1000, 2000, 4000],
      shouldRetry: this.shouldRetryRedditError,
      operation: 'HTTP request',
      ...options
    });
  }
}

module.exports = RetryUtil;
