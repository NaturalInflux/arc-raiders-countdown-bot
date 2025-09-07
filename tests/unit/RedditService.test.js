/**
 * RedditService Unit Tests
 * Tests for Reddit API integration and caching functionality
 */

const axios = require('axios');
const RedditService = require('../../src/services/RedditService');

// Mock axios
jest.mock('axios');

// Mock RetryUtil
jest.mock('../../src/utils/retry', () => ({
  httpRequest: jest.fn(),
  execute: jest.fn(),
  shouldRetryRedditError: jest.fn()
}));

const RetryUtil = require('../../src/utils/retry');

describe('RedditService', () => {
  let redditService;

  beforeEach(() => {
    // Set up environment variables
    process.env.REDDIT_CLIENT_ID = 'test-client-id';
    process.env.REDDIT_CLIENT_SECRET = 'test-client-secret';
    process.env.REDDIT_USERNAME = 'test-username';
    process.env.REDDIT_PASSWORD = 'test-password';

    redditService = new RedditService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;
    delete process.env.REDDIT_USERNAME;
    delete process.env.REDDIT_PASSWORD;
  });

  describe('constructor', () => {
    test('should initialize with environment variables', () => {
      expect(redditService.clientId).toBe('test-client-id');
      expect(redditService.clientSecret).toBe('test-client-secret');
      expect(redditService.username).toBe('test-username');
      expect(redditService.password).toBe('test-password');
    });

    test('should initialize with null values when env vars not set', () => {
      delete process.env.REDDIT_CLIENT_ID;
      delete process.env.REDDIT_CLIENT_SECRET;
      delete process.env.REDDIT_USERNAME;
      delete process.env.REDDIT_PASSWORD;

      const service = new RedditService();
      expect(service.clientId).toBeUndefined();
      expect(service.clientSecret).toBeUndefined();
      expect(service.username).toBeUndefined();
      expect(service.password).toBeUndefined();
    });
  });

  describe('isConfigured', () => {
    test('should return true when all credentials are set', () => {
      expect(redditService.isConfigured()).toBe(true);
    });

    test('should return false when client ID is missing', () => {
      redditService.clientId = null;
      expect(redditService.isConfigured()).toBe(false);
    });

    test('should return false when client secret is missing', () => {
      redditService.clientSecret = null;
      expect(redditService.isConfigured()).toBe(false);
    });

    test('should return false when username is missing', () => {
      redditService.username = null;
      expect(redditService.isConfigured()).toBe(false);
    });

    test('should return false when password is missing', () => {
      redditService.password = null;
      expect(redditService.isConfigured()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    test('should return cached token when valid', async () => {
      redditService.accessToken = 'cached-token';
      redditService.tokenExpiry = Date.now() + 30000; // 30 seconds from now

      const result = await redditService.getAccessToken();

      expect(result).toBe('cached-token');
      expect(RetryUtil.httpRequest).not.toHaveBeenCalled();
    });

    test('should fetch new token when cached token is expired', async () => {
      redditService.accessToken = 'expired-token';
      redditService.tokenExpiry = Date.now() - 30000; // 30 seconds ago

      const mockResponse = {
        data: {
          access_token: 'new-token'
        }
      };

      RetryUtil.httpRequest.mockResolvedValue(mockResponse);

      const result = await redditService.getAccessToken();

      expect(result).toBe('new-token');
      expect(redditService.accessToken).toBe('new-token');
      expect(redditService.tokenExpiry).toBeGreaterThan(Date.now());
    });

    test('should return null when not configured', async () => {
      redditService.clientId = null;

      const result = await redditService.getAccessToken();

      expect(result).toBeNull();
      expect(RetryUtil.httpRequest).not.toHaveBeenCalled();
    });

    test('should handle API error response', async () => {
      const mockResponse = {
        data: {
          error: 'invalid_grant'
        }
      };

      RetryUtil.httpRequest.mockResolvedValue(mockResponse);

      const result = await redditService.getAccessToken();

      expect(result).toBeNull();
    });

    test('should handle request failure', async () => {
      RetryUtil.httpRequest.mockRejectedValue(new Error('Network error'));

      const result = await redditService.getAccessToken();

      expect(result).toBeNull();
    });
  });

  describe('getCachedRedditPost', () => {
    test('should return cached post for same day', async () => {
      const mockPost = { title: 'Test Post', score: 100 };
      redditService.cachedPost = mockPost;
      redditService.postCacheDate = new Date().toDateString();

      // Mock the getTopArcRaidersPost method
      const originalGetTopArcRaidersPost = redditService.getTopArcRaidersPost;
      redditService.getTopArcRaidersPost = jest.fn();

      const result = await redditService.getCachedRedditPost();

      expect(result).toBe(mockPost);
      expect(redditService.getTopArcRaidersPost).not.toHaveBeenCalled();

      // Restore original method
      redditService.getTopArcRaidersPost = originalGetTopArcRaidersPost;
    });

    test('should fetch new post for different day', async () => {
      const mockPost = { title: 'New Post', score: 200 };
      redditService.cachedPost = { title: 'Old Post', score: 100 };
      redditService.postCacheDate = '2023-01-01'; // Different day

      // Mock the getTopArcRaidersPost method
      redditService.getTopArcRaidersPost = jest.fn().mockResolvedValue(mockPost);

      const result = await redditService.getCachedRedditPost();

      expect(result).toBe(mockPost);
      expect(redditService.cachedPost).toBe(mockPost);
      expect(redditService.postCacheDate).toBe(new Date().toDateString());
    });

    test('should handle fetch error gracefully', async () => {
      redditService.cachedPost = null;
      redditService.postCacheDate = null;

      redditService.getTopArcRaidersPost = jest.fn().mockRejectedValue(new Error('API error'));

      const result = await redditService.getCachedRedditPost();

      expect(result).toBeNull();
    });
  });

  describe('getTopArcRaidersPost', () => {
    test('should return null when no access token', async () => {
      redditService.getAccessToken = jest.fn().mockResolvedValue(null);

      const result = await redditService.getTopArcRaidersPost();

      expect(result).toBeNull();
    });

    test('should fetch and process post successfully', async () => {
      const mockAccessToken = 'test-token';
      redditService.getAccessToken = jest.fn().mockResolvedValue(mockAccessToken);

      const mockResponse = {
        status: 200,
        data: {
          data: {
            children: [{
              data: {
                title: 'This is a valid test post with sufficient length',
                permalink: '/r/arcraiders/comments/test',
                subreddit: 'arcraiders',
                author: 'testuser',
                score: 100,
                num_comments: 50,
                over_18: false,
                spoiler: false,
                preview: {
                  images: [{
                    source: {
                      url: 'https://example.com/image.jpg'
                    }
                  }]
                }
              }
            }]
          }
        }
      };

      // Mock RetryUtil.execute to return the axios response
      RetryUtil.execute.mockImplementation(async (fn) => {
        return await fn();
      });

      axios.get.mockResolvedValue(mockResponse);

      const result = await redditService.getTopArcRaidersPost();

      expect(result).toBeDefined();
      expect(result.title).toBe('This is a valid test post with sufficient length');
      expect(result.score).toBe(100);
      expect(result.comments).toBe(50);
      expect(result.mediaUrl).toBe('https://example.com/image.jpg');
      expect(result.mediaType).toBe('image');
    });

    test('should handle no posts found', async () => {
      const mockAccessToken = 'test-token';
      redditService.getAccessToken = jest.fn().mockResolvedValue(mockAccessToken);

      const mockResponse = {
        status: 200,
        data: {
          data: {
            children: []
          }
        }
      };

      RetryUtil.execute.mockImplementation(async (fn) => {
        return await fn();
      });

      axios.get.mockResolvedValue(mockResponse);

      const result = await redditService.getTopArcRaidersPost();

      expect(result).toBeNull();
    });

    test('should handle invalid post data', async () => {
      const mockAccessToken = 'test-token';
      redditService.getAccessToken = jest.fn().mockResolvedValue(mockAccessToken);

      const mockResponse = {
        status: 200,
        data: {
          data: {
            children: [{
              data: {
                title: 'Short', // Too short
                over_18: false,
                spoiler: false
              }
            }]
          }
        }
      };

      RetryUtil.execute.mockImplementation(async (fn) => {
        return await fn();
      });

      axios.get.mockResolvedValue(mockResponse);

      const result = await redditService.getTopArcRaidersPost();

      expect(result).toBeNull();
    });

    test('should handle NSFW posts', async () => {
      const mockAccessToken = 'test-token';
      redditService.getAccessToken = jest.fn().mockResolvedValue(mockAccessToken);

      const mockResponse = {
        status: 200,
        data: {
          data: {
            children: [{
              data: {
                title: 'NSFW Test Post',
                over_18: true, // NSFW
                spoiler: false
              }
            }]
          }
        }
      };

      RetryUtil.execute.mockImplementation(async (fn) => {
        return await fn();
      });

      axios.get.mockResolvedValue(mockResponse);

      const result = await redditService.getTopArcRaidersPost();

      expect(result).toBeNull();
    });

    test('should handle spoiler posts', async () => {
      const mockAccessToken = 'test-token';
      redditService.getAccessToken = jest.fn().mockResolvedValue(mockAccessToken);

      const mockResponse = {
        status: 200,
        data: {
          data: {
            children: [{
              data: {
                title: 'Spoiler Test Post',
                over_18: false,
                spoiler: true // Spoiler
              }
            }]
          }
        }
      };

      RetryUtil.execute.mockImplementation(async (fn) => {
        return await fn();
      });

      axios.get.mockResolvedValue(mockResponse);

      const result = await redditService.getTopArcRaidersPost();

      expect(result).toBeNull();
    });

    test('should handle video posts', async () => {
      const mockAccessToken = 'test-token';
      redditService.getAccessToken = jest.fn().mockResolvedValue(mockAccessToken);

      const mockResponse = {
        status: 200,
        data: {
          data: {
            children: [{
              data: {
                title: 'Video Test Post',
                permalink: '/r/arcraiders/comments/test',
                subreddit: 'arcraiders',
                author: 'testuser',
                score: 100,
                num_comments: 50,
                over_18: false,
                spoiler: false,
                media: {
                  reddit_video: {
                    fallback_url: 'https://example.com/video.mp4'
                  }
                }
              }
            }]
          }
        }
      };

      RetryUtil.execute.mockImplementation(async (fn) => {
        return await fn();
      });

      axios.get.mockResolvedValue(mockResponse);

      const result = await redditService.getTopArcRaidersPost();

      expect(result).toBeDefined();
      expect(result.mediaUrl).toBe('https://example.com/video.mp4');
      expect(result.mediaType).toBe('video');
    });
  });

  describe('isValidPost', () => {
    test('should validate good post', () => {
      const postData = {
        title: 'This is a valid post title',
        over_18: false,
        spoiler: false
      };

      expect(redditService.isValidPost(postData)).toBe(true);
    });

    test('should reject NSFW posts', () => {
      const postData = {
        title: 'This is an NSFW post',
        over_18: true,
        spoiler: false
      };

      expect(redditService.isValidPost(postData)).toBe(false);
    });

    test('should reject spoiler posts', () => {
      const postData = {
        title: 'This is a spoiler post',
        over_18: false,
        spoiler: true
      };

      expect(redditService.isValidPost(postData)).toBe(false);
    });

    test('should reject posts with short titles', () => {
      const postData = {
        title: 'Short',
        over_18: false,
        spoiler: false
      };

      expect(redditService.isValidPost(postData)).toBe(false);
    });

    test('should reject posts with no title', () => {
      const postData = {
        title: '',
        over_18: false,
        spoiler: false
      };

      expect(redditService.isValidPost(postData)).toBe(false);
    });
  });

  describe('processPostData', () => {
    test('should process post data correctly', () => {
      const postData = {
        title: 'Test Post',
        permalink: '/r/arcraiders/comments/test',
        subreddit: 'arcraiders',
        author: 'testuser',
        score: 100,
        num_comments: 50,
        preview: {
          images: [{
            source: {
              url: 'https://example.com/image.jpg&amp;test=1'
            }
          }]
        }
      };

      const result = redditService.processPostData(postData);

      expect(result.title).toBe('Test Post');
      expect(result.url).toBe('https://reddit.com/r/arcraiders/comments/test');
      expect(result.subreddit).toBe('arcraiders');
      expect(result.author).toBe('testuser');
      expect(result.score).toBe(100);
      expect(result.comments).toBe(50);
      expect(result.mediaUrl).toBe('https://example.com/image.jpg&test=1');
      expect(result.mediaType).toBe('image');
    });

    test('should handle posts without media', () => {
      const postData = {
        title: 'Test Post',
        permalink: '/r/arcraiders/comments/test',
        subreddit: 'arcraiders',
        author: 'testuser',
        score: 100,
        num_comments: 50
      };

      const result = redditService.processPostData(postData);

      expect(result.mediaUrl).toBeNull();
      expect(result.mediaType).toBeNull();
    });

    test('should decode HTML entities in image URLs', () => {
      const postData = {
        title: 'Test Post',
        permalink: '/r/arcraiders/comments/test',
        subreddit: 'arcraiders',
        author: 'testuser',
        score: 100,
        num_comments: 50,
        preview: {
          images: [{
            source: {
              url: 'https://example.com/image.jpg&amp;test=1&lt;param&gt;'
            }
          }]
        }
      };

      const result = redditService.processPostData(postData);

      expect(result.mediaUrl).toBe('https://example.com/image.jpg&test=1<param>');
    });
  });

  describe('clearCache', () => {
    test('should clear all cached data', () => {
      redditService.cachedPost = { title: 'Test' };
      redditService.postCacheDate = '2023-01-01';
      redditService.accessToken = 'test-token';
      redditService.tokenExpiry = Date.now() + 30000;

      redditService.clearCache();

      expect(redditService.cachedPost).toBeNull();
      expect(redditService.postCacheDate).toBeNull();
      expect(redditService.accessToken).toBeNull();
      expect(redditService.tokenExpiry).toBeNull();
    });
  });

  describe('getStatus', () => {
    test('should return service status', () => {
      redditService.accessToken = 'test-token';
      redditService.tokenExpiry = Date.now() + 30000;
      redditService.cachedPost = { title: 'Test' };
      redditService.postCacheDate = '2023-01-01';

      const status = redditService.getStatus();

      expect(status).toHaveProperty('configured', true);
      expect(status).toHaveProperty('hasToken', true);
      expect(status).toHaveProperty('tokenExpired', false);
      expect(status).toHaveProperty('hasCachedPost', true);
      expect(status).toHaveProperty('cacheDate', '2023-01-01');
    });

    test('should return status for unconfigured service', () => {
      redditService.clientId = null;

      const status = redditService.getStatus();

      expect(status).toHaveProperty('configured', false);
      expect(status).toHaveProperty('hasToken', false);
      expect(status).toHaveProperty('tokenExpired', true);
      expect(status).toHaveProperty('hasCachedPost', false);
    });
  });
});
