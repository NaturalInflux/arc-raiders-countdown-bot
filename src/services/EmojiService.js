/**
 * Emoji Service
 * Handles emoji selection and management for countdown messages
 */

const { EMOJI_PHASES, CONFIG } = require('../config/constants');
const { EARLY_EMOJIS, MID_EMOJIS, FINAL_MONTH_EMOJIS, FINAL_WEEK_EMOJIS } = require('../config/emojis');
const Logger = require('../utils/logger');

class EmojiService {
  constructor() {
    this.emojiPools = {
      early: EARLY_EMOJIS,
      mid: MID_EMOJIS,
      final_month: FINAL_MONTH_EMOJIS,
      final_week: FINAL_WEEK_EMOJIS,
      final_days: FINAL_WEEK_EMOJIS // Same as final_week for maximum intensity
    };
  }

  /**
   * Determine the emoji phase based on days remaining
   * @param {number} daysRemaining - Days remaining until release
   * @returns {string} - Phase name
   */
  determinePhase(daysRemaining) {
    if (daysRemaining >= 55) return 'early';
    if (daysRemaining >= 30 && daysRemaining < 55) return 'mid';
    if (daysRemaining >= 15 && daysRemaining < 30) return 'final_month';
    if (daysRemaining >= 7 && daysRemaining < 15) return 'final_week';
    if (daysRemaining >= 1 && daysRemaining < 7) return 'final_days';
    if (daysRemaining === 0) return 'launch';
    return 'early'; // fallback
  }

  /**
   * Get emojis for a specific phase
   * @param {string} phase - The phase name
   * @returns {Array} - Array of emojis for the phase
   */
  getEmojisForPhase(phase) {
    return this.emojiPools[phase] || this.emojiPools.early;
  }

  /**
   * Select random emojis from a pool without duplicates
   * @param {Array} emojiPool - Pool of emojis to select from
   * @param {number} count - Number of emojis to select
   * @returns {Array} - Selected emojis
   */
  selectRandomEmojis(emojiPool, count) {
    const selectedEmojis = [];
    let attempts = 0;

    while (selectedEmojis.length < count && attempts < CONFIG.EMOJI.MAX_SELECTION_ATTEMPTS) {
      const randomEmoji = emojiPool[Math.floor(Math.random() * emojiPool.length)];
      if (!selectedEmojis.includes(randomEmoji)) {
        selectedEmojis.push(randomEmoji);
      }
      attempts++;
    }

    return selectedEmojis;
  }

  /**
   * Get custom emojis based on days remaining
   * @param {number} daysRemaining - Days remaining until release
   * @returns {string} - Space-separated emoji string
   */
  getCustomEmoji(daysRemaining) {
    const phase = this.determinePhase(daysRemaining);
    
    if (phase === 'launch') {
      return ''; // No emojis for launch day
    }

    const phaseConfig = EMOJI_PHASES[phase];
    const emojiPool = this.getEmojisForPhase(phase);
    const selectedEmojis = this.selectRandomEmojis(emojiPool, phaseConfig.emojiCount);

    // Log emoji selection for debugging
    Logger.emojiSelection(daysRemaining, selectedEmojis, phaseConfig.emojiCount);

    return selectedEmojis.join(' ');
  }

  /**
   * Get emoji placement for different parts of the message
   * @param {number} daysRemaining - Days remaining until release
   * @returns {Object} - Emoji placement object
   */
  getEmojiPlacement(daysRemaining) {
    const emojis = this.getCustomEmoji(daysRemaining).split(' ');
    
    // Limit emojis in title to stay under Discord's character limit
    const maxTitleEmojis = Math.min(emojis.length, CONFIG.EMOJI.MAX_TITLE_EMOJIS);
    const titleEmojis = emojis.slice(0, maxTitleEmojis);
    
    return {
      title: titleEmojis.join(' ')
    };
  }

  /**
   * Get phase information for a given days remaining
   * @param {number} daysRemaining - Days remaining until release
   * @returns {Object} - Phase information
   */
  getPhaseInfo(daysRemaining) {
    const phase = this.determinePhase(daysRemaining);
    return {
      phase,
      ...EMOJI_PHASES[phase]
    };
  }

  /**
   * Validate emoji string length for Discord limits
   * @param {string} emojiString - The emoji string to validate
   * @param {number} maxLength - Maximum allowed length (default: 256)
   * @returns {Object} - Validation result
   */
  validateEmojiLength(emojiString, maxLength = CONFIG.EMOJI.TITLE_CHAR_LIMIT) {
    const length = emojiString.length;
    const isValid = length <= maxLength;
    
    if (!isValid) {
      Logger.warn(`Emoji string exceeds character limit: ${length}/${maxLength}`, {
        emojiString,
        length,
        maxLength
      });
    }

    return {
      isValid,
      length,
      maxLength,
      exceedsLimit: length > maxLength
    };
  }

  /**
   * Get all available emoji phases
   * @returns {Object} - All emoji phases
   */
  getAllPhases() {
    return EMOJI_PHASES;
  }

  /**
   * Get emoji statistics
   * @returns {Object} - Emoji statistics
   */
  getEmojiStats() {
    const stats = {};
    
    Object.keys(this.emojiPools).forEach(phase => {
      stats[phase] = {
        count: this.emojiPools[phase].length,
        phase: EMOJI_PHASES[phase]
      };
    });

    return stats;
  }
}

module.exports = EmojiService;
