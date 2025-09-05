const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

// Configuration from environment variables with fallbacks
const config = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    CHANNEL_ID: process.env.CHANNEL_ID,
    RELEASE_DATE: process.env.RELEASE_DATE || '2025-10-30T00:00:00Z',
    POST_SCHEDULE: process.env.POST_SCHEDULE || '0 9 * * *',
    POST_TIMEZONE: process.env.POST_TIMEZONE || 'UTC',
    REDDIT_SUBREDDIT: process.env.REDDIT_SUBREDDIT || 'arcraiders',
    REDDIT_POST_LIMIT: parseInt(process.env.REDDIT_POST_LIMIT) || 1,
    REDDIT_MAX_TEXT_LENGTH: parseInt(process.env.REDDIT_MAX_TEXT_LENGTH) || 500,
    REDDIT_MIN_TITLE_LENGTH: parseInt(process.env.REDDIT_MIN_TITLE_LENGTH) || 10,
    REDDIT_USER_AGENT: process.env.REDDIT_USER_AGENT || 'ArcRaidersCountdownBot/1.0.0',
    API_TIMEOUT: parseInt(process.env.API_TIMEOUT) || 10000,
    API_RETRY_ATTEMPTS: parseInt(process.env.API_RETRY_ATTEMPTS) || 3,
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

// Validate configuration
function validateConfig() {
    const errors = [];
    
    if (!config.DISCORD_TOKEN || config.DISCORD_TOKEN === 'your_bot_token_here') {
        errors.push('DISCORD_TOKEN is not configured');
    }
    
    if (!config.CHANNEL_ID || config.CHANNEL_ID === 'your_channel_id_here') {
        errors.push('CHANNEL_ID is not configured');
    } else if (!/^\d{17,19}$/.test(config.CHANNEL_ID)) {
        errors.push('CHANNEL_ID must be a valid Discord channel ID (17-19 digits)');
    }
    
    if (errors.length > 0) {
        console.error('❌ Configuration errors:');
        errors.forEach(error => console.error(`  - ${error}`));
        console.error('\nPlease check your config.js file and ensure all values are properly set.');
        process.exit(1);
    }
    
    console.log('✅ Configuration validated successfully');
}

// Validate config on startup
validateConfig();

// Create a new client instance with minimal intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// Arc Raiders release date: October 30, 2025 (configurable)
const RELEASE_DATE = new Date(config.RELEASE_DATE || '2025-10-30T00:00:00Z');

// Function to calculate days remaining
function getDaysRemaining() {
    const now = new Date();
    const timeDiff = RELEASE_DATE.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return Math.max(0, daysRemaining);
}

// Function to fetch top Arc Raiders Reddit post with image
async function getTopArcRaidersPostWithImage(retries = config.API_RETRY_ATTEMPTS) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Fetch top post of the day from configured subreddit
            const response = await axios.get(`https://www.reddit.com/r/${config.REDDIT_SUBREDDIT}/top.json?limit=1&t=day`, {
                timeout: config.API_TIMEOUT,
                headers: {
                    'User-Agent': config.REDDIT_USER_AGENT
                }
            });
            
            const posts = response.data.data.children;
            
            if (posts.length === 0) {
                console.log(`No posts found in r/${config.REDDIT_SUBREDDIT}`);
                return null;
            }
            
            const postData = posts[0].data;
            
            // Check if post has an image
            const hasImage = postData.preview && 
                           postData.preview.images && 
                           postData.preview.images.length > 0 &&
                           postData.preview.images[0].source &&
                           postData.preview.images[0].source.url;
            
            if (!hasImage) {
                console.log('Top post of the day does not have an image, skipping Reddit post');
                return null;
            }
            
            // Filter out NSFW or inappropriate content
            if (postData.over_18 || postData.spoiler) {
                console.log('Top post of the day is NSFW or spoiler, skipping Reddit post');
                return null;
            }
            
            // Filter out posts with no title or very short titles
            if (!postData.title || postData.title.length < config.REDDIT_MIN_TITLE_LENGTH) {
                console.log('Top post of the day has invalid title, skipping Reddit post');
                return null;
            }
            
            // Get the image URL (un-escape Reddit's HTML entities)
            const imageUrl = postData.preview.images[0].source.url
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#x27;/g, "'");
            
            return {
                title: postData.title,
                url: `https://reddit.com${postData.permalink}`,
                subreddit: postData.subreddit,
                author: postData.author,
                score: postData.score,
                comments: postData.num_comments,
                imageUrl: imageUrl
            };
        } catch (error) {
            console.error(`Reddit API attempt ${attempt}/${retries} failed:`, error.message);
            
            if (attempt === retries) {
                console.error('All Reddit API attempts failed, skipping Reddit post');
                return null;
            }
            
            // Wait before retrying (exponential backoff)
            const delay = 1000 * Math.pow(2, attempt - 1);
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Function to create countdown embed with Arc Raiders Reddit post
async function createCountdownEmbed() {
    const daysRemaining = getDaysRemaining();
    
    const embed = new EmbedBuilder()
        .setTitle('🎮 Arc Raiders Countdown')
        .setDescription(`**${daysRemaining} days** until Arc Raiders launches!`)
        .setColor(0x00ff00)
        .setThumbnail('https://cdn.akamai.steamstatic.com/steam/apps/2389730/header.jpg')
        .addFields(
            { name: 'Release Date', value: 'October 30, 2025', inline: true },
            { name: 'Status', value: daysRemaining > 0 ? 'Coming Soon' : 'Released!', inline: true }
        )
        .setFooter({ text: 'Arc Raiders - Embark Studios' })
        .setTimestamp();

    if (daysRemaining === 0) {
        embed.setDescription('🎉 **Arc Raiders is now LIVE!** 🎉');
        embed.setColor(0xff0000);
    } else if (daysRemaining === 1) {
        embed.setDescription('🚀 **Arc Raiders launches TOMORROW!** 🚀');
        embed.setColor(0xffa500);
    } else if (daysRemaining <= 7) {
        embed.setDescription(`🔥 **Only ${daysRemaining} days left!** 🔥`);
        embed.setColor(0xff4500);
    }

    // Try to fetch the top Reddit post with image
    const redditPost = await getTopArcRaidersPostWithImage();
    if (redditPost) {
        embed.addFields({
            name: `🔥 Top r/${config.REDDIT_SUBREDDIT} Post Today`,
            value: `[${redditPost.title}](${redditPost.url})\n⬆️ ${redditPost.score} upvotes • 💬 ${redditPost.comments} comments`,
            inline: false
        });
        
        // Use the Reddit post image as the main embed image
        embed.setImage(redditPost.imageUrl);
    }

    return embed;
}

// Function to post countdown message
async function postCountdownMessage() {
    try {
        const channelId = config.CHANNEL_ID;
        const daysRemaining = getDaysRemaining();
        
        console.log(`📅 Attempting to post countdown message (${daysRemaining} days remaining)...`);

        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            throw new Error(`Channel with ID ${channelId} not found or bot doesn't have access`);
        }

        // Check if bot has permission to send messages in this channel
        if (!channel.permissionsFor(client.user).has('SendMessages')) {
            throw new Error(`Bot doesn't have permission to send messages in channel ${channelId}`);
        }

        const embed = await createCountdownEmbed();
        await channel.send({ embeds: [embed] });
        
        console.log(`✅ Countdown message posted successfully! Days remaining: ${daysRemaining}`);
    } catch (error) {
        console.error('❌ Error posting countdown message:', error.message);
        
        // Log additional context for debugging
        if (error.code) {
            console.error(`Discord API Error Code: ${error.code}`);
        }
        
        // Don't crash the bot for posting errors, just log them
        console.error('Bot will continue running and retry on next scheduled post');
    }
}

// When the client is ready, run this code
client.once('ready', () => {
    console.log(`Bot is ready! Logged in as ${client.user.tag}`);
    console.log(`Arc Raiders releases on: ${RELEASE_DATE.toDateString()}`);
    console.log(`Days remaining: ${getDaysRemaining()}`);
    
    // Schedule daily countdown message (configurable)
    const schedule = config.POST_SCHEDULE || '0 9 * * *';
    const timezone = config.POST_TIMEZONE || 'UTC';
    
    cron.schedule(schedule, () => {
        console.log('Running scheduled countdown post...');
        postCountdownMessage();
    }, {
        scheduled: true,
        timezone: timezone
    });
    
    console.log(`📅 Scheduled to post daily at ${schedule} (${timezone})`);
    
    // Post initial countdown message
    setTimeout(() => {
        postCountdownMessage();
    }, 2000); // Wait 2 seconds after bot is ready
});

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Bot will continue running, but this error should be investigated');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    console.error('Bot will continue running, but this error should be investigated');
});

// Note: Message handling removed to avoid intent requirements
// The bot will only post scheduled countdown messages

// Login to Discord
client.login(config.DISCORD_TOKEN);
