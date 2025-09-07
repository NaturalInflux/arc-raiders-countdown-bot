/**
 * Time Utility Functions
 * Handles time parsing, conversion, and validation
 */

const Logger = require('./logger');

class TimeUtil {
  /**
   * Convert simple time input to cron format
   * @param {string} timeInput - Time input (e.g., "3am", "15:00", "3:30pm")
   * @returns {string} - Cron format string
   * @throws {Error} - If time format is invalid
   */
  static timeToCron(timeInput) {
    // Remove spaces and convert to lowercase
    const time = timeInput.toLowerCase().replace(/\s/g, '');
    
    // Handle formats like "3am", "3pm", "15:00", "3:00pm", etc.
    let hour = 0, minute = 0;
    
    if (time.includes('am') || time.includes('pm')) {
      // Handle 12-hour format
      const isPM = time.includes('pm');
      const timeOnly = time.replace(/[amp]/g, '');
      
      if (timeOnly.includes(':')) {
        [hour, minute] = timeOnly.split(':').map(Number);
      } else {
        hour = parseInt(timeOnly);
      }
      
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
    } else if (time.includes(':')) {
      // Handle 24-hour format
      [hour, minute] = time.split(':').map(Number);
    } else {
      // Assume it's just an hour
      hour = parseInt(time);
    }
    
    // Validate
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error('Invalid time format');
    }
    
    return `0 ${minute} ${hour} * * *`;
  }

  /**
   * Calculate days remaining until a target date
   * @param {Date} releaseDate - The target release date
   * @returns {number} - Days remaining (minimum 0)
   */
  static getDaysRemaining(releaseDate) {
    const now = new Date();
    const timeDiff = releaseDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return Math.max(0, daysRemaining);
  }

  /**
   * Check if a date has passed
   * @param {Date} targetDate - The date to check
   * @returns {boolean} - True if the date has passed
   */
  static hasDatePassed(targetDate) {
    const now = new Date();
    return now >= targetDate;
  }

  /**
   * Format a date for display
   * @param {Date} date - The date to format
   * @param {string} locale - Locale for formatting (default: 'en-US')
   * @returns {string} - Formatted date string
   */
  static formatDate(date, locale = 'en-US') {
    return date.toLocaleDateString(locale);
  }

  /**
   * Format a date and time for display
   * @param {Date} date - The date to format
   * @param {string} locale - Locale for formatting (default: 'en-US')
   * @returns {string} - Formatted date and time string
   */
  static formatDateTime(date, locale = 'en-US') {
    return date.toLocaleString(locale);
  }

  /**
   * Get current UTC time as ISO string
   * @returns {string} - Current UTC time in ISO format
   */
  static getCurrentUTC() {
    return new Date().toISOString();
  }

  /**
   * Parse a time string and validate it
   * @param {string} timeString - Time string to parse
   * @returns {Object} - Parsed time object with hour and minute
   * @throws {Error} - If time format is invalid
   */
  static parseTime(timeString) {
    try {
      const cronFormat = this.timeToCron(timeString);
      const parts = cronFormat.split(' ');
      return {
        minute: parseInt(parts[1]),
        hour: parseInt(parts[2])
      };
    } catch (error) {
      throw new Error(`Invalid time format: ${timeString}. Use formats like: "3am", "15:00", "3:30pm"`);
    }
  }

  /**
   * Get supported time formats for documentation
   * @returns {Array} - Array of supported time format examples
   */
  static getSupportedFormats() {
    return [
      '3am', '3pm', '12am', '12pm',           // 12-hour format
      '15:00', '00:30', '23:59',              // 24-hour format
      '3:30pm', '11:45am'                     // Mixed format
    ];
  }

  /**
   * Validate time input and provide helpful error messages
   * @param {string} timeInput - Time input to validate
   * @returns {Object} - Validation result
   */
  static validateTimeInput(timeInput) {
    try {
      this.parseTime(timeInput);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        suggestions: this.getSupportedFormats()
      };
    }
  }
}

module.exports = TimeUtil;
