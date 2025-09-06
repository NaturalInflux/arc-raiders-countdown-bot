const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Server configuration database
const CONFIG_FILE = path.join(__dirname, 'server-config.json');

// Simple social message system
const SOCIAL_MESSAGE_FILE = path.join(__dirname, 'next-message.txt');

// Load server configurations
function loadServerConfigs() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading server configs');
    }
    return { servers: {} };
}

// Save server configurations
function saveServerConfigs(configs) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2));
    } catch (error) {
        console.error('Error saving server configs');
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

// Remove server configuration
function removeServerConfig(guildId) {
    const configs = loadServerConfigs();
    if (configs.servers[guildId]) {
        delete configs.servers[guildId];
        saveServerConfigs(configs);
        console.log(`🗑️ Removed server configuration for guild: ${guildId}`);
    }
}

// Get next social message (consumes it after use)
function getNextSocialMessage() {
    try {
        if (fs.existsSync(SOCIAL_MESSAGE_FILE)) {
            const message = fs.readFileSync(SOCIAL_MESSAGE_FILE, 'utf8').trim();
            // Delete the file after reading (one-time use)
            fs.unlinkSync(SOCIAL_MESSAGE_FILE);
            return message;
        }
    } catch (error) {
        console.error('Error reading social message');
    }
    return null;
}

// Add a social message for the next post
function addSocialMessage(message) {
    try {
        fs.writeFileSync(SOCIAL_MESSAGE_FILE, message);
        return true;
    } catch (error) {
        console.error('Error saving social message');
        return false;
    }
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


// Simple configuration
const config = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID,
    REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET,
    REDDIT_USERNAME: process.env.REDDIT_USERNAME,
    REDDIT_PASSWORD: process.env.REDDIT_PASSWORD
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

// Simple monitoring system
const MONITOR_FILE = path.join(__dirname, 'monitor-data.json');

// Load monitoring data
let monitorData = {
    servers: 0,
    last_updated: new Date().toISOString()
};

if (fs.existsSync(MONITOR_FILE)) {
    try {
        monitorData = JSON.parse(fs.readFileSync(MONITOR_FILE, 'utf8'));
    } catch (e) {
        // Use defaults if file is corrupted
    }
}

// Update server count
function updateServerCount() {
    monitorData.servers = client.guilds.cache.size;
    monitorData.last_updated = new Date().toISOString();
    fs.writeFileSync(MONITOR_FILE, JSON.stringify(monitorData, null, 2));
}

// Define slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('countdown-setup')
        .setDescription('Set countdown channel')
        .addStringOption(option =>
            option.setName('channel')
                .setDescription('Channel name to post countdown messages (e.g., "general")')
                .setRequired(true)
        ),
    
    new SlashCommandBuilder()
        .setName('countdown-time')
        .setDescription('Set countdown post time in UTC')
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Time to post daily in UTC (e.g., "3am", "15:00", "3:30pm")')
                .setRequired(true)
        ),
    
    new SlashCommandBuilder()
        .setName('countdown-status')
        .setDescription('View current config'),
    
        new SlashCommandBuilder()
            .setName('countdown-test')
            .setDescription('Test countdown message'),
    
        new SlashCommandBuilder()
            .setName('countdown-love')
            .setDescription('Spread the love <3'),
    
    
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

// Reddit post cache (daily)
let cachedRedditPost = null;
let redditPostCacheDate = null;


// Function to get Reddit OAuth access token
async function getRedditAccessToken() {
    // Check if we have a valid cached token
    if (redditAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return redditAccessToken;
    }

    // Validate Reddit OAuth credentials
    if (!config.REDDIT_CLIENT_ID || !config.REDDIT_CLIENT_SECRET || 
        !config.REDDIT_USERNAME || !config.REDDIT_PASSWORD) {
        return null;
    }

    try {
        
        const auth = Buffer.from(`${config.REDDIT_CLIENT_ID}:${config.REDDIT_CLIENT_SECRET}`).toString('base64');
        
        const response = await axios.post('https://www.reddit.com/api/v1/access_token', 
            'grant_type=password&username=' + encodeURIComponent(config.REDDIT_USERNAME) + 
            '&password=' + encodeURIComponent(config.REDDIT_PASSWORD),
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'User-Agent': 'ArcRaidersCountdownBot/1.0.0',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
            }
        );

        // Check for errors in the response
        if (response.data.error) {
            return null;
        }
        
        redditAccessToken = response.data.access_token;
        // Set expiry to 45 minutes (tokens last 1 hour, but we refresh early)
        tokenExpiry = Date.now() + (45 * 60 * 1000);
        
        return redditAccessToken;
    } catch (error) {
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

// Function to get cached Reddit post (fetches once per day)
async function getCachedRedditPost() {
    const today = new Date().toDateString();
    
    // Check if we have a valid cached post for today
    if (cachedRedditPost && redditPostCacheDate === today) {
        return cachedRedditPost;
    }
    
    // Fetch new post and cache it
    cachedRedditPost = await getTopArcRaidersPost();
    redditPostCacheDate = today;
    
    return cachedRedditPost;
}

// Function to fetch top Arc Raiders Reddit post (with media if available)
async function getTopArcRaidersPost(retries = 3) {
    // Get OAuth access token
    const accessToken = await getRedditAccessToken();
    if (!accessToken) {
        return null;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Fetch top post of the day from Arc Raiders subreddit
            const response = await axios.get(`https://oauth.reddit.com/r/arcraiders/top.json?limit=1&t=day`, {
                timeout: 10000,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'User-Agent': 'ArcRaidersCountdownBot/1.0.0'
                }
            });
            
            const posts = response.data.data.children;
            
            if (posts.length === 0) {
                return null;
            }
            
            const postData = posts[0].data;
            
            // Check if post has media (image or video)
            const hasImage = postData.preview && 
                           postData.preview.images && 
                           postData.preview.images.length > 0 &&
                           postData.preview.images[0].source &&
                           postData.preview.images[0].source.url;
            
            const hasVideo = postData.media && 
                           postData.media.reddit_video && 
                           postData.media.reddit_video.fallback_url;
            
            // Note: We now include posts even without media
                
                // Filter out NSFW or inappropriate content
                if (postData.over_18 || postData.spoiler) {
                return null;
                }
                
                // Filter out posts with no title or very short titles
                if (!postData.title || postData.title.length < 10) {
                return null;
            }
            
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
        } catch (error) {
            if (attempt === retries) {
                return null;
            }
            
            // Wait before retrying (exponential backoff)
            const delay = 1000 * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Custom emoji selection based on days remaining (returns multiple emojis for later phases)
function getCustomEmoji(daysRemaining) {
    // Phase 1: Early Days (55+ days) - Depressed/Melancholy
    const earlyEmojis = [
        '<:TrollDespair:1081962916615553034>', // TrollDespair
        '<a:Loading:1229852033981612102>', // Loading
        '<a:pepeSmoke:1081963039881961572>', // pepeSmoke
        '<a:pepeMeltdown:1081967381460557824>', // pepeMeltdown
        '<a:peepoLurk:1229866148489859255>', // peepoLurk
        '<:AWNAWWWW:1411850454626861096>', // AWNAWWWW
        '<:AlienUnpleased:1411850384439251035>', // AlienUnpleased
        '<:Buggin:1411850686995632199>', // Buggin
        '<:FeelsOldMan:1411861297255026830>', // FeelsOldMan
        '<a:NAHHH:1229857243999109243>', // NAHHH
        '<:NoBitches:1411861731294318654>', // NoBitches
        '<:Waiting:1411861661706354829>', // Waiting
        '<:WeirdDude:1411877735671791709>', // WeirdDude
        '<:Weirdge:1411862572503662703>', // Weirdge
        '<:ReallyMad:1411877862474121266>', // ReallyMad
        '<a:SadCat:1229853138958418031>', // SadCat
        '<a:catBruh:1229852991792615537>', // catBruh
        '<:catDespair:1229598854140264488>', // catDespair
        '<a:catWait:1229852915720654878>', // catWait
        '<:pepeScream:1411862505394802791>', // pepeScream
        '<a:Awkward:1229853029193482361>', // Awkward
        '<a:Awkward~1:1411849577778380842>', // Awkward~1
        '<:Despairge:1411878584087478394>', // Despairge
        '<:Crying:1411878641486401646>', // Crying
        '<:agaDespair:1411878984194592859>', // agaDespair
        '<a:Plead:1411864761368580218>', // Plead
        '<a:WeirdChamping:1411864489477013627>', // WeirdChamping
        '<a:TouchGrass:1411864242151231509>', // TouchGrass
        '<a:omgBruh:1411863929117741218>', // omgBruh
        '<a:Copege:1411879378832593007>', // Copege
        '<a:Enough:1411879498047164627>', // Enough
        '<a:IMDEAD:1411879744412192860>', // IMDEAD
        '<a:JustAnotherDay:1411879858958499850>', // JustAnotherDay
        '<a:deadass:1411879383425355888>', // deadass
        '<a:TryHarding:1411880509499375736>', // TryHarding
        '<a:where:1411880522963091487>' // where
    ];
    
    // Phase 2: Mid Countdown (30-54 days) - Hopeful/Excited
    const midEmojis = [
        '<:EZ:1081947114663321620>', // EZ
        '<:HYPERS:1081947121009295401>', // HYPERS
        '<a:LETSGOOO:1081971175133024377>', // LETSGOOO
        '<a:NODDERS:1081963012405071953>', // NODDERS
        '<:PauseChamp:1081947249493418028>', // PauseChamp
        '<:OkayChamp:1081948107853529108>', // OkayChamp
        '<:PagMan:1081948129693290546>', // PagMan
        '<:PogU:1081948140392939592>', // PogU
        '<a:modCheck:1081971177246965871>', // modCheck
        '<:NAILS:1229843671176839262>', // NAILS
        '<a:POGGIES:1229852070002294785>', // POGGIES
        '<:Sodge:1263626742317453386>', // Sodge
        '<:pepeW:1081947385560829973>', // pepeW
        '<a:peepoClap:1081963018813980804>', // peepoClap
        '<a:nyanPls:1229866114557808641>', // nyanPls
        '<:1G:1411862007212408932>', // 1G
        '<a:AlienPls3:1229866466355187744>', // AlienPls3
        '<:Bruhge:1411850668939149515>', // Bruhge
        '<:FlushedBite:1411861492747468912>', // FlushedBite
        '<a:MONKE:1229857286751518822>', // MONKE
        '<a:Nessie:1229861597556510841>', // Nessie
        '<a:WOO:1229857245756657805>', // WOO
        '<a:agaCheck:1411849176798462042>', // agaCheck
        '<a:crabPls:1229866458448658552>', // crabPls
        '<:pepeY:1411861364728795187>', // pepeY
        '<a:Sisi:1229852717061636106>', // Sisi
        '<:aga:1411849048981245994>', // aga
        '<a:meow:1229853140786876517>', // meow
        '<:peepoPog:1411878357645266955>', // peepoPog
        '<:sajj:1411862526349807687>', // sajj
        '<a:AlienPls:1411849327558529155>', // AlienPls
        '<a:AnkhaPls:1411849504541642964>', // AnkhaPls
        '<:anga:1411878986627420340>', // anga
        '<a:awaree:1411849553254158517>', // awaree
        '<a:borpaCheck:1411849941780926495>', // borpaCheck
        '<:dudee:1411878512100642866>', // dudee
        '<a:catPls:1411862743497314384>', // catPls
        '<a:juh:1229862725841326100>', // juh
        '<a:peepoFine:1411864159943000135>', // peepoFine
        '<a:goosePls:1411879516007301201>', // goosePls
        '<a:happi:1411879733309870081>', // happi
        '<a:AwareMan:1411879237522165903>', // AwareMan
        '<a:Uware:1411880512255033455>' // Uware
    ];
    
    // Phase 3: Final Month (15-29 days) - Hype Building
    const finalMonthEmojis = [
        '<a:HYPERNODDERS:1229852036288217118>', // HYPERNODDERS
        '<a:OkayuDance:1229866154244182026>', // OkayuDance
        '<a:PagBounce:1229866080613437562>', // PagBounce
        '<:PagChomp:1229843704387338281>', // PagChomp
        '<a:sumSmash:1081971182976381118>', // sumSmash
        '<a:ppHop:1081971100193403000>', // ppHop
        '<a:zyzzBass:1081980963627745460>', // zyzzBass
        '<a:waga:1411843141224366232>', // waga
        '<a:docSpin:1229866150347804774>', // docSpin
        '<a:zyzzPls:1229857288320192542>', // zyzzPls
        '<a:zyzzRave:1229861574152294550>', // zyzzRave
        '<a:CatSpin:1229852879733391461>', // CatSpin
        '<a:Jigglin:1229852953356013568>', // Jigglin
        '<a:catBop:1411848568100098048>', // catBop
        '<a:CatTime:1229853027897442354>', // CatTime
        '<a:catJam:1229853092766547998>', // catJam
        '<a:happie:1229852997002203317>', // happie
        '<a:veryCat:1229852881465905212>', // veryCat
        '<a:AnnyLebronJam:1411849529124196533>', // AnnyLebronJam
        '<a:BLUBBERS:1411849753708204203>', // BLUBBERS
        '<a:borpafast:1411849800168505507>', // borpafast
        '<a:catRAVE:1411862766553399336>', // catRAVE
        '<a:Cheergi:1411864001402503198>', // Cheergi
        '<a:lebronJAM:1411862813357379776>', // lebronJAM
        '<a:Dance:1411864399492415588>', // Dance
        '<a:Headbang:1411864607148216330>', // Headbang
        '<a:EDM:1411864471949021184>', // EDM
        '<a:INSANECAT:1411864653587546226>', // INSANECAT
        '<a:MUGA:1411864885142229143>', // MUGA
        '<a:OOOOBANG:1411864122676744262>', // OOOOBANG
        '<a:SEXO:1411864455129595944>', // SEXO
        '<a:ROACH:1411864726958248026>', // ROACH
        '<a:cokebert:1411863951356067861>', // cokebert
        '<a:forsenGriddy:1411864083841548350>', // forsenGriddy
        '<a:goosePls4x:1411878995716345867>', // goosePls4x
        '<a:mwah:1411864629738733638>', // mwah
        '<a:vibePls:1411864435210977393>', // vibePls
        '<a:zazabert:1411863893420150866>', // zazabert
        '<a:BANGER:1411864800165888123>', // BANGER
        '<a:AYOOO:1411877554771722342>', // AYOOO
        '<a:DEMONCAT:1411879385509789736>', // DEMONCAT
        '<a:ForsenSingingAtYou:1411879503982235679>', // ForsenSingingAtYou
        '<a:DemonTime:1411879388663779419>', // DemonTime
        '<a:Glerm:1411879509229174824>', // Glerm
        '<a:HYPERYump:1411879742671687790>', // HYPERYump
        '<a:Kissahomie:1411879860707659776>', // Kissahomie
        '<a:danse:1411879380380024953>', // danse
        '<a:clappi:1411879249165418607>', // clappi
        '<a:duckass:1411879397161570366>', // duckass
        '<a:dvaWalk4x:1411879494192464055>', // dvaWalk4x
        '<a:glorpNotL:1411879514233114694>', // glorpNotL
        '<a:lerolero:1411879867812675594>', // lerolero
        '<a:PartyKirby:1411880282226819243>', // PartyKirby
        '<a:RainbowPls:1411880375537631372>', // RainbowPls
        '<a:Sussy4x:1411880500930285568>', // Sussy4x
        '<a:VeiO:1411880518655676566>', // VeiO
        '<a:veiNODDERS:1411880514104725644>', // veiNODDERS
        '<a:poggSpin:1411880370198024292>', // poggSpin
        '<a:WOW:1411880525836320779>', // WOW
        '<a:luh:1411880270533103636>', // luh
        '<a:marinFlush:1411880272944824351>', // marinFlush
        '<a:ppParty:1411880372882640936>', // ppParty
        '<a:retardJAM:1411880379081556018>', // retardJAM
        '<a:thatsCrazy:1411880503941791805>' // thatsCrazy
    ];
    
    // Phase 4: Final Week (7-14 days) - Maximum Hype
    const finalWeekEmojis = [
        '<a:BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1081971147622596628>', // BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
        '<a:HYPERNODDERS:1229852036288217118>', // HYPERNODDERS
        '<a:LETSGOOO:1081971175133024377>', // LETSGOOO
        '<a:NODDERS:1081963012405071953>', // NODDERS
        '<a:POGGIES:1229852070002294785>', // POGGIES
        '<a:WOO:1229857245756657805>', // WOO
        '<a:HYPERS:1081947121009295401>', // HYPERS
        '<a:WAAAAYTOODANK:1229857219730997330>', // WAAAAYTOODANK
        '<a:zyzzBass:1081980963627745460>', // zyzzBass
        '<a:waga:1411843141224366232>', // waga
        '<a:docSpin:1229866150347804774>', // docSpin
        '<a:zyzzPls:1229857288320192542>', // zyzzPls
        '<a:zyzzRave:1229861574152294550>', // zyzzRave
        '<a:CatSpin:1229852879733391461>', // CatSpin
        '<a:Jigglin:1229852953356013568>', // Jigglin
        '<a:catBop:1411848568100098048>', // catBop
        '<a:CatTime:1229853027897442354>', // CatTime
        '<a:catJam:1229853092766547998>', // catJam
        '<a:happie:1229852997002203317>', // happie
        '<a:veryCat:1229852881465905212>', // veryCat
        '<a:AnnyLebronJam:1411849529124196533>', // AnnyLebronJam
        '<a:BLUBBERS:1411849753708204203>', // BLUBBERS
        '<a:borpafast:1411849800168505507>', // borpafast
        '<a:catRAVE:1411862766553399336>', // catRAVE
        '<a:Cheergi:1411864001402503198>', // Cheergi
        '<a:lebronJAM:1411862813357379776>', // lebronJAM
        '<a:Dance:1411864399492415588>', // Dance
        '<a:Headbang:1411864607148216330>', // Headbang
        '<a:EDM:1411864471949021184>', // EDM
        '<a:INSANECAT:1411864653587546226>', // INSANECAT
        '<a:MUGA:1411864885142229143>', // MUGA
        '<a:OOOOBANG:1411864122676744262>', // OOOOBANG
        '<a:SEXO:1411864455129595944>', // SEXO
        '<a:ROACH:1411864726958248026>', // ROACH
        '<a:cokebert:1411863951356067861>', // cokebert
        '<a:forsenGriddy:1411864083841548350>', // forsenGriddy
        '<a:goosePls4x:1411878995716345867>', // goosePls4x
        '<a:mwah:1411864629738733638>', // mwah
        '<a:vibePls:1411864435210977393>', // vibePls
        '<a:zazabert:1411863893420150866>', // zazabert
        '<a:BANGER:1411864800165888123>', // BANGER
        '<a:AYOOO:1411877554771722342>', // AYOOO
        '<a:DEMONCAT:1411879385509789736>', // DEMONCAT
        '<a:ForsenSingingAtYou:1411879503982235679>', // ForsenSingingAtYou
        '<a:DemonTime:1411879388663779419>', // DemonTime
        '<a:Glerm:1411879509229174824>', // Glerm
        '<a:HYPERYump:1411879742671687790>', // HYPERYump
        '<a:Kissahomie:1411879860707659776>', // Kissahomie
        '<a:danse:1411879380380024953>', // danse
        '<a:clappi:1411879249165418607>', // clappi
        '<a:duckass:1411879397161570366>', // duckass
        '<a:dvaWalk4x:1411879494192464055>', // dvaWalk4x
        '<a:glorpNotL:1411879514233114694>', // glorpNotL
        '<a:lerolero:1411879867812675594>', // lerolero
        '<a:PartyKirby:1411880282226819243>', // PartyKirby
        '<a:RainbowPls:1411880375537631372>', // RainbowPls
        '<a:Sussy4x:1411880500930285568>', // Sussy4x
        '<a:VeiO:1411880518655676566>', // VeiO
        '<a:veiNODDERS:1411880514104725644>', // veiNODDERS
        '<a:poggSpin:1411880370198024292>', // poggSpin
        '<a:WOW:1411880525836320779>', // WOW
        '<a:luh:1411880270533103636>', // luh
        '<a:marinFlush:1411880272944824351>', // marinFlush
        '<a:ppParty:1411880372882640936>', // ppParty
        '<a:retardJAM:1411880379081556018>', // retardJAM
        '<a:thatsCrazy:1411880503941791805>' // thatsCrazy
    ];
    
    // Phase 5: Final Days (1-6 days) - Insane Hype
    const finalDaysEmojis = [
        '<a:BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1081971147622596628>', // BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
        '<a:HYPERNODDERS:1229852036288217118>', // HYPERNODDERS
        '<a:LETSGOOO:1081971175133024377>', // LETSGOOO
        '<a:NODDERS:1081963012405071953>', // NODDERS
        '<a:POGGIES:1229852070002294785>', // POGGIES
        '<a:WOO:1229857245756657805>', // WOO
        '<a:HYPERS:1081947121009295401>', // HYPERS
        '<a:WAAAAYTOODANK:1229857219730997330>', // WAAAAYTOODANK
        '<a:zyzzBass:1081980963627745460>', // zyzzBass
        '<a:waga:1411843141224366232>', // waga
        '<a:docSpin:1229866150347804774>', // docSpin
        '<a:zyzzPls:1229857288320192542>', // zyzzPls
        '<a:zyzzRave:1229861574152294550>', // zyzzRave
        '<a:CatSpin:1229852879733391461>', // CatSpin
        '<a:Jigglin:1229852953356013568>', // Jigglin
        '<a:catBop:1411848568100098048>', // catBop
        '<a:CatTime:1229853027897442354>', // CatTime
        '<a:catJam:1229853092766547998>', // catJam
        '<a:happie:1229852997002203317>', // happie
        '<a:veryCat:1229852881465905212>', // veryCat
        '<a:AnnyLebronJam:1411849529124196533>', // AnnyLebronJam
        '<a:BLUBBERS:1411849753708204203>', // BLUBBERS
        '<a:borpafast:1411849800168505507>', // borpafast
        '<a:catRAVE:1411862766553399336>', // catRAVE
        '<a:Cheergi:1411864001402503198>', // Cheergi
        '<a:lebronJAM:1411862813357379776>', // lebronJAM
        '<a:Dance:1411864399492415588>', // Dance
        '<a:Headbang:1411864607148216330>', // Headbang
        '<a:EDM:1411864471949021184>', // EDM
        '<a:INSANECAT:1411864653587546226>', // INSANECAT
        '<a:MUGA:1411864885142229143>', // MUGA
        '<a:OOOOBANG:1411864122676744262>', // OOOOBANG
        '<a:SEXO:1411864455129595944>', // SEXO
        '<a:ROACH:1411864726958248026>', // ROACH
        '<a:cokebert:1411863951356067861>', // cokebert
        '<a:forsenGriddy:1411864083841548350>', // forsenGriddy
        '<a:goosePls4x:1411878995716345867>', // goosePls4x
        '<a:mwah:1411864629738733638>', // mwah
        '<a:vibePls:1411864435210977393>', // vibePls
        '<a:zazabert:1411863893420150866>', // zazabert
        '<a:BANGER:1411864800165888123>', // BANGER
        '<a:AYOOO:1411877554771722342>', // AYOOO
        '<a:DEMONCAT:1411879385509789736>', // DEMONCAT
        '<a:ForsenSingingAtYou:1411879503982235679>', // ForsenSingingAtYou
        '<a:DemonTime:1411879388663779419>', // DemonTime
        '<a:Glerm:1411879509229174824>', // Glerm
        '<a:HYPERYump:1411879742671687790>', // HYPERYump
        '<a:Kissahomie:1411879860707659776>', // Kissahomie
        '<a:danse:1411879380380024953>', // danse
        '<a:clappi:1411879249165418607>', // clappi
        '<a:duckass:1411879397161570366>', // duckass
        '<a:dvaWalk4x:1411879494192464055>', // dvaWalk4x
        '<a:glorpNotL:1411879514233114694>', // glorpNotL
        '<a:lerolero:1411879867812675594>', // lerolero
        '<a:PartyKirby:1411880282226819243>', // PartyKirby
        '<a:RainbowPls:1411880375537631372>', // RainbowPls
        '<a:Sussy4x:1411880500930285568>', // Sussy4x
        '<a:VeiO:1411880518655676566>', // VeiO
        '<a:veiNODDERS:1411880514104725644>', // veiNODDERS
        '<a:poggSpin:1411880370198024292>', // poggSpin
        '<a:WOW:1411880525836320779>', // WOW
        '<a:luh:1411880270533103636>', // luh
        '<a:marinFlush:1411880272944824351>', // marinFlush
        '<a:ppParty:1411880372882640936>', // ppParty
        '<a:retardJAM:1411880379081556018>', // retardJAM
        '<a:thatsCrazy:1411880503941791805>' // thatsCrazy
    ];
    
    // Select multiple emojis based on days remaining (ramping up intensity)
    let selectedEmojis = [];
    let emojiCount = 1;
    
    if (daysRemaining >= 55) {
        // Phase 1: Early Days - 1 emoji (depressed)
        emojiCount = 1; // 1 emoji
        let attempts = 0;
        while (selectedEmojis.length < emojiCount && attempts < 100) {
            const randomEmoji = earlyEmojis[Math.floor(Math.random() * earlyEmojis.length)];
            if (!selectedEmojis.includes(randomEmoji)) {
                selectedEmojis.push(randomEmoji);
            }
            attempts++;
        }
    } else if (daysRemaining >= 30) {
        // Phase 2: Mid Countdown - 2 emojis (hopeful)
        emojiCount = 2; // 2 emojis
        let attempts = 0;
        while (selectedEmojis.length < emojiCount && attempts < 100) {
            const randomEmoji = midEmojis[Math.floor(Math.random() * midEmojis.length)];
            if (!selectedEmojis.includes(randomEmoji)) {
                selectedEmojis.push(randomEmoji);
            }
            attempts++;
        }
    } else if (daysRemaining >= 15) {
        // Phase 3: Final Month - 3 emojis (hype building)
        emojiCount = 3; // 3 emojis
        let attempts = 0;
        while (selectedEmojis.length < emojiCount && attempts < 100) {
            const randomEmoji = finalMonthEmojis[Math.floor(Math.random() * finalMonthEmojis.length)];
            if (!selectedEmojis.includes(randomEmoji)) {
                selectedEmojis.push(randomEmoji);
            }
            attempts++;
        }
    } else if (daysRemaining >= 7) {
        // Phase 4: Final Week - 4 emojis (maximum hype)
        emojiCount = 4; // 4 emojis
        let attempts = 0;
        while (selectedEmojis.length < emojiCount && attempts < 100) {
            const randomEmoji = finalWeekEmojis[Math.floor(Math.random() * finalWeekEmojis.length)];
            if (!selectedEmojis.includes(randomEmoji)) {
                selectedEmojis.push(randomEmoji);
            }
            attempts++;
        }
    } else {
        // Phase 5: Final Days - 4 emojis (INSANE HYPE)
        emojiCount = 4; // 4 emojis (max we can use in title)
        let attempts = 0;
        while (selectedEmojis.length < emojiCount && attempts < 100) {
            const randomEmoji = finalDaysEmojis[Math.floor(Math.random() * finalDaysEmojis.length)];
            if (!selectedEmojis.includes(randomEmoji)) {
                selectedEmojis.push(randomEmoji);
            }
            attempts++;
        }
    }
    
    // Join emojis with spaces for better display
    const result = selectedEmojis.join(' ');
    console.log(`🎭 Emoji selection for ${daysRemaining} days: ${selectedEmojis.length} emojis selected (target: ${emojiCount})`);
    if (selectedEmojis.length !== emojiCount) {
        console.log(`⚠️ WARNING: Emoji count mismatch! Expected ${emojiCount}, got ${selectedEmojis.length}`);
    }
    console.log(`🎭 Selected emojis: ${result}`);
    return result;
}

// Function to get emojis for different parts of the message
function getEmojiPlacement(daysRemaining) {
    const emojis = getCustomEmoji(daysRemaining).split(' ');
    
    // Limit emojis in title to stay under Discord's 256 character limit
    // Base title: "**X DAYS** until Arc Raiders! " = ~30 chars
    // Each emoji: ~30-50 chars, so max 4-5 emojis for safety
    const maxTitleEmojis = Math.min(emojis.length, 4);
    const titleEmojis = emojis.slice(0, maxTitleEmojis);
    
    const placement = {
        title: titleEmojis.join(' ') // Limited emojis go after the title
    };
    
    return placement;
}

// Function to create countdown embed with Arc Raiders Reddit post (for testing)
async function createCountdownEmbedTest(daysRemaining = null) {
    const releaseDate = new Date('2025-10-30T00:00:00Z'); // Arc Raiders release date
    
    // Use provided days or real days remaining
    if (daysRemaining === null) {
        daysRemaining = getDaysRemaining(releaseDate);
    }
    
    const emojiPlacement = getEmojiPlacement(daysRemaining);
    
    const title = `**${daysRemaining} DAYS** until Arc Raiders! ${emojiPlacement.title}`;
    
    // Check title length and warn if close to limit
    if (title.length > 200) {
        console.warn(`⚠️ Title is getting long (${title.length} chars): ${title}`);
    }
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x5294E2)
        .setThumbnail('https://cdn.akamai.steamstatic.com/steam/apps/2389730/header.jpg')
        .setFooter({ text: 'Arc Raiders - Embark Studios' })
        .setTimestamp();

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
    const redditPost = await getCachedRedditPost();
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
}

// Function to create countdown embed with Arc Raiders Reddit post
async function createCountdownEmbed() {
    const releaseDate = new Date('2025-10-30T00:00:00Z'); // Arc Raiders release date
    const daysRemaining = getDaysRemaining(releaseDate);
    const emojiPlacement = getEmojiPlacement(daysRemaining);
    
    // Get social message for today to use as description
    const socialMessage = getNextSocialMessage();
    
    const embed = new EmbedBuilder()
        .setTitle(`**${daysRemaining} DAYS** until Arc Raiders! ${emojiPlacement.title}`)
        .setDescription(socialMessage || `Arc Raiders launches on October 30, 2025`)
        .setColor(0x5294E2)
        .setThumbnail('https://cdn.akamai.steamstatic.com/steam/apps/2389730/header.jpg')
        .setFooter({ text: 'Arc Raiders - Embark Studios' })
        .setTimestamp();

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
    const redditPost = await getCachedRedditPost();
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
}


// Function to post permission error message to server admins
async function postPermissionError(guildId, errorMessage) {
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

        await channel.send({ embeds: [errorEmbed] });
        console.log(`📢 Posted permission error message to guild: ${guild.name} (${guildId})`);
    } catch (error) {
        console.error(`❌ Failed to post permission error message: ${error.message}`);
        throw error;
    }
}

// Function to post test countdown message (legacy - keeping for compatibility)
async function postTestCountdownMessage(guildId, testPhase = null) {
    try {
        const serverConfig = getServerConfig(guildId);
        const channelId = serverConfig.channelId;
        
        if (!channelId) {
            return;
        }
        
        const releaseDate = new Date('2025-10-30T00:00:00Z'); // Arc Raiders release date
        let daysRemaining = getDaysRemaining(releaseDate);
        
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
        const embed = await createCountdownEmbedTest(testPhase);
        await channel.send({ embeds: [embed] });
    } catch (error) {
        // Error posting test message
    }
}

// Function to post countdown message
async function postCountdownMessage(guildId) {
    try {
        const serverConfig = getServerConfig(guildId);
        const channelId = serverConfig.channelId;
        
        if (!channelId) {
            console.log(`⚠️ No channel configured for guild: ${guildId}`);
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

        // Always post just 1 message per day
        const embed = await createCountdownEmbed();
        await channel.send({ embeds: [embed] });
        console.log(`✅ Countdown message posted successfully! Days remaining: ${daysRemaining}`);
    } catch (error) {
        console.error(`❌ Error posting countdown message: ${error.message}`);
        
        // Try to post error message to server admins
        try {
            await postPermissionError(guildId, error.message);
        } catch (adminError) {
            console.error(`❌ Failed to notify admins: ${adminError.message}`);
        }
        
        // Check if it's a permission error and remove server config if bot was kicked
        if (error.message.includes('Missing Access') || error.message.includes('not found')) {
            console.log(`🗑️ Removing server configuration due to access error: ${guildId}`);
            removeServerConfig(guildId);
        }
    }
}


// Simple guild event logging
function logGuildEvent(event, guild) {
    console.log(`Guild ${event}: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
    updateServerCount();
}

// Function to clean up orphaned server configurations
async function cleanupOrphanedConfigs() {
    const configs = loadServerConfigs();
    const currentGuilds = client.guilds.cache.map(guild => guild.id);
    let removedCount = 0;
    
    for (const guildId of Object.keys(configs.servers)) {
        if (!currentGuilds.includes(guildId)) {
            console.log(`🗑️ Removing orphaned configuration for guild: ${guildId} (bot no longer in server)`);
            delete configs.servers[guildId];
            removedCount++;
        }
    }
    
    if (removedCount > 0) {
        saveServerConfigs(configs);
        console.log(`🧹 Cleaned up ${removedCount} orphaned server configurations`);
    }
}

// When the client is ready, run this code
client.once('ready', async () => {
    console.log(`Bot ready - ${client.guilds.cache.size} servers`);
    
    // Update server count
    updateServerCount();
    
    // Clean up orphaned server configurations
    await cleanupOrphanedConfigs();
    
    // Register slash commands
    await registerCommands();
    
    // Schedule daily countdown messages for all configured servers
    const configs = loadServerConfigs();
    for (const [guildId, serverConfig] of Object.entries(configs.servers)) {
        if (serverConfig.channelId) {
            const baseTime = serverConfig.postTime || '12:00';
            const baseSchedule = timeToCron(baseTime);
            
            console.log(`📅 Scheduled for guild ${guildId} at ${baseTime} (UTC)`);
            
            // Main daily countdown message
            cron.schedule(baseSchedule, () => {
                postCountdownMessage(guildId);
            }, {
                scheduled: true,
                timezone: 'UTC'
            });
            
        }
    }
});

// Monitor when bot joins a server
client.on('guildCreate', async (guild) => {
    logGuildEvent('JOINED', guild);
    
    // Send welcome message to the first available channel
    try {
        const channel = guild.channels.cache.find(ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has('SendMessages'));
        if (channel) {
            const welcomeEmbed = new EmbedBuilder()
                .setTitle('⚙️ Arc Raiders Countdown Bot')
                .setDescription(`Thanks for adding me :)\nRun \`/countdown-setup\` to get started.\n\n📖 [View on GitHub](https://github.com/NaturalInflux/arc-raiders-countdown-bot)`)
                .setColor(0x5294E2)
                .setTimestamp();
            
            await channel.send({ embeds: [welcomeEmbed] });
        }
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
});

// Monitor when bot leaves a server
client.on('guildDelete', (guild) => {
    logGuildEvent('LEFT', guild);
    
    // Remove server configuration when bot leaves
    removeServerConfig(guild.id);
    console.log(`🗑️ Removed configuration for server: ${guild.name} (${guild.id})`);
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
                    content: `Configuration complete!\nChannel: #${channelName}\nTime: 12:00 (UTC) - Use \`/countdown-time\` to change`,
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
                
                const statusMessage = `Channel: ${serverConfig.channelName ? `#${serverConfig.channelName}` : 'Not configured'}
Time: ${serverConfig.postTime || '12:00'} (UTC)`;
                
                await interaction.reply({ content: statusMessage, ephemeral: true });
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
                    content: 'Sending test message...',
                    ephemeral: true
                });
                
                try {
                    await postTestCountdownMessage(guildId);
                } catch (error) {
                    await interaction.followUp({
                        content: `❌ Error testing countdown message`,
                        ephemeral: true
                    });
                }
                break;
            }
            
            case 'countdown-love': {
                const embed = new EmbedBuilder()
                    .setTitle('🩵 Help cover server costs')
                    .setDescription('Working on some cool new features for when the game is out <a:NODDERS:1081963012405071953>')
                    .setColor(0x2AA198)
                    .addFields(
                        {
                            name: '₿ Bitcoin (BTC)',
                            value: '```\nbc1q3wksadftgyn5f6y36pvprpmd54ny5jj8x8pxeu\n```',
                            inline: true
                        },
                        {
                            name: 'Ξ Ethereum (ETH)',
                            value: '```\n0x9c0d097ef971674D9133e88Eff5a256187d2C09d\n```',
                            inline: true
                        },
                        {
                            name: 'ɱ Monero (XMR)',
                            value: '```\n88tVVqExo9EPmRB4CwLV7qFgDHrbfLyXrLFsYcFb6KCS1T8RiimThkBgMQzRewTTAKcfKzMs1rJ3qFC2Mm3HTNVcVi2wSVT\n```',
                            inline: true
                        }
                    )
                    .setFooter({ text: 'Much appreciated :)' })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
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
    // Uncaught exception - bot continues running
});

process.on('unhandledRejection', (reason, promise) => {
    // Unhandled rejection - bot continues running
});

// Note: Message handling removed to avoid intent requirements
// The bot will only post scheduled countdown messages

// Login to Discord
client.login(config.DISCORD_TOKEN);