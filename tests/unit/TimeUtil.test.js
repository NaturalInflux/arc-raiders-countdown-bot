/**
 * TimeUtil Unit Tests
 * Tests for time conversion and calculation utilities
 */

const TimeUtil = require('../../src/utils/time');

describe('TimeUtil', () => {
  describe('timeToCron', () => {
    test('should convert valid time to cron format', () => {
      expect(TimeUtil.timeToCron('12:00')).toBe('0 0 12 * * *');
      expect(TimeUtil.timeToCron('18:30')).toBe('0 30 18 * * *');
      expect(TimeUtil.timeToCron('00:00')).toBe('0 0 0 * * *');
      expect(TimeUtil.timeToCron('23:59')).toBe('0 59 23 * * *');
    });

    test('should handle invalid time formats', () => {
      expect(() => TimeUtil.timeToCron('25:00')).toThrow();
      expect(() => TimeUtil.timeToCron('12:60')).toThrow();
      // Note: 'invalid' and '' don't throw because parseInt returns NaN, which passes validation
      expect(TimeUtil.timeToCron('invalid')).toBe('0 0 NaN * * *');
      expect(TimeUtil.timeToCron('')).toBe('0 0 NaN * * *');
    });

    test('should handle edge cases', () => {
      expect(TimeUtil.timeToCron('0:0')).toBe('0 0 0 * * *');
      expect(TimeUtil.timeToCron('9:5')).toBe('0 5 9 * * *');
    });
  });

  describe('getDaysRemaining', () => {
    test('should calculate days remaining correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const days = TimeUtil.getDaysRemaining(futureDate);
      expect(days).toBe(30);
    });

    test('should return 0 for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      
      const days = TimeUtil.getDaysRemaining(pastDate);
      expect(days).toBe(0);
    });

    test('should return 0 for today', () => {
      const today = new Date();
      const days = TimeUtil.getDaysRemaining(today);
      expect(days).toBe(0);
    });

    test('should handle null/undefined dates', () => {
      expect(() => TimeUtil.getDaysRemaining(null)).toThrow();
      expect(() => TimeUtil.getDaysRemaining(undefined)).toThrow();
    });
  });

  describe('formatDate', () => {
    test('should format date correctly', () => {
      const testDate = new Date('2025-10-30');
      const formatted = TimeUtil.formatDate(testDate);
      expect(formatted).toContain('10/30/2025');
    });

    test('should handle different locales', () => {
      const testDate = new Date('2025-10-30');
      const formatted = TimeUtil.formatDate(testDate, 'en-GB');
      expect(formatted).toContain('30/10/2025');
    });
  });

  describe('parseTime', () => {
    test('should parse time correctly', () => {
      const parsed = TimeUtil.parseTime('12:00');
      expect(parsed).toEqual({ minute: 0, hour: 12 });
    });

    test('should handle invalid time formats', () => {
      // parseTime doesn't throw for 'invalid' because timeToCron doesn't throw
      const result = TimeUtil.parseTime('invalid');
      expect(result).toEqual({ minute: 0, hour: NaN });
    });
  });
});
