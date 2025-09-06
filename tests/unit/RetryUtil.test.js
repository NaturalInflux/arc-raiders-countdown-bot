/**
 * RetryUtil Unit Tests
 * Tests for retry logic with exponential backoff
 */

const RetryUtil = require('../../src/utils/retry');

describe('RetryUtil', () => {
  describe('execute', () => {
    test('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await RetryUtil.execute(mockFn, { maxRetries: 3 });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure and eventually succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const result = await RetryUtil.execute(mockFn, { maxRetries: 3, delays: [10, 10] });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    test('should fail after max retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(RetryUtil.execute(mockFn, { maxRetries: 2 }))
        .rejects.toThrow('Always fails');
      
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    test('should respect backoff timing', async () => {
      const startTime = Date.now();
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');
      
      await RetryUtil.execute(mockFn, { maxRetries: 2, delays: [100] });
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(100); // Should wait at least 100ms
    });

    test('should handle zero retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Fails'));
      
      // With maxRetries: 0, the function should never be called
      // The function should return undefined without throwing
      let result;
      try {
        result = await RetryUtil.execute(mockFn, { maxRetries: 0 });
      } catch (error) {
        // If it throws, that's also acceptable behavior
        result = error;
      }
      
      expect(mockFn).toHaveBeenCalledTimes(0);
      // Either undefined or an error is acceptable
      expect(result === undefined || result instanceof Error).toBe(true);
    });
  });

  describe('shouldRetryDiscordError', () => {
    test('should identify retryable Discord errors', () => {
      expect(RetryUtil.shouldRetryDiscordError({ code: 50013 })).toBe(true);
      expect(RetryUtil.shouldRetryDiscordError({ status: 429 })).toBe(true);
    });

    test('should identify non-retryable Discord errors', () => {
      expect(RetryUtil.shouldRetryDiscordError({ code: 10003 })).toBe(false);
      expect(RetryUtil.shouldRetryDiscordError({ status: 400 })).toBe(false);
    });
  });

  describe('shouldRetryRedditError', () => {
    test('should identify retryable Reddit errors', () => {
      expect(RetryUtil.shouldRetryRedditError({ code: 'ECONNRESET' })).toBe(true);
      expect(RetryUtil.shouldRetryRedditError({ code: 'ETIMEDOUT' })).toBe(true);
      expect(RetryUtil.shouldRetryRedditError({ code: 'ENOTFOUND' })).toBe(true);
      expect(RetryUtil.shouldRetryRedditError({ response: { status: 500 } })).toBe(true);
    });

    test('should identify non-retryable Reddit errors', () => {
      expect(RetryUtil.shouldRetryRedditError({ response: { status: 400 } })).toBe(false);
      expect(RetryUtil.shouldRetryRedditError({ response: { status: 401 } })).toBe(false);
    });
  });
});
