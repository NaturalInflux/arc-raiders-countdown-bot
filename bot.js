const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const axios = require('axios');
const config = require('./config.js');

// Create a new client instance with minimal intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// Arc Raiders release date: October 30, 2025
const RELEASE_DATE = new Date('2025-10-30T00:00:00Z');

// Function to calculate days remaining
function getDaysRemaining() {
    const now = new Date();
    const timeDiff = RELEASE_DATE.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return Math.max(0, daysRemaining);
}

// Function to fetch random Arc Raiders Reddit post
async function getRandomArcRaidersPost() {
    try {
        // Fetch top posts from r/arcraiders
        const response = await axios.get(`https://www.reddit.com/r/arcraiders/top.json?limit=10&t=week`);
        const posts = response.data.data.children;
        
        if (posts.length === 0) {
            return null;
        }
        
        // Pick a random post from the top 10
        const randomPost = posts[Math.floor(Math.random() * posts.length)];
        const postData = randomPost.data;
        
        // Filter out posts that are too long or inappropriate
        if (postData.selftext && postData.selftext.length > 500) {
            return null;
        }
        
        return {
            title: postData.title,
            url: `https://reddit.com${postData.permalink}`,
            subreddit: postData.subreddit,
            author: postData.author,
            score: postData.score,
            comments: postData.num_comments,
            thumbnail: postData.thumbnail && postData.thumbnail !== 'self' ? postData.thumbnail : null
        };
    } catch (error) {
        console.error('Error fetching Arc Raiders Reddit post:', error);
        return null;
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

    // Try to fetch a random Arc Raiders Reddit post
    const redditPost = await getRandomArcRaidersPost();
    if (redditPost) {
        embed.addFields({
            name: '🔥 Hot r/ArcRaiders Post',
            value: `[${redditPost.title}](https://reddit.com${redditPost.url})\n⬆️ ${redditPost.score} upvotes • 💬 ${redditPost.comments} comments`,
            inline: false
        });
        
        if (redditPost.thumbnail) {
            embed.setImage(redditPost.thumbnail);
        }
    }

    return embed;
}

// Function to post countdown message
async function postCountdownMessage() {
    try {
        const channelId = config.CHANNEL_ID;
        if (!channelId) {
            console.error('CHANNEL_ID not found in config file');
            return;
        }

        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            console.error('Channel not found');
            return;
        }

        const embed = await createCountdownEmbed();
        await channel.send({ embeds: [embed] });
        
        console.log(`Countdown message posted! Days remaining: ${getDaysRemaining()}`);
    } catch (error) {
        console.error('Error posting countdown message:', error);
    }
}

// When the client is ready, run this code
client.once('clientReady', () => {
    console.log(`Bot is ready! Logged in as ${client.user.tag}`);
    console.log(`Arc Raiders releases on: ${RELEASE_DATE.toDateString()}`);
    console.log(`Days remaining: ${getDaysRemaining()}`);
    
    // Schedule daily countdown message at 9:00 AM UTC
    cron.schedule('0 9 * * *', () => {
        console.log('Running scheduled countdown post...');
        postCountdownMessage();
    }, {
        scheduled: true,
        timezone: "UTC"
    });
    
    // Post initial countdown message
    setTimeout(() => {
        postCountdownMessage();
    }, 2000); // Wait 2 seconds after bot is ready
});

// Note: Message handling removed to avoid intent requirements
// The bot will only post scheduled countdown messages

// Login to Discord
client.login(config.DISCORD_TOKEN);
