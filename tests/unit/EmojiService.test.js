/**
 * EmojiService Unit Tests
 * Tests for emoji selection and management functionality
 */

const EmojiService = require('../../src/services/EmojiService');

// Mock the emoji data
jest.mock('../../src/config/emojis', () => ({
  EARLY_EMOJIS: ['<:sad1:123>', '<:sad2:124>', '<:sad3:125>'],
  MID_EMOJIS: ['<:hopeful1:223>', '<:hopeful2:224>', '<:hopeful3:225>'],
  FINAL_MONTH_EMOJIS: ['<:hype1:323>', '<:hype2:324>', '<:hype3:325>'],
  FINAL_WEEK_EMOJIS: ['<:max1:423>', '<:max2:424>', '<:max3:425>', '<:max4:426>']
}));

describe('EmojiService', () => {
  let emojiService;

  beforeEach(() => {
    emojiService = new EmojiService();
    jest.clearAllMocks();
  });

  describe('determinePhase', () => {
    test('should return early phase for 55+ days', () => {
      expect(emojiService.determinePhase(60)).toBe('early');
      expect(emojiService.determinePhase(100)).toBe('early');
    });

    test('should return mid phase for 30-54 days', () => {
      expect(emojiService.determinePhase(30)).toBe('mid');
      expect(emojiService.determinePhase(40)).toBe('mid');
      expect(emojiService.determinePhase(54)).toBe('mid');
    });

    test('should return final_month phase for 15-29 days', () => {
      expect(emojiService.determinePhase(15)).toBe('final_month');
      expect(emojiService.determinePhase(20)).toBe('final_month');
      expect(emojiService.determinePhase(29)).toBe('final_month');
    });

    test('should return final_week phase for 7-14 days', () => {
      expect(emojiService.determinePhase(7)).toBe('final_week');
      expect(emojiService.determinePhase(10)).toBe('final_week');
      expect(emojiService.determinePhase(14)).toBe('final_week');
    });

    test('should return final_days phase for 1-6 days', () => {
      expect(emojiService.determinePhase(1)).toBe('final_days');
      expect(emojiService.determinePhase(3)).toBe('final_days');
      expect(emojiService.determinePhase(6)).toBe('final_days');
    });

    test('should return launch phase for 0 days', () => {
      expect(emojiService.determinePhase(0)).toBe('launch');
    });

    test('should return early phase as fallback for negative days', () => {
      expect(emojiService.determinePhase(-5)).toBe('early');
    });
  });

  describe('getEmojisForPhase', () => {
    test('should return correct emoji pool for each phase', () => {
      expect(emojiService.getEmojisForPhase('early')).toEqual(['<:sad1:123>', '<:sad2:124>', '<:sad3:125>']);
      expect(emojiService.getEmojisForPhase('mid')).toEqual(['<:hopeful1:223>', '<:hopeful2:224>', '<:hopeful3:225>']);
      expect(emojiService.getEmojisForPhase('final_month')).toEqual(['<:hype1:323>', '<:hype2:324>', '<:hype3:325>']);
      expect(emojiService.getEmojisForPhase('final_week')).toEqual(['<:max1:423>', '<:max2:424>', '<:max3:425>', '<:max4:426>']);
      expect(emojiService.getEmojisForPhase('final_days')).toEqual(['<:max1:423>', '<:max2:424>', '<:max3:425>', '<:max4:426>']);
    });

    test('should return early emojis for unknown phase', () => {
      expect(emojiService.getEmojisForPhase('unknown')).toEqual(['<:sad1:123>', '<:sad2:124>', '<:sad3:125>']);
    });
  });

  describe('selectRandomEmojis', () => {
    test('should select correct number of emojis', () => {
      const emojiPool = ['<:emoji1:123>', '<:emoji2:124>', '<:emoji3:125>'];
      const selected = emojiService.selectRandomEmojis(emojiPool, 2);
      expect(selected).toHaveLength(2);
    });

    test('should not select duplicate emojis', () => {
      const emojiPool = ['<:emoji1:123>', '<:emoji2:124>', '<:emoji3:125>'];
      const selected = emojiService.selectRandomEmojis(emojiPool, 3);
      const uniqueSelected = [...new Set(selected)];
      expect(uniqueSelected).toHaveLength(selected.length);
    });

    test('should return all emojis if count equals pool size', () => {
      const emojiPool = ['<:emoji1:123>', '<:emoji2:124>'];
      const selected = emojiService.selectRandomEmojis(emojiPool, 2);
      expect(selected).toHaveLength(2);
      expect(selected.every(emoji => emojiPool.includes(emoji))).toBe(true);
    });

    test('should return available emojis if count exceeds pool size', () => {
      const emojiPool = ['<:emoji1:123>', '<:emoji2:124>'];
      const selected = emojiService.selectRandomEmojis(emojiPool, 5);
      expect(selected).toHaveLength(2);
    });

    test('should return empty array for empty pool', () => {
      const selected = emojiService.selectRandomEmojis([], 3);
      expect(selected).toHaveLength(0);
    });

    test('should respect max selection attempts', () => {
      // Mock Math.random to always return 0 (same emoji)
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0);
      
      const emojiPool = ['<:emoji1:123>'];
      const selected = emojiService.selectRandomEmojis(emojiPool, 3);
      
      expect(selected).toHaveLength(1); // Should only get 1 unique emoji
      expect(selected[0]).toBe('<:emoji1:123>');
      
      Math.random = originalRandom;
    });
  });

  describe('getCustomEmoji', () => {
    test('should return empty string for launch phase', () => {
      const result = emojiService.getCustomEmoji(0);
      expect(result).toBe('');
    });

    test('should return emojis for early phase', () => {
      const result = emojiService.getCustomEmoji(60);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    test('should return emojis for mid phase', () => {
      const result = emojiService.getCustomEmoji(40);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    test('should return emojis for final_month phase', () => {
      const result = emojiService.getCustomEmoji(20);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    test('should return emojis for final_week phase', () => {
      const result = emojiService.getCustomEmoji(10);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    test('should return emojis for final_days phase', () => {
      const result = emojiService.getCustomEmoji(3);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('getEmojiPlacement', () => {
    test('should return title emojis', () => {
      const placement = emojiService.getEmojiPlacement(40);
      expect(placement).toHaveProperty('title');
      expect(typeof placement.title).toBe('string');
    });

    test('should limit title emojis to max allowed', () => {
      // Mock getCustomEmoji to return many emojis
      const originalGetCustomEmoji = emojiService.getCustomEmoji;
      emojiService.getCustomEmoji = jest.fn(() => 'emoji1 emoji2 emoji3 emoji4 emoji5');
      
      const placement = emojiService.getEmojiPlacement(40);
      const titleEmojis = placement.title.split(' ');
      
      expect(titleEmojis.length).toBeLessThanOrEqual(4); // MAX_TITLE_EMOJIS
      
      emojiService.getCustomEmoji = originalGetCustomEmoji;
    });

    test('should handle empty emoji string', () => {
      const originalGetCustomEmoji = emojiService.getCustomEmoji;
      emojiService.getCustomEmoji = jest.fn(() => '');
      
      const placement = emojiService.getEmojiPlacement(0);
      expect(placement.title).toBe('');
      
      emojiService.getCustomEmoji = originalGetCustomEmoji;
    });
  });

  describe('getPhaseInfo', () => {
    test('should return complete phase information', () => {
      const phaseInfo = emojiService.getPhaseInfo(40);
      
      expect(phaseInfo).toHaveProperty('phase', 'mid');
      expect(phaseInfo).toHaveProperty('name');
      expect(phaseInfo).toHaveProperty('daysRange');
      expect(phaseInfo).toHaveProperty('emojiCount');
      expect(phaseInfo).toHaveProperty('mood');
      expect(phaseInfo).toHaveProperty('description');
    });

    test('should return correct phase info for different days', () => {
      expect(emojiService.getPhaseInfo(60).phase).toBe('early');
      expect(emojiService.getPhaseInfo(40).phase).toBe('mid');
      expect(emojiService.getPhaseInfo(20).phase).toBe('final_month');
      expect(emojiService.getPhaseInfo(10).phase).toBe('final_week');
      expect(emojiService.getPhaseInfo(3).phase).toBe('final_days');
      expect(emojiService.getPhaseInfo(0).phase).toBe('launch');
    });
  });

  describe('validateEmojiLength', () => {
    test('should validate emoji string length', () => {
      const shortString = 'emoji1 emoji2';
      const result = emojiService.validateEmojiLength(shortString);
      
      expect(result).toHaveProperty('isValid', true);
      expect(result).toHaveProperty('length');
      expect(result).toHaveProperty('maxLength');
      expect(result).toHaveProperty('exceedsLimit', false);
    });

    test('should detect when emoji string exceeds limit', () => {
      const longString = 'a'.repeat(300); // Exceeds default 256 limit
      const result = emojiService.validateEmojiLength(longString);
      
      expect(result).toHaveProperty('isValid', false);
      expect(result).toHaveProperty('exceedsLimit', true);
    });

    test('should use custom max length', () => {
      const string = 'a'.repeat(10);
      const result = emojiService.validateEmojiLength(string, 5);
      
      expect(result).toHaveProperty('isValid', false);
      expect(result).toHaveProperty('maxLength', 5);
    });
  });

  describe('getAllPhases', () => {
    test('should return all emoji phases', () => {
      const phases = emojiService.getAllPhases();
      
      expect(phases).toHaveProperty('early');
      expect(phases).toHaveProperty('mid');
      expect(phases).toHaveProperty('final_month');
      expect(phases).toHaveProperty('final_week');
      expect(phases).toHaveProperty('final_days');
    });
  });

  describe('getEmojiStats', () => {
    test('should return emoji statistics', () => {
      const stats = emojiService.getEmojiStats();
      
      expect(stats).toHaveProperty('early');
      expect(stats).toHaveProperty('mid');
      expect(stats).toHaveProperty('final_month');
      expect(stats).toHaveProperty('final_week');
      expect(stats).toHaveProperty('final_days');
      
      // Check structure of each phase stat
      Object.values(stats).forEach(phaseStat => {
        expect(phaseStat).toHaveProperty('count');
        expect(phaseStat).toHaveProperty('phase');
        expect(typeof phaseStat.count).toBe('number');
        expect(typeof phaseStat.phase).toBe('object');
      });
    });
  });
});
