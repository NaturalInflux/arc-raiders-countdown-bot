const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Server configuration database
const CONFIG_FILE = path.join(__dirname, 'server-config.json');

// Load server configurations
function loadServerConfigs() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading server configs:', error);
    }
    return { servers: {} };
}

// Save server configurations
function saveServerConfigs(configs) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2));
    } catch (error) {
        console.error('Error saving server configs:', error);
    }
}

// Get server configuration with defaults
function getServerConfig(guildId) {
    const configs = loadServerConfigs();
    const serverConfig = configs.servers[guildId] || {};
    
    return {
        channelId: serverConfig.channelId || null,
        channelName: serverConfig.channelName || null,
        postTime: serverConfig.postTime || '12:00'
    };
}

// Update server configuration
function updateServerConfig(guildId, updates) {
    const configs = loadServerConfigs();
    if (!configs.servers[guildId]) {
        configs.servers[guildId] = {};
    }
    
    Object.assign(configs.servers[guildId], updates);
    saveServerConfigs(configs);
}

// Convert simple time input to cron format
function timeToCron(timeInput) {
    // Remove spaces and convert to lowercase
    const time = timeInput.toLowerCase().replace(/\s/g, '');
    
    // Handle formats like "3am", "3pm", "15:00", "3:00pm", etc.
    let hour, minute = 0;
    
    if (time.includes('am') || time.includes('pm')) {
        // Handle 12-hour format
        const isPM = time.includes('pm');
        const timeOnly = time.replace(/[amp]/g, '');
        
        if (timeOnly.includes(':')) {
            [hour, minute] = timeOnly.split(':').map(Number);
        } else {
            hour = parseInt(timeOnly);
        }
        
        if (isPM && hour !== 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;
    } else if (time.includes(':')) {
        // Handle 24-hour format
        [hour, minute] = time.split(':').map(Number);
    } else {
        // Assume it's just an hour
        hour = parseInt(time);
    }
    
    // Validate
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error('Invalid time format');
    }
    
    return `0 ${minute} ${hour} * * *`;
}


// Configuration from environment variables with fallbacks
const config = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    RELEASE_DATE: process.env.RELEASE_DATE || '2025-10-30T00:00:00Z',
    POST_SCHEDULE: process.env.POST_SCHEDULE || '0 9 * * *',
    POST_TIMEZONE: process.env.POST_TIMEZONE || 'UTC',
    REDDIT_SUBREDDIT: process.env.REDDIT_SUBREDDIT || 'arcraiders',
    REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID,
    REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET,
    REDDIT_USERNAME: process.env.REDDIT_USERNAME,
    REDDIT_PASSWORD: process.env.REDDIT_PASSWORD,
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
    
    if (errors.length > 0) {
        console.error('❌ Configuration errors:');
        errors.forEach(error => console.error(`  - ${error}`));
        console.error('\nPlease check your .env file and ensure all values are properly set.');
        process.exit(1);
    }
    
    console.log('✅ Configuration validated successfully');
}

// Validate config on startup
validateConfig();

// Create a new client instance with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Define slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('countdown-setup')
        .setDescription('Setup the Arc Raiders countdown bot for this server')
        .addStringOption(option =>
            option.setName('channel')
                .setDescription('Channel name to post countdown messages (e.g., "general")')
                .setRequired(true)
        ),
    
    new SlashCommandBuilder()
        .setName('countdown-time')
        .setDescription('Set the time to post daily countdown messages (UTC timezone)')
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Time to post daily (e.g., "3am", "15:00", "3:30pm")')
                .setRequired(true)
        ),
    
    new SlashCommandBuilder()
        .setName('countdown-status')
        .setDescription('View current countdown bot configuration'),
    
    new SlashCommandBuilder()
        .setName('countdown-test')
        .setDescription('Test the countdown bot by posting a message now')
];

// Register slash commands
async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
    
    try {
        console.log('Started refreshing application (/) commands.');
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Arc Raiders release date: October 30, 2025 (configurable)
const RELEASE_DATE = new Date(config.RELEASE_DATE || '2025-10-30T00:00:00Z');

// Reddit OAuth access token cache
let redditAccessToken = null;
let tokenExpiry = null;

// Function to get Reddit OAuth access token
async function getRedditAccessToken() {
    // Check if we have a valid cached token
    if (redditAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return redditAccessToken;
    }

    // Validate Reddit OAuth credentials
    if (!config.REDDIT_CLIENT_ID || !config.REDDIT_CLIENT_SECRET || 
        !config.REDDIT_USERNAME || !config.REDDIT_PASSWORD) {
        console.log('Reddit OAuth credentials not configured, skipping Reddit integration');
        return null;
    }

    try {
        console.log('Getting Reddit OAuth access token...');
        
        const auth = Buffer.from(`${config.REDDIT_CLIENT_ID}:${config.REDDIT_CLIENT_SECRET}`).toString('base64');
        
        const response = await axios.post('https://www.reddit.com/api/v1/access_token', 
            'grant_type=password&username=' + encodeURIComponent(config.REDDIT_USERNAME) + 
            '&password=' + encodeURIComponent(config.REDDIT_PASSWORD),
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'User-Agent': config.REDDIT_USER_AGENT,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: config.API_TIMEOUT
            }
        );

        // Check for errors in the response
        if (response.data.error) {
            console.error('❌ Reddit OAuth error:', response.data.error);
            if (response.data.error_description) {
                console.error('Error description:', response.data.error_description);
            }
            return null;
        }
        
        redditAccessToken = response.data.access_token;
        // Set expiry to 45 minutes (tokens last 1 hour, but we refresh early)
        tokenExpiry = Date.now() + (45 * 60 * 1000);
        
        console.log('✅ Reddit OAuth access token obtained successfully');
        return redditAccessToken;
    } catch (error) {
        console.error('❌ Failed to get Reddit OAuth access token:', error.response?.data || error.message);
        return null;
    }
}

// Function to calculate days remaining
function getDaysRemaining(releaseDate) {
    const now = new Date();
    const timeDiff = releaseDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return Math.max(0, daysRemaining);
}

// Function to fetch top Arc Raiders Reddit post with image
async function getTopArcRaidersPostWithImage(retries = config.API_RETRY_ATTEMPTS) {
    // Get OAuth access token
    const accessToken = await getRedditAccessToken();
    if (!accessToken) {
        console.log('No Reddit access token available, skipping Reddit post');
        return null;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Fetch top post of the day from Arc Raiders subreddit
            const response = await axios.get(`https://oauth.reddit.com/r/arcraiders/top.json?limit=1&t=day`, {
                timeout: config.API_TIMEOUT,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'User-Agent': config.REDDIT_USER_AGENT
                }
            });
            
            const posts = response.data.data.children;
            
            if (posts.length === 0) {
                console.log('No posts found in r/arcraiders');
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
    const releaseDate = new Date('2025-10-30T00:00:00Z'); // Arc Raiders release date
    const daysRemaining = getDaysRemaining(releaseDate);
    
    const embed = new EmbedBuilder()
        .setTitle(`⚙️ **${daysRemaining} DAYS** until Arc Raiders!`)
        .setDescription(`**Arc Raiders launches on October 30, 2025**`)
        .setColor(0x00ff00)
        .setThumbnail('https://cdn.akamai.steamstatic.com/steam/apps/2389730/header.jpg')
        .setFooter({ text: 'Arc Raiders - Embark Studios' })
        .setTimestamp();

    if (daysRemaining === 0) {
        embed.setTitle('🎉 **ARC RAIDERS IS NOW LIVE!** 🎉');
        embed.setDescription('**Arc Raiders has launched on October 30, 2025!**');
        embed.setColor(0xff0000);
    } else if (daysRemaining === 1) {
        embed.setTitle('🛠️ **1 DAY** until Arc Raiders!');
        embed.setDescription('**Arc Raiders launches TOMORROW - October 30, 2025!**');
        embed.setColor(0xffa500);
    } else if (daysRemaining <= 7) {
        embed.setTitle(`⚠️ **${daysRemaining} DAYS** until Arc Raiders!`);
        embed.setDescription(`**Only ${daysRemaining} days left until October 30, 2025!**`);
        embed.setColor(0xff4500);
    }

    // Try to fetch the top Reddit post with image
    const redditPost = await getTopArcRaidersPostWithImage();
    if (redditPost) {
        embed.addFields({
            name: '🪖 **Top r/arcraiders Post Today**',
            value: `**[${redditPost.title}](${redditPost.url})**\n⬆️ ${redditPost.score} upvotes • 💬 ${redditPost.comments} comments`,
            inline: false
        });
        
        // Use the Reddit post image as the main embed image
        embed.setImage(redditPost.imageUrl);
    }

    return embed;
}

// Function to post countdown message
async function postCountdownMessage(guildId) {
    try {
        const serverConfig = getServerConfig(guildId);
        const channelId = serverConfig.channelId;
        
        if (!channelId) {
            console.log(`No channel configured for guild ${guildId}, skipping countdown message`);
            return;
        }
        
        const releaseDate = new Date('2025-10-30T00:00:00Z'); // Arc Raiders release date
        const daysRemaining = getDaysRemaining(releaseDate);
        
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

// Monitor bot joins and leaves
function logGuildEvent(event, guild) {
    const timestamp = new Date().toISOString();
    const guildInfo = {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
        createdAt: guild.createdAt.toISOString(),
        region: guild.preferredLocale || 'Unknown'
    };
    
    console.log(`\n🔔 ${event.toUpperCase()} EVENT - ${timestamp}`);
    console.log(`📊 Server: ${guildInfo.name} (${guildInfo.id})`);
    console.log(`👥 Members: ${guildInfo.memberCount}`);
    console.log(`👑 Owner ID: ${guildInfo.ownerId}`);
    console.log(`🌍 Region: ${guildInfo.region}`);
    console.log(`📅 Created: ${guildInfo.createdAt}`);
    console.log(`📈 Total servers: ${client.guilds.cache.size}`);
    console.log('─'.repeat(50));
}

// When the client is ready, run this code
client.once('ready', async () => {
    console.log(`Bot is ready! Logged in as ${client.user.tag}`);
    console.log(`📊 Currently in ${client.guilds.cache.size} servers`);
    
    // Register slash commands
    await registerCommands();
    
    // Schedule daily countdown messages for all configured servers
    const configs = loadServerConfigs();
    for (const [guildId, serverConfig] of Object.entries(configs.servers)) {
        if (serverConfig.channelId) {
            const schedule = timeToCron(serverConfig.postTime || '12:00');
            
            cron.schedule(schedule, () => {
                console.log(`Running scheduled countdown post for guild ${guildId}...`);
                postCountdownMessage(guildId);
            }, {
                scheduled: true,
                timezone: 'UTC'
            });
            
            console.log(`📅 Scheduled for guild ${guildId} at ${serverConfig.postTime} (UTC)`);
        }
    }
});

// Monitor when bot joins a server
client.on('guildCreate', (guild) => {
    logGuildEvent('JOINED', guild);
});

// Monitor when bot leaves a server
client.on('guildDelete', (guild) => {
    logGuildEvent('LEFT', guild);
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, guildId, user } = interaction;

    // Check if user has permission to manage the server
    if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({ 
            content: 'You need the "Manage Server" permission to use this command.', 
            ephemeral: true 
        });
    }

    try {
        switch (commandName) {
            case 'countdown-setup': {
                const channelName = interaction.options.getString('channel');
                
                // Find channel by name
                const channel = interaction.guild.channels.cache.find(
                    ch => ch.name.toLowerCase() === channelName.toLowerCase() && ch.type === 0
                );
                
                if (!channel) {
                    return interaction.reply({
                        content: `Channel "#${channelName}" not found. Make sure the channel exists and I have access to it.`,
                        ephemeral: true
                    });
                }
                
                // Update configuration
                updateServerConfig(guildId, { 
                    channelId: channel.id,
                    channelName: channelName,
                    postTime: '12:00' // Default time
                });
                
                await interaction.reply({
                    content: `Arc Raiders countdown bot configured!\nChannel: #${channelName}\nTime: 12:00 (UTC) - Use \`/countdown-time\` to change`,
                    ephemeral: true
                });
                break;
            }
            
            case 'countdown-time': {
                const timeInput = interaction.options.getString('time');
                
                // Validate time input
                try {
                    timeToCron(timeInput); // Validate format
                } catch (error) {
                    return interaction.reply({
                        content: 'Invalid time format. Use formats like: "3am", "15:00", "3:30pm"',
                        ephemeral: true
                    });
                }
                
                // Update configuration
                updateServerConfig(guildId, { postTime: timeInput });
                
                await interaction.reply({
                    content: `Post time updated to ${timeInput} (UTC)`,
                    ephemeral: true
                });
                break;
            }
            
            case 'countdown-status': {
                const serverConfig = getServerConfig(guildId);
                const releaseDate = new Date('2025-10-30T00:00:00Z');
                const daysRemaining = getDaysRemaining(releaseDate);
                
                const embed = new EmbedBuilder()
                    .setTitle('📊 Arc Raiders Countdown Bot Status')
                    .setColor(0x00ff00)
                    .addFields(
                        { name: 'Channel', value: serverConfig.channelName ? `#${serverConfig.channelName}` : 'Not configured', inline: true },
                        { name: 'Post Time', value: serverConfig.postTime || '12:00', inline: true }
                    )
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            }
            
            case 'countdown-test': {
                const serverConfig = getServerConfig(guildId);
                
                if (!serverConfig.channelId) {
                    return interaction.reply({
                        content: 'No channel configured. Use `/countdown-setup` first.',
                        ephemeral: true
                    });
                }
                
                await interaction.reply({
                    content: '🧪 Testing countdown message...',
                    ephemeral: true
                });
                
                await postCountdownMessage(guildId);
                break;
            }
        }
    } catch (error) {
        console.error('Error handling slash command:', error);
        await interaction.reply({
            content: 'An error occurred while processing the command.',
            ephemeral: true
        });
    }
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
