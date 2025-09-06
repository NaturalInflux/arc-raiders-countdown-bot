/**
 * Message Service
 * Handles countdown message creation and posting
 */

const { EmbedBuilder } = require('discord.js');
const { CONFIG } = require('../config/constants');
const Logger = require('../utils/logger');
const RetryUtil = require('../utils/retry');
const TimeUtil = require('../utils/time');

class MessageService {
  constructor(emojiService, redditService) {
    this.emojiService = emojiService;
    this.redditService = redditService;
  }

  /**
   * Get next social message (consumes it after use)
   * @returns {string|null} - Social message or null
   */
  getNextSocialMessage() {
    const fs = require('fs');
    const path = require('path');
    const socialMessageFile = path.join(process.cwd(), CONFIG.FILES.SOCIAL_MESSAGE_FILE);
    
    try {
      if (fs.existsSync(socialMessageFile)) {
        const message = fs.readFileSync(socialMessageFile, 'utf8').trim();
        // Delete the file after reading (one-time use)
        fs.unlinkSync(socialMessageFile);
        Logger.info('Social message consumed and file deleted');
        return message;
      }
    } catch (error) {
      Logger.error('Error reading social message', error);
    }
    return null;
  }

  /**
   * Create countdown embed with Reddit post
   * @param {number} daysRemaining - Days remaining until release
   * @param {Date} releaseDate - Release date
   * @returns {Promise<EmbedBuilder>} - Discord embed
   */
  async createCountdownEmbed(daysRemaining, releaseDate) {
    try {
      const emojiPlacement = this.emojiService.getEmojiPlacement(daysRemaining);
      
      // Get social message for today to use as description
      const socialMessage = this.getNextSocialMessage();
      
      const embed = new EmbedBuilder()
        .setTitle(`**${daysRemaining} DAYS** until Arc Raiders! ${emojiPlacement.title}`)
        .setDescription(socialMessage || `Arc Raiders launches on October 30, 2025`)
        .setColor(0x5294E2)
        .setThumbnail(CONFIG.GAME.STEAM_THUMBNAIL_URL)
        .setFooter({ text: `Arc Raiders - ${CONFIG.GAME.STUDIO}` })
        .setTimestamp();

      // Handle special cases
      if (daysRemaining === 0) {
        embed.setTitle('🎉 **ARC RAIDERS IS NOW LIVE!** 🎉');
        embed.setDescription(socialMessage || 'Arc Raiders has launched on October 30, 2025!');
        embed.setColor(0xDC322F);
      } else if (daysRemaining === 1) {
        embed.setTitle('⚠️⚠️⚠️ **1 DAY** until Arc Raiders!');
        embed.setDescription(socialMessage || 'Arc Raiders launches TOMORROW - October 30, 2025!');
        embed.setColor(0xF68B3E);
      } else if (daysRemaining <= 7) {
        embed.setTitle(`⚠️ **${daysRemaining} DAYS** until Arc Raiders! ${emojiPlacement.title}`);
        embed.setDescription(socialMessage || `Only ${daysRemaining} days left until October 30, 2025!`);
        embed.setColor(0xF68B3E);
      }

      // Try to fetch the top Reddit post with image (cached daily)
      const redditPost = await this.redditService.getCachedRedditPost();
      if (redditPost) {
        embed.addFields({
          name: 'Top r/arcraiders Post Today',
          value: `[${redditPost.title}](${redditPost.url})\n⬆️ ${redditPost.score} upvotes • 💬 ${redditPost.comments} comments`,
          inline: false
        });
        
        // Use the Reddit post media (image or video) as the main embed media if available
        if (redditPost.mediaUrl && redditPost.mediaType) {
          if (redditPost.mediaType === 'video') {
            embed.setImage(redditPost.mediaUrl); // Discord shows video thumbnails
          } else if (redditPost.mediaType === 'image') {
            embed.setImage(redditPost.mediaUrl);
          }
        }
      }

      return embed;
    } catch (error) {
      Logger.error('Error creating countdown embed', error);
      // Return a basic embed as fallback
      return new EmbedBuilder()
        .setTitle('**ERROR** - Countdown message failed')
        .setDescription('Unable to create countdown message. Please try again.')
        .setColor(0xFF0000)
        .setTimestamp();
    }
  }

  /**
   * Create test countdown embed
   * @param {number} daysRemaining - Days remaining (can be overridden for testing)
   * @param {Date} releaseDate - Release date
   * @returns {Promise<EmbedBuilder>} - Discord embed
   */
  async createTestCountdownEmbed(daysRemaining, releaseDate) {
    try {
      const emojiPlacement = this.emojiService.getEmojiPlacement(daysRemaining);
      
      const title = `**${daysRemaining} DAYS** until Arc Raiders! ${emojiPlacement.title}`;
      
      // Check title length and warn if close to limit
      if (title.length > 200) {
        Logger.warn(`Title is getting long (${title.length} chars): ${title}`);
      }
      
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x5294E2)
        .setThumbnail(CONFIG.GAME.STEAM_THUMBNAIL_URL)
        .setFooter({ text: `Arc Raiders - ${CONFIG.GAME.STUDIO}` })
        .setTimestamp();

      // Handle special cases
      if (daysRemaining === 0) {
        embed.setTitle('🎉 **ARC RAIDERS IS NOW LIVE!** 🎉');
        embed.setDescription('Arc Raiders has launched on October 30, 2025!');
        embed.setColor(0xDC322F);
      } else if (daysRemaining === 1) {
        embed.setTitle('⚠️⚠️⚠️ **1 DAY** until Arc Raiders!');
        embed.setDescription('Arc Raiders launches TOMORROW - October 30, 2025!');
        embed.setColor(0xF68B3E);
      } else if (daysRemaining <= 7) {
        embed.setTitle(`⚠️ **${daysRemaining} DAYS** until Arc Raiders! ${emojiPlacement.title}`);
        embed.setDescription(`Only ${daysRemaining} days left until October 30, 2025!`);
        embed.setColor(0xF68B3E);
      }

      // Try to fetch the top Reddit post with image (cached daily)
      const redditPost = await this.redditService.getCachedRedditPost();
      if (redditPost) {
        embed.addFields({
          name: 'Top r/arcraiders Post Today',
          value: `[${redditPost.title}](${redditPost.url})\n⬆️ ${redditPost.score} upvotes • 💬 ${redditPost.comments} comments`,
          inline: false
        });
        
        // Use the Reddit post media (image or video) as the main embed media if available
        if (redditPost.mediaUrl && redditPost.mediaType) {
          if (redditPost.mediaType === 'video') {
            embed.setImage(redditPost.mediaUrl); // Discord shows video thumbnails
          } else if (redditPost.mediaType === 'image') {
            embed.setImage(redditPost.mediaUrl);
          }
        }
      }

      return embed;
    } catch (error) {
      Logger.error('Error creating test countdown embed', error);
      // Return a basic embed as fallback
      return new EmbedBuilder()
        .setTitle('**ERROR** - Test countdown message failed')
        .setDescription('Unable to create countdown message. Please try again.')
        .setColor(0xFF0000)
        .setTimestamp();
    }
  }

  /**
   * Post countdown message to a server
   * @param {string} guildId - Discord guild ID
   * @param {Object} client - Discord client
   * @param {Object} configService - Configuration service
   * @param {Date} releaseDate - Release date
   */
  async postCountdownMessage(guildId, client, configService, releaseDate) {
    try {
      const serverConfig = configService.getServerConfig(guildId);
      const channelId = serverConfig.channelId;
      
      if (!channelId) {
        Logger.warn(`No channel configured for guild: ${guildId}`);
        return;
      }
      
      const daysRemaining = TimeUtil.getDaysRemaining(releaseDate);
      
      // Check if the game has already launched - if so, stop posting
      if (TimeUtil.hasDatePassed(releaseDate)) {
        Logger.info(`Game has launched! Stopping countdown messages for guild: ${guildId}`);
        return;
      }
      
      Logger.info(`Attempting to post countdown message (${daysRemaining} days remaining)...`);

      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        throw new Error(`Channel with ID ${channelId} not found or bot doesn't have access`);
      }

      // Check if bot has permission to send messages in this channel
      if (!channel.permissionsFor(client.user).has('SendMessages')) {
        throw new Error(`Bot doesn't have permission to send messages in channel ${channelId}`);
      }

      // Create and send the countdown message
      const embed = await this.createCountdownEmbed(daysRemaining, releaseDate);
      await RetryUtil.sendDiscordMessage(channel, { embeds: [embed] });
      
      Logger.success(`Countdown message posted successfully! Days remaining: ${daysRemaining}`);
    } catch (error) {
      Logger.error(`Error posting countdown message for guild ${guildId}`, error);
      
      // Try to post error message to server admins
      try {
        await this.postPermissionError(guildId, client, error.message);
      } catch (adminError) {
        Logger.error(`Failed to notify admins for guild ${guildId}`, adminError);
      }
      
      // Check if it's a permission error and remove server config if bot was kicked
      if (error.message.includes('Missing Access') || error.message.includes('not found')) {
        Logger.info(`Removing server configuration due to access error: ${guildId}`);
        configService.removeServerConfig(guildId);
      }
    }
  }

  /**
   * Post test countdown message
   * @param {string} guildId - Discord guild ID
   * @param {Object} client - Discord client
   * @param {Object} configService - Configuration service
   * @param {Date} releaseDate - Release date
   * @param {string} testPhase - Test phase to use (optional)
   */
  async postTestCountdownMessage(guildId, client, configService, releaseDate, testPhase = null) {
    try {
      const serverConfig = configService.getServerConfig(guildId);
      const channelId = serverConfig.channelId;
      
      if (!channelId) {
        return;
      }
      
      let daysRemaining = TimeUtil.getDaysRemaining(releaseDate);
      
      // Override days remaining for testing specific phases
      if (testPhase) {
        switch (testPhase) {
          case 'early':
            daysRemaining = 60; // Early days
            break;
          case 'mid':
            daysRemaining = 40; // Mid countdown
            break;
          case 'final_month':
            daysRemaining = 20; // Final month
            break;
          case 'final_week':
            daysRemaining = 10; // Final week
            break;
          case 'final_days':
            daysRemaining = 3; // Final days
            break;
          default:
            // Use real days remaining
            break;
        }
      }

      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        throw new Error(`Channel with ID ${channelId} not found or bot doesn't have access`);
      }

      // Check if bot has permission to send messages in this channel
      if (!channel.permissionsFor(client.user).has('SendMessages')) {
        throw new Error(`Bot doesn't have permission to send messages in channel ${channelId}`);
      }

      // Post single test message
      const embed = await this.createTestCountdownEmbed(daysRemaining, releaseDate);
      await RetryUtil.sendDiscordMessage(channel, { embeds: [embed] });
      
      Logger.info(`Test countdown message posted for guild ${guildId}`);
    } catch (error) {
      Logger.error(`Error posting test countdown message for guild ${guildId}`, error);
      throw error;
    }
  }

  /**
   * Post permission error message to server admins
   * @param {string} guildId - Discord guild ID
   * @param {Object} client - Discord client
   * @param {string} errorMessage - Error message to display
   */
  async postPermissionError(guildId, client, errorMessage) {
    try {
      const guild = await client.guilds.fetch(guildId);
      if (!guild) {
        throw new Error('Guild not found');
      }

      // Find a channel where bot can send messages and admins can see
      const channel = guild.channels.cache.find(ch => 
        ch.type === 0 && // Text channel
        ch.permissionsFor(guild.members.me).has('SendMessages') &&
        ch.permissionsFor(guild.members.me).has('EmbedLinks')
      );

      if (!channel) {
        throw new Error('No accessible channel found for error message');
      }

      const errorEmbed = new EmbedBuilder()
        .setTitle('⚠️ Arc Raiders Countdown Bot - Configuration Issue')
        .setDescription(`I'm having trouble posting countdown messages in the configured channel.\n\n**Error:** ${errorMessage}\n\n**Solutions:**\n• Check if I have permission to send messages in the channel\n• Verify the channel still exists\n• Re-run \`/countdown-setup\` to reconfigure\n• Make sure I haven't been removed from the server`)
        .setColor(0xFF6B6B)
        .setTimestamp()
        .setFooter({ text: 'This message will stop appearing once the issue is resolved' });

      await RetryUtil.sendDiscordMessage(channel, { embeds: [errorEmbed] });
      Logger.info(`Posted permission error message to guild: ${guild.name} (${guildId})`);
    } catch (error) {
      Logger.error(`Failed to post permission error message for guild ${guildId}`, error);
      throw error;
    }
  }
}

module.exports = MessageService;
