/**
 * MessageService Unit Tests
 * Tests for countdown message creation and posting functionality
 */

const fs = require('fs');
const { EmbedBuilder } = require('discord.js');
const MessageService = require('../../src/services/MessageService');

// Mock dependencies
jest.mock('fs');
jest.mock('discord.js', () => ({
  EmbedBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    setThumbnail: jest.fn().mockReturnThis(),
    setFooter: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis(),
    setImage: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis()
  }))
}));

// Mock services
const mockEmojiService = {
  getEmojiPlacement: jest.fn()
};

const mockRedditService = {
  getCachedRedditPost: jest.fn()
};

describe('MessageService', () => {
  let messageService;
  let mockChannel;
  let mockClient;
  let mockConfigService;

  beforeEach(() => {
    messageService = new MessageService(mockEmojiService, mockRedditService);
    
    // Mock Discord objects
    mockChannel = {
      id: '123456789',
      send: jest.fn(),
      permissionsFor: jest.fn().mockReturnValue({
        has: jest.fn().mockReturnValue(true)
      })
    };

    mockClient = {
      user: { id: 'bot-user-id' },
      channels: {
        fetch: jest.fn().mockResolvedValue(mockChannel)
      }
    };

    mockConfigService = {
      getServerConfig: jest.fn(),
      removeServerConfig: jest.fn()
    };

    jest.clearAllMocks();
  });

  describe('getNextSocialMessage', () => {
    test('should read and delete social message file', () => {
      const testMessage = 'Test social message';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(testMessage);
      fs.unlinkSync.mockImplementation(() => {});

      const result = messageService.getNextSocialMessage();

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(result).toBe(testMessage);
    });

    test('should return null when file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = messageService.getNextSocialMessage();

      expect(result).toBeNull();
      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    test('should handle file read errors gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = messageService.getNextSocialMessage();

      expect(result).toBeNull();
    });
  });

  describe('createCountdownEmbed', () => {
    const mockReleaseDate = new Date('2025-10-30T00:00:00Z');

    beforeEach(() => {
      mockEmojiService.getEmojiPlacement.mockReturnValue({
        title: '🎮 🎯'
      });
      mockRedditService.getCachedRedditPost.mockResolvedValue(null);
    });

    test('should create basic countdown embed', async () => {
      const embed = await messageService.createCountdownEmbed(30, mockReleaseDate);

      expect(EmbedBuilder).toHaveBeenCalled();
      expect(mockEmojiService.getEmojiPlacement).toHaveBeenCalledWith(30);
    });

    test('should create launch day embed for 0 days', async () => {
      const embed = await messageService.createCountdownEmbed(0, mockReleaseDate);

      expect(EmbedBuilder).toHaveBeenCalled();
      expect(mockEmojiService.getEmojiPlacement).toHaveBeenCalledWith(0);
    });

    test('should create special embed for 1 day remaining', async () => {
      const embed = await messageService.createCountdownEmbed(1, mockReleaseDate);

      expect(EmbedBuilder).toHaveBeenCalled();
    });

    test('should create special embed for final week (≤7 days)', async () => {
      const embed = await messageService.createCountdownEmbed(5, mockReleaseDate);

      expect(EmbedBuilder).toHaveBeenCalled();
    });

    test('should include Reddit post when available', async () => {
      const mockRedditPost = {
        title: 'Test Reddit Post',
        url: 'https://reddit.com/test',
        score: 100,
        comments: 50,
        mediaUrl: 'https://example.com/image.jpg',
        mediaType: 'image'
      };

      mockRedditService.getCachedRedditPost.mockResolvedValue(mockRedditPost);

      const embed = await messageService.createCountdownEmbed(30, mockReleaseDate);

      expect(mockRedditService.getCachedRedditPost).toHaveBeenCalled();
    });

    test('should handle Reddit service errors gracefully', async () => {
      mockRedditService.getCachedRedditPost.mockRejectedValue(new Error('Reddit API error'));

      const embed = await messageService.createCountdownEmbed(30, mockReleaseDate);

      expect(embed).toBeDefined();
    });

    test('should use social message when available', async () => {
      const testMessage = 'Custom social message';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(testMessage);
      fs.unlinkSync.mockImplementation(() => {});

      const embed = await messageService.createCountdownEmbed(30, mockReleaseDate);

      expect(fs.existsSync).toHaveBeenCalled();
    });
  });

  describe('createTestCountdownEmbed', () => {
    const mockReleaseDate = new Date('2025-10-30T00:00:00Z');

    beforeEach(() => {
      mockEmojiService.getEmojiPlacement.mockReturnValue({
        title: '🎮 🎯'
      });
      mockRedditService.getCachedRedditPost.mockResolvedValue(null);
    });

    test('should create test embed', async () => {
      const embed = await messageService.createTestCountdownEmbed(30, mockReleaseDate);

      expect(EmbedBuilder).toHaveBeenCalled();
      expect(mockEmojiService.getEmojiPlacement).toHaveBeenCalledWith(30);
    });

    test('should handle long titles with warning', async () => {
      const longTitle = 'a'.repeat(300);
      mockEmojiService.getEmojiPlacement.mockReturnValue({
        title: longTitle
      });

      const embed = await messageService.createTestCountdownEmbed(30, mockReleaseDate);

      expect(EmbedBuilder).toHaveBeenCalled();
    });

    test('should create special embeds for different day counts', async () => {
      // Test 0 days
      await messageService.createTestCountdownEmbed(0, mockReleaseDate);
      expect(EmbedBuilder).toHaveBeenCalled();

      // Test 1 day
      await messageService.createTestCountdownEmbed(1, mockReleaseDate);
      expect(EmbedBuilder).toHaveBeenCalled();

      // Test final week
      await messageService.createTestCountdownEmbed(5, mockReleaseDate);
      expect(EmbedBuilder).toHaveBeenCalled();
    });
  });

  describe('postCountdownMessage', () => {
    const mockReleaseDate = new Date('2025-10-30T00:00:00Z');

    beforeEach(() => {
      mockConfigService.getServerConfig.mockReturnValue({
        channelId: '123456789',
        channelName: 'general',
        postTime: '12:00'
      });
    });

    test('should post countdown message successfully', async () => {
      mockChannel.send.mockResolvedValue({ id: 'message-id' });

      await messageService.postCountdownMessage('guild-id', mockClient, mockConfigService, mockReleaseDate);

      expect(mockConfigService.getServerConfig).toHaveBeenCalledWith('guild-id');
      expect(mockClient.channels.fetch).toHaveBeenCalledWith('123456789');
      expect(mockChannel.send).toHaveBeenCalled();
    });

    test('should skip posting when no channel configured', async () => {
      mockConfigService.getServerConfig.mockReturnValue({
        channelId: null,
        channelName: null,
        postTime: '12:00'
      });

      await messageService.postCountdownMessage('guild-id', mockClient, mockConfigService, mockReleaseDate);

      expect(mockClient.channels.fetch).not.toHaveBeenCalled();
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    test('should skip posting when game has launched', async () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');

      await messageService.postCountdownMessage('guild-id', mockClient, mockConfigService, pastDate);

      expect(mockClient.channels.fetch).not.toHaveBeenCalled();
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    test('should handle channel not found error', async () => {
      mockClient.channels.fetch.mockRejectedValue(new Error('Channel not found'));

      await messageService.postCountdownMessage('guild-id', mockClient, mockConfigService, mockReleaseDate);

      expect(mockConfigService.removeServerConfig).toHaveBeenCalledWith('guild-id');
    });

    test('should handle permission denied error', async () => {
      mockChannel.permissionsFor.mockReturnValue({
        has: jest.fn().mockReturnValue(false)
      });

      await messageService.postCountdownMessage('guild-id', mockClient, mockConfigService, mockReleaseDate);

      // Permission denied errors don't trigger config removal, only access errors do
      expect(mockConfigService.removeServerConfig).not.toHaveBeenCalled();
    });

    test('should handle missing access error', async () => {
      mockChannel.send.mockRejectedValue(new Error('Missing Access'));

      await messageService.postCountdownMessage('guild-id', mockClient, mockConfigService, mockReleaseDate);

      expect(mockConfigService.removeServerConfig).toHaveBeenCalledWith('guild-id');
    });
  });

  describe('postTestCountdownMessage', () => {
    const mockReleaseDate = new Date('2025-10-30T00:00:00Z');

    beforeEach(() => {
      mockConfigService.getServerConfig.mockReturnValue({
        channelId: '123456789',
        channelName: 'general',
        postTime: '12:00'
      });
      mockChannel.send.mockResolvedValue({ id: 'message-id' });
    });

    test('should post test message successfully', async () => {
      await messageService.postTestCountdownMessage('guild-id', mockClient, mockConfigService, mockReleaseDate);

      expect(mockConfigService.getServerConfig).toHaveBeenCalledWith('guild-id');
      expect(mockClient.channels.fetch).toHaveBeenCalledWith('123456789');
      expect(mockChannel.send).toHaveBeenCalled();
    });

    test('should skip posting when no channel configured', async () => {
      mockConfigService.getServerConfig.mockReturnValue({
        channelId: null,
        channelName: null,
        postTime: '12:00'
      });

      await messageService.postTestCountdownMessage('guild-id', mockClient, mockConfigService, mockReleaseDate);

      expect(mockClient.channels.fetch).not.toHaveBeenCalled();
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    test('should override days remaining for test phases', async () => {
      await messageService.postTestCountdownMessage('guild-id', mockClient, mockConfigService, mockReleaseDate, 'early');

      expect(mockEmojiService.getEmojiPlacement).toHaveBeenCalledWith(60); // Overridden to 60 days
    });

    test('should handle all test phases', async () => {
      const testPhases = ['early', 'mid', 'final_month', 'final_week', 'final_days'];
      
      for (const phase of testPhases) {
        await messageService.postTestCountdownMessage('guild-id', mockClient, mockConfigService, mockReleaseDate, phase);
        expect(mockChannel.send).toHaveBeenCalled();
      }
    });

    test('should throw error on posting failure', async () => {
      mockChannel.send.mockRejectedValue(new Error('Send failed'));

      await expect(
        messageService.postTestCountdownMessage('guild-id', mockClient, mockConfigService, mockReleaseDate)
      ).rejects.toThrow('Send failed');
    });
  });

  describe('postPermissionError', () => {
    test('should post error message to accessible channel', async () => {
      const mockChannel = {
        id: 'channel-id',
        type: 0,
        permissionsFor: jest.fn().mockReturnValue({
          has: jest.fn().mockReturnValue(true)
        }),
        send: jest.fn().mockResolvedValue({ id: 'message-id' })
      };

      const mockGuild = {
        id: 'guild-id',
        name: 'Test Guild',
        channels: {
          cache: {
            find: jest.fn().mockReturnValue(mockChannel)
          }
        },
        members: {
          me: { id: 'bot-user-id' }
        }
      };

      mockClient.guilds = {
        fetch: jest.fn().mockResolvedValue(mockGuild)
      };

      await messageService.postPermissionError('guild-id', mockClient, 'Test error message');

      expect(mockClient.guilds.fetch).toHaveBeenCalledWith('guild-id');
      expect(mockChannel.send).toHaveBeenCalled();
    });

    test('should handle guild not found error', async () => {
      mockClient.guilds = {
        fetch: jest.fn().mockRejectedValue(new Error('Guild not found'))
      };

      await expect(
        messageService.postPermissionError('guild-id', mockClient, 'Test error message')
      ).rejects.toThrow('Guild not found');
    });

    test('should handle no accessible channel error', async () => {
      const mockGuild = {
        id: 'guild-id',
        name: 'Test Guild',
        channels: {
          cache: {
            find: jest.fn().mockReturnValue(null) // No accessible channels
          }
        },
        members: {
          me: { id: 'bot-user-id' }
        }
      };

      mockClient.guilds = {
        fetch: jest.fn().mockResolvedValue(mockGuild)
      };

      await expect(
        messageService.postPermissionError('guild-id', mockClient, 'Test error message')
      ).rejects.toThrow('No accessible channel found for error message');
    });
  });
});
