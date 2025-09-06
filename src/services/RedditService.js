/**
 * Reddit Service
 * Handles Reddit API integration for fetching top posts
 */

const axios = require('axios');
const { CONFIG } = require('../config/constants');
const Logger = require('../utils/logger');
const RetryUtil = require('../utils/retry');

class RedditService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.cachedPost = null;
    this.postCacheDate = null;
    
    // Reddit API credentials
    this.clientId = process.env.REDDIT_CLIENT_ID;
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET;
    this.username = process.env.REDDIT_USERNAME;
    this.password = process.env.REDDIT_PASSWORD;
  }

  /**
   * Check if Reddit credentials are configured
   * @returns {boolean} - True if credentials are available
   */
  isConfigured() {
    return !!(this.clientId && this.clientSecret && this.username && this.password);
  }

  /**
   * Get Reddit OAuth access token
   * @returns {Promise<string|null>} - Access token or null if failed
   */
  async getAccessToken() {
    try {
      // Check if we have a valid cached token
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      if (!this.isConfigured()) {
        Logger.warn('Reddit credentials not configured, skipping Reddit integration');
        return null;
      }
      
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await RetryUtil.httpRequest(
        () => axios.post(CONFIG.REDDIT.TOKEN_ENDPOINT, 
          'grant_type=password&username=' + encodeURIComponent(this.username) + 
          '&password=' + encodeURIComponent(this.password),
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'User-Agent': CONFIG.REDDIT.USER_AGENT,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: CONFIG.REDDIT.TIMEOUT
          }
        ),
        {
          operation: 'Reddit token request'
        }
      );

      // Check for errors in the response
      if (response.data.error) {
        Logger.error('Reddit API returned error in token response', null, response.data);
        return null;
      }
      
      this.accessToken = response.data.access_token;
      // Set expiry to 45 minutes (tokens last 1 hour, but we refresh early)
      this.tokenExpiry = Date.now() + CONFIG.REDDIT.TOKEN_CACHE_DURATION;
      
      Logger.info('Reddit access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      Logger.error('Error getting Reddit access token', error);
      return null;
    }
  }

  /**
   * Get cached Reddit post (fetches once per day)
   * @returns {Promise<Object|null>} - Cached Reddit post or null
   */
  async getCachedRedditPost() {
    try {
      const today = new Date().toDateString();
      
      // Check if we have a valid cached post for today
      if (this.cachedPost && this.postCacheDate === today) {
        Logger.debug('Using cached Reddit post for today');
        return this.cachedPost;
      }
      
      // Fetch new post and cache it
      this.cachedPost = await this.getTopArcRaidersPost();
      this.postCacheDate = today;
      
      if (this.cachedPost) {
        Logger.info('New Reddit post cached for today');
      }
      
      return this.cachedPost;
    } catch (error) {
      Logger.error('Error getting cached Reddit post', error);
      return null;
    }
  }

  /**
   * Fetch top Arc Raiders Reddit post with media
   * @param {number} retries - Number of retry attempts
   * @returns {Promise<Object|null>} - Reddit post data or null
   */
  async getTopArcRaidersPost(retries = CONFIG.REDDIT.RETRY_ATTEMPTS) {
    // Get OAuth access token
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return null;
    }

    return RetryUtil.execute(
      async () => {
        const startTime = Date.now();
        
        // Fetch top post of the day from Arc Raiders subreddit
        const response = await axios.get(
          `${CONFIG.REDDIT.API_BASE}/r/${CONFIG.REDDIT.SUBREDDIT}/top.json?limit=1&t=day`,
          {
            timeout: CONFIG.REDDIT.TIMEOUT,
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'User-Agent': CONFIG.REDDIT.USER_AGENT
            }
          }
        );
        
        const duration = Date.now() - startTime;
        Logger.apiRequest('Reddit', '/r/arcraiders/top.json', 'GET', response.status, duration);
        
        const posts = response.data.data.children;
        
        if (posts.length === 0) {
          Logger.warn('No posts found in r/arcraiders');
          return null;
        }
        
        const postData = posts[0].data;
        
        // Validate post content
        if (!this.isValidPost(postData)) {
          Logger.warn('Top post does not meet criteria, skipping');
          return null;
        }
        
        // Process post data
        const processedPost = this.processPostData(postData);
        Logger.info('Successfully fetched Reddit post', {
          title: processedPost.title,
          score: processedPost.score,
          hasMedia: !!processedPost.mediaUrl
        });
        
        return processedPost;
      },
      {
        maxRetries: retries,
        delays: CONFIG.REDDIT.RETRY_DELAYS,
        shouldRetry: RetryUtil.shouldRetryRedditError,
        operation: 'Reddit post fetch'
      }
    );
  }

  /**
   * Validate if a Reddit post meets our criteria
   * @param {Object} postData - Reddit post data
   * @returns {boolean} - True if post is valid
   */
  isValidPost(postData) {
    // Filter out NSFW or inappropriate content
    if (postData.over_18 || postData.spoiler) {
      return false;
    }
    
    // Filter out posts with no title or very short titles
    if (!postData.title || postData.title.length < 10) {
      return false;
    }

    return true;
  }

  /**
   * Process Reddit post data into our format
   * @param {Object} postData - Raw Reddit post data
   * @returns {Object} - Processed post data
   */
  processPostData(postData) {
    // Check if post has media (image or video)
    const hasImage = postData.preview && 
                   postData.preview.images && 
                   postData.preview.images.length > 0 &&
                   postData.preview.images[0].source &&
                   postData.preview.images[0].source.url;
    
    const hasVideo = postData.media && 
                   postData.media.reddit_video && 
                   postData.media.reddit_video.fallback_url;
    
    // Get media URL (image or video)
    let mediaUrl = null;
    let mediaType = null;
    
    if (hasImage) {
      mediaUrl = postData.preview.images[0].source.url
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'");
      mediaType = 'image';
    } else if (hasVideo) {
      mediaUrl = postData.media.reddit_video.fallback_url;
      mediaType = 'video';
    }
    
    return {
      title: postData.title,
      url: `https://reddit.com${postData.permalink}`,
      subreddit: postData.subreddit,
      author: postData.author,
      score: postData.score,
      comments: postData.num_comments,
      mediaUrl: mediaUrl,
      mediaType: mediaType
    };
  }

  /**
   * Clear cached data (useful for testing or manual refresh)
   */
  clearCache() {
    this.cachedPost = null;
    this.postCacheDate = null;
    this.accessToken = null;
    this.tokenExpiry = null;
    Logger.info('Reddit service cache cleared');
  }

  /**
   * Get service status
   * @returns {Object} - Service status information
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      hasToken: !!this.accessToken,
      tokenExpired: this.tokenExpiry ? Date.now() >= this.tokenExpiry : true,
      hasCachedPost: !!this.cachedPost,
      cacheDate: this.postCacheDate
    };
  }
}

module.exports = RedditService;
