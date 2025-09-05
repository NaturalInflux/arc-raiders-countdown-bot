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

// Monitoring system - integrated into bot
const os = require('os');

const MONITOR_DIR = path.join(os.homedir(), '.arc-raiders-monitor');
const MONITOR_LOG_FILE = path.join(MONITOR_DIR, 'monitor.log');
const MONITOR_DATA_FILE = path.join(MONITOR_DIR, 'monitor-data.json');

// Create monitor directory if it doesn't exist
if (!fs.existsSync(MONITOR_DIR)) {
    fs.mkdirSync(MONITOR_DIR, { recursive: true });
}

// Initialize monitoring data
let monitorData = {
    baseline_servers: 0,
    current_servers: 0,
    server_difference: 0,
    last_updated: new Date().toISOString()
};

// Load existing monitor data
if (fs.existsSync(MONITOR_DATA_FILE)) {
    try {
        monitorData = JSON.parse(fs.readFileSync(MONITOR_DATA_FILE, 'utf8'));
    } catch (e) {
        console.error('Error loading monitor data:', e);
    }
}

// Function to log with timestamp
function logMonitor(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    fs.appendFileSync(MONITOR_LOG_FILE, logEntry + '\n');
}

// Function to update monitor data
function updateMonitorData(key, value) {
    monitorData[key] = value;
    monitorData.last_updated = new Date().toISOString();
    fs.writeFileSync(MONITOR_DATA_FILE, JSON.stringify(monitorData, null, 2));
}

// Function to start monitoring
function startMonitoring() {
    // Set baseline server count if not already set
    if (monitorData.baseline_servers === 0) {
        monitorData.baseline_servers = client.guilds.cache.size;
        updateMonitorData('baseline_servers', monitorData.baseline_servers);
        logMonitor(`Baseline server count set to: ${monitorData.baseline_servers}`);
    }
    
    // Update current server count
    monitorData.current_servers = client.guilds.cache.size;
    monitorData.server_difference = monitorData.current_servers - monitorData.baseline_servers;
    updateMonitorData('current_servers', monitorData.current_servers);
    updateMonitorData('server_difference', monitorData.server_difference);
    
    logMonitor(`Monitoring started - Servers: ${monitorData.current_servers} (${monitorData.server_difference > 0 ? '+' : ''}${monitorData.server_difference})`);
    
    // Start monitoring loop (every 30 seconds)
    setInterval(() => {
        const currentCount = client.guilds.cache.size;
        if (currentCount !== monitorData.current_servers) {
            monitorData.current_servers = currentCount;
            monitorData.server_difference = currentCount - monitorData.baseline_servers;
            updateMonitorData('current_servers', currentCount);
            updateMonitorData('server_difference', monitorData.server_difference);
            logMonitor(`Server count changed: ${currentCount} (difference: ${monitorData.server_difference > 0 ? '+' : ''}${monitorData.server_difference})`);
        }
    }, 30000);
}

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
        .setDescription('Set the time to post daily countdown messages (in UTC)')
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Time to post daily in UTC (e.g., "3am", "15:00", "3:30pm")')
                .setRequired(true)
        ),
    
    new SlashCommandBuilder()
        .setName('countdown-status')
        .setDescription('View current countdown bot configuration'),
    
    new SlashCommandBuilder()
        .setName('countdown-test')
        .setDescription('Test countdown message - shows all emoji phases at once'),
    
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
        '<a:INSANECAT~1:1411879746341699614>', // INSANECAT~1
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
        '<a:INSANECAT~1:1411879746341699614>', // INSANECAT~1
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
        '<a:INSANECAT~1:1411879746341699614>', // INSANECAT~1
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
        // Phase 1: Early Days - 2-3 emojis (depressed but more intense)
        emojiCount = Math.floor(Math.random() * 2) + 2; // 2-3 emojis
        let attempts = 0;
        while (selectedEmojis.length < emojiCount && attempts < 100) {
            const randomEmoji = earlyEmojis[Math.floor(Math.random() * earlyEmojis.length)];
            if (!selectedEmojis.includes(randomEmoji)) {
                selectedEmojis.push(randomEmoji);
            }
            attempts++;
        }
    } else if (daysRemaining >= 30) {
        // Phase 2: Mid Countdown - 3-4 emojis (hopeful and excited)
        emojiCount = Math.floor(Math.random() * 2) + 3; // 3-4 emojis
        let attempts = 0;
        while (selectedEmojis.length < emojiCount && attempts < 100) {
            const randomEmoji = midEmojis[Math.floor(Math.random() * midEmojis.length)];
            if (!selectedEmojis.includes(randomEmoji)) {
                selectedEmojis.push(randomEmoji);
            }
            attempts++;
        }
    } else if (daysRemaining >= 15) {
        // Phase 3: Final Month - 4-6 emojis (hype building)
        if (daysRemaining <= 20) {
            // Last 5 days of final month - MORE HYPE
            emojiCount = Math.floor(Math.random() * 3) + 4; // 4-6 emojis
            // Sometimes start with a hype emoji
            if (Math.random() < 0.6) {
                selectedEmojis.push('<a:INSANECAT:1411864653587546226>');
                emojiCount--;
            }
        } else {
            // Early final month - 4-5 emojis
            emojiCount = Math.floor(Math.random() * 2) + 4; // 4-5 emojis
        }
        
        // Add remaining emojis to reach the target count
        let attempts = 0;
        while (selectedEmojis.length < emojiCount && attempts < 100) {
            const randomEmoji = finalMonthEmojis[Math.floor(Math.random() * finalMonthEmojis.length)];
            if (!selectedEmojis.includes(randomEmoji)) {
                selectedEmojis.push(randomEmoji);
            }
            attempts++;
        }
    } else if (daysRemaining >= 7) {
        // Phase 4: Final Week - 6-8 emojis (maximum hype)
        if (daysRemaining <= 10) {
            // Last 3 days of final week - EXTRA HYPE
            emojiCount = Math.floor(Math.random() * 3) + 6; // 6-8 emojis
            // Start with guaranteed hype emojis
            selectedEmojis.push('<a:BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1081971147622596628>');
            selectedEmojis.push('<a:HYPERNODDERS:1229852036288217118>');
            
            // Add random emojis for the rest
            let attempts = 0;
            while (selectedEmojis.length < emojiCount && attempts < 100) {
                const randomEmoji = finalWeekEmojis[Math.floor(Math.random() * finalWeekEmojis.length)];
                if (!selectedEmojis.includes(randomEmoji)) {
                    selectedEmojis.push(randomEmoji);
                }
                attempts++;
            }
        } else {
            // Early final week - 5-6 emojis
            emojiCount = Math.floor(Math.random() * 2) + 5; // 5-6 emojis
            let attempts = 0;
            while (selectedEmojis.length < emojiCount && attempts < 100) {
                const randomEmoji = finalWeekEmojis[Math.floor(Math.random() * finalWeekEmojis.length)];
                if (!selectedEmojis.includes(randomEmoji)) {
                    selectedEmojis.push(randomEmoji);
                }
                attempts++;
            }
        }
    } else {
        // Phase 5: Final Days - 8-12 emojis (INSANE HYPE)
        if (daysRemaining === 1) {
            // FINAL DAY - MAXIMUM CHAOS
            emojiCount = Math.floor(Math.random() * 5) + 8; // 8-12 emojis for final day
            // Always start with the most hype emojis
            selectedEmojis.push('<a:BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1081971147622596628>');
            selectedEmojis.push('<a:HYPERNODDERS:1229852036288217118>');
            selectedEmojis.push('<a:LETSGOOO:1081971175133024377>');
            
            // Add random emojis for the rest
            let attempts = 0;
            while (selectedEmojis.length < emojiCount && attempts < 100) {
                const randomEmoji = finalDaysEmojis[Math.floor(Math.random() * finalDaysEmojis.length)];
                if (!selectedEmojis.includes(randomEmoji)) {
                    selectedEmojis.push(randomEmoji);
                }
                attempts++;
            }
        } else if (daysRemaining <= 3) {
            // 2-3 days - EXTREME HYPE
            emojiCount = Math.floor(Math.random() * 4) + 7; // 7-10 emojis
            // Start with some guaranteed hype emojis
            selectedEmojis.push('<a:BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1081971147622596628>');
            selectedEmojis.push('<a:HYPERNODDERS:1229852036288217118>');
            
            // Add random emojis for the rest
            let attempts = 0;
            while (selectedEmojis.length < emojiCount && attempts < 100) {
                const randomEmoji = finalDaysEmojis[Math.floor(Math.random() * finalDaysEmojis.length)];
                if (!selectedEmojis.includes(randomEmoji)) {
                    selectedEmojis.push(randomEmoji);
                }
                attempts++;
            }
        } else {
            // 4-6 days - High hype
            emojiCount = Math.floor(Math.random() * 3) + 6; // 6-8 emojis
            let attempts = 0;
            while (selectedEmojis.length < emojiCount && attempts < 100) {
                const randomEmoji = finalDaysEmojis[Math.floor(Math.random() * finalDaysEmojis.length)];
                if (!selectedEmojis.includes(randomEmoji)) {
                    selectedEmojis.push(randomEmoji);
                }
                attempts++;
            }
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
    const placement = {
        title: emojis.join(' ') // All emojis go after the title
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
    
    const embed = new EmbedBuilder()
        .setTitle(`**${daysRemaining} DAYS** until Arc Raiders! ${emojiPlacement.title}`)
        .setDescription(`Arc Raiders launches on October 30, 2025`)
        .setColor(0x00ff00)
        .setThumbnail('https://cdn.akamai.steamstatic.com/steam/apps/2389730/header.jpg')
        .setFooter({ text: 'Arc Raiders - Embark Studios' })
        .setTimestamp();

    if (daysRemaining === 0) {
        embed.setTitle('🎉 **ARC RAIDERS IS NOW LIVE!** 🎉');
        embed.setDescription('Arc Raiders has launched on October 30, 2025!');
        embed.setColor(0xff0000);
    } else if (daysRemaining === 1) {
        embed.setTitle('⚠️⚠️⚠️ **1 DAY** until Arc Raiders!');
        embed.setDescription('Arc Raiders launches TOMORROW - October 30, 2025!');
        embed.setColor(0xffa500);
    } else if (daysRemaining <= 7) {
        embed.setTitle(`⚠️ **${daysRemaining} DAYS** until Arc Raiders!`);
        embed.setDescription(`Only ${daysRemaining} days left until October 30, 2025!`);
        embed.setColor(0xff4500);
    }

    // Try to fetch the top Reddit post with image
    const redditPost = await getTopArcRaidersPostWithImage();
    if (redditPost) {
        embed.addFields({
            name: 'Top r/arcraiders Post Today',
            value: `[${redditPost.title}](${redditPost.url})\n⬆️ ${redditPost.score} upvotes • 💬 ${redditPost.comments} comments`,
            inline: false
        });
        
        // Use the Reddit post image as the main embed image
        embed.setImage(redditPost.imageUrl);
    }

    return embed;
}

// Function to create countdown embed with Arc Raiders Reddit post
async function createCountdownEmbed() {
    const releaseDate = new Date('2025-10-30T00:00:00Z'); // Arc Raiders release date
    const daysRemaining = getDaysRemaining(releaseDate);
    const emojiPlacement = getEmojiPlacement(daysRemaining);
    
    const embed = new EmbedBuilder()
        .setTitle(`**${daysRemaining} DAYS** until Arc Raiders! ${emojiPlacement.title}`)
        .setDescription(`Arc Raiders launches on October 30, 2025`)
        .setColor(0x00ff00)
        .setThumbnail('https://cdn.akamai.steamstatic.com/steam/apps/2389730/header.jpg')
        .setFooter({ text: 'Arc Raiders - Embark Studios' })
        .setTimestamp();

    if (daysRemaining === 0) {
        embed.setTitle('🎉 **ARC RAIDERS IS NOW LIVE!** 🎉');
        embed.setDescription('Arc Raiders has launched on October 30, 2025!');
        embed.setColor(0xff0000);
    } else if (daysRemaining === 1) {
        embed.setTitle('⚠️⚠️⚠️ **1 DAY** until Arc Raiders!');
        embed.setDescription('Arc Raiders launches TOMORROW - October 30, 2025!');
        embed.setColor(0xffa500);
    } else if (daysRemaining <= 7) {
        embed.setTitle(`⚠️ **${daysRemaining} DAYS** until Arc Raiders!`);
        embed.setDescription(`Only ${daysRemaining} days left until October 30, 2025!`);
        embed.setColor(0xff4500);
    }

    // Try to fetch the top Reddit post with image
    const redditPost = await getTopArcRaidersPostWithImage();
    if (redditPost) {
        embed.addFields({
            name: 'Top r/arcraiders Post Today',
            value: `[${redditPost.title}](${redditPost.url})\n⬆️ ${redditPost.score} upvotes • 💬 ${redditPost.comments} comments`,
            inline: false
        });
        
        // Use the Reddit post image as the main embed image
        embed.setImage(redditPost.imageUrl);
    }

    return embed;
}

// Function to post all test phases at once
async function postAllTestPhases(guildId) {
    try {
        const serverConfig = getServerConfig(guildId);
        const channelId = serverConfig.channelId;
        
        if (!channelId) {
            console.log(`No channel configured for guild ${guildId}, skipping test countdown messages`);
            return;
        }
        
        console.log(`🧪 Testing all emoji phases for guild ${guildId}...`);

        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            throw new Error(`Channel with ID ${channelId} not found or bot doesn't have access`);
        }

        // Check if bot has permission to send messages in this channel
        if (!channel.permissionsFor(client.user).has('SendMessages')) {
            throw new Error(`Bot doesn't have permission to send messages in channel ${channelId}`);
        }

        // Test all phases
        const phases = [
            { name: 'Phase 1: Early Days (60 days)', days: 60 },
            { name: 'Phase 2: Mid Countdown (40 days)', days: 40 },
            { name: 'Phase 3: Final Month (20 days)', days: 20 },
            { name: 'Phase 4: Final Week (10 days)', days: 10 },
            { name: 'Phase 5: Final Days (3 days)', days: 3 }
        ];

        for (const phase of phases) {
            console.log(`🧪 Testing phase: ${phase.name} (${phase.days} days)`);
            try {
                const embed = await createCountdownEmbedTest(phase.days);
                
                // Check embed content length
                const embedJson = JSON.stringify(embed.data);
                if (embedJson.length > 6000) {
                    console.warn(`⚠️ Embed content is very long (${embedJson.length} chars) for ${phase.name}`);
                }
                
                await channel.send({ 
                    content: `**${phase.name}**`,
                    embeds: [embed] 
                });
                console.log(`✅ Successfully posted ${phase.name}`);
            } catch (error) {
                console.error(`❌ Error posting ${phase.name}:`, error.message);
                if (error.code) {
                    console.error(`Discord API Error Code: ${error.code}`);
                }
                if (error.errors) {
                    console.error(`Discord API Errors:`, JSON.stringify(error.errors, null, 2));
                }
            }
            
            // Add delay between messages to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log(`✅ All test phases posted successfully!`);
    } catch (error) {
        console.error('❌ Error posting test phases:', error.message);
        
        // Log additional context for debugging
        if (error.code) {
            console.error(`Discord API Error Code: ${error.code}`);
        }
        
        // Don't crash the bot for posting errors, just log them
        console.error('Bot will continue running');
    }
}

// Function to post test countdown message (legacy - keeping for compatibility)
async function postTestCountdownMessage(guildId, testPhase = null) {
    try {
        const serverConfig = getServerConfig(guildId);
        const channelId = serverConfig.channelId;
        
        if (!channelId) {
            console.log(`No channel configured for guild ${guildId}, skipping test countdown message`);
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
        
        console.log(`🧪 Testing countdown message (${daysRemaining} days remaining, phase: ${testPhase || 'current'})...`);

        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            throw new Error(`Channel with ID ${channelId} not found or bot doesn't have access`);
        }

        // Check if bot has permission to send messages in this channel
        if (!channel.permissionsFor(client.user).has('SendMessages')) {
            throw new Error(`Bot doesn't have permission to send messages in channel ${channelId}`);
        }

        // For testing, always send only 1 message
        let messageCount = 1;

        // Post test messages
        for (let i = 0; i < messageCount; i++) {
            const embed = await createCountdownEmbedTest(testPhase);
            await channel.send({ embeds: [embed] });
            
            // Add delay between messages to avoid rate limiting
            if (i < messageCount - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay for testing
            }
        }
        
        console.log(`✅ ${messageCount} test countdown message(s) posted successfully! Days remaining: ${daysRemaining}, Phase: ${testPhase || 'current'}`);
    } catch (error) {
        console.error('❌ Error posting test countdown message:', error.message);
        
        // Log additional context for debugging
        if (error.code) {
            console.error(`Discord API Error Code: ${error.code}`);
        }
        
        // Don't crash the bot for posting errors, just log them
        console.error('Bot will continue running');
    }
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

        // Determine number of messages based on days remaining (for final week only)
        let messageCount = 1;
        if (daysRemaining === 1) {
            messageCount = 6; // Final day: 6 messages
        } else if (daysRemaining === 2) {
            messageCount = 4; // 2 days: 4 messages
        } else if (daysRemaining === 3) {
            messageCount = 3; // 3 days: 3 messages
        } else if (daysRemaining >= 4 && daysRemaining <= 6) {
            messageCount = 2; // 4-6 days: 2 messages
        } else if (daysRemaining >= 7 && daysRemaining <= 14) {
            messageCount = 2; // Final week: 2 messages
        }

        // Post multiple messages for final week with proper spacing
        if (messageCount > 1) {
            // Calculate time intervals based on scheduled time
            const scheduledTime = serverConfig.postTime || '12:00';
            const [hours, minutes] = scheduledTime.split(':').map(Number);
            const baseTime = new Date();
            baseTime.setHours(hours, minutes, 0, 0);
            
            // Calculate intervals to spread messages throughout the day
            const intervals = [];
            if (messageCount === 2) {
                // 2 messages: morning and evening
                intervals.push(0, 8 * 60 * 60 * 1000); // 0 hours, 8 hours
            } else if (messageCount === 3) {
                // 3 messages: morning, afternoon, evening
                intervals.push(0, 4 * 60 * 60 * 1000, 8 * 60 * 60 * 1000); // 0, 4, 8 hours
            } else if (messageCount === 4) {
                // 4 messages: every 6 hours
                intervals.push(0, 6 * 60 * 60 * 1000, 12 * 60 * 60 * 1000, 18 * 60 * 60 * 1000);
            } else if (messageCount === 6) {
                // 6 messages: every 4 hours
                intervals.push(0, 4 * 60 * 60 * 1000, 8 * 60 * 60 * 1000, 12 * 60 * 60 * 1000, 16 * 60 * 60 * 1000, 20 * 60 * 60 * 1000);
            }
            
            // Post messages at calculated intervals
            for (let i = 0; i < messageCount; i++) {
                const embed = await createCountdownEmbed();
                await channel.send({ embeds: [embed] });
                
                // Wait for the next interval (except for the last message)
                if (i < messageCount - 1) {
                    const delay = intervals[i + 1] - intervals[i];
                    console.log(`⏰ Waiting ${delay / (60 * 60 * 1000)} hours until next message...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        } else {
            // Single message
            const embed = await createCountdownEmbed();
            await channel.send({ embeds: [embed] });
        }
        
        console.log(`✅ ${messageCount} countdown message(s) posted successfully! Days remaining: ${daysRemaining}`);
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
    
    // Log to monitor file
    if (typeof logMonitor === 'function') {
        logMonitor(`GUILD_EVENT: ${event} - ${guildInfo.name} (${guildInfo.id}) - ${guildInfo.memberCount} members`);
    }
}

// When the client is ready, run this code
client.once('ready', async () => {
    console.log(`Bot is ready! Logged in as ${client.user.tag}`);
    console.log(`📊 Currently in ${client.guilds.cache.size} servers`);
    
    // Start monitoring system
    startMonitoring();
    
    // Register slash commands
    await registerCommands();
    
    // Schedule daily countdown messages for all configured servers
    const configs = loadServerConfigs();
    for (const [guildId, serverConfig] of Object.entries(configs.servers)) {
        if (serverConfig.channelId) {
            const baseTime = serverConfig.postTime || '12:00';
            const baseSchedule = timeToCron(baseTime);
            
            // Main daily countdown message
            cron.schedule(baseSchedule, () => {
                console.log(`Running scheduled countdown post for guild ${guildId}...`);
                postCountdownMessage(guildId);
            }, {
                scheduled: true,
                timezone: 'UTC'
            });
            
            // Additional messages for final week (7-1 days remaining)
            // These will be scheduled dynamically based on current date
            const releaseDate = new Date('2025-10-30T00:00:00Z');
            const daysRemaining = getDaysRemaining(releaseDate);
            
            if (daysRemaining <= 7) {
                // Add extra messages for final week
                const extraTimes = [
                    '06:00', '09:00', '15:00', '18:00', '21:00'
                ];
                
                extraTimes.forEach((extraTime, index) => {
                    const extraSchedule = timeToCron(extraTime);
                    cron.schedule(extraSchedule, () => {
                        console.log(`Running extra countdown post for guild ${guildId} at ${extraTime}...`);
                        postCountdownMessage(guildId);
                    }, {
                        scheduled: true,
                        timezone: 'UTC'
                    });
                });
                
                console.log(`📅 Scheduled main + 5 extra messages for guild ${guildId} (final week)`);
            } else {
                console.log(`📅 Scheduled for guild ${guildId} at ${baseTime} (UTC)`);
            }
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
                const releaseDate = new Date('2025-10-30T00:00:00Z');
                const daysRemaining = getDaysRemaining(releaseDate);
                
                const embed = new EmbedBuilder()
                    .setTitle('📊 Status')
                    .setColor(0x00ff00)
                    .addFields(
                        { name: 'Channel', value: serverConfig.channelName ? `#${serverConfig.channelName}` : 'Not configured', inline: true },
                        { name: 'Post Time (UTC)', value: serverConfig.postTime || '12:00', inline: true }
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
                    content: '🧪 Testing all emoji phases - posting examples for each phase...',
                    ephemeral: true
                });
                
                try {
                    await postAllTestPhases(guildId);
                } catch (error) {
                    console.error('Error in test command:', error);
                    await interaction.followUp({
                        content: `❌ Error testing countdown messages: ${error.message}`,
                        ephemeral: true
                    });
                }
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
