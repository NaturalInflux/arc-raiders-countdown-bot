# Arc Raiders Countdown Bot - Complete System Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Core Features](#core-features)
4. [Configuration System](#configuration-system)
5. [Discord Integration](#discord-integration)
6. [Reddit Integration](#reddit-integration)
7. [Emoji System](#emoji-system)
8. [Social Messages System](#social-messages-system)
9. [Monitoring & Health Checks](#monitoring--health-checks)
10. [Scheduling System](#scheduling-system)
11. [Error Handling & Recovery](#error-handling--recovery)
12. [File System Operations](#file-system-operations)
13. [Deployment & Operations](#deployment--operations)
14. [Troubleshooting Guide](#troubleshooting-guide)
15. [Development & Maintenance](#development--maintenance)

---

## Project Overview

### What is the Arc Raiders Countdown Bot?
The Arc Raiders Countdown Bot is a Discord bot that posts daily countdown messages for the Arc Raiders game release (configurable, default: October 30, 2025). It features multi-server support, Reddit integration, dynamic emoji systems, and comprehensive monitoring.

### Key Capabilities
- **Multi-Server Support**: Each Discord server can have its own channel and posting time
- **Reddit Integration**: Automatically includes top posts from r/arcraiders with media
- **Dynamic Emoji System**: 5-phase emoji progression based on days remaining
- **Social Messages**: Developer can add custom messages for countdown posts
- **Health Monitoring**: HTTP endpoint for external monitoring
- **Automatic Game Launch Detection**: Stops countdown when release date is reached

### Target Use Case
Perfect for Discord communities waiting for Arc Raiders release, providing daily engagement with countdown updates, community content from Reddit, and dynamic visual progression through emoji phases.

---

## System Architecture

### Technology Stack
- **Runtime**: Node.js (>=16.0.0)
- **Discord API**: Discord.js v14 (Discord API v10)
- **Scheduling**: Node-cron
- **HTTP Client**: Axios
- **Process Management**: PM2
- **Data Storage**: JSON files
- **Health Monitoring**: Built-in HTTP server

### Version Compatibility Matrix
| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | >=16.0.0 | Required for Discord.js v14 |
| Discord.js | ^14.14.1 | Discord API v10 requirement |
| Discord API | v10 | Required by Discord.js v14 |
| Reddit API | OAuth v1 | Script application type |
| PM2 | Latest stable | Process management |

### Discord Bot Setup Requirements

#### Required Intents
- **Guilds**: Access to server information and member data
- **Guild Messages**: Ability to send messages in text channels

#### Required Permissions
| Permission | Flag | Purpose |
|------------|------|---------|
| Send Messages | 0x800 (2048) | Post countdown messages |
| Embed Links | 0x4000 (16384) | Send rich embeds |
| Attach Files | 0x8000 (32768) | Upload Reddit media |
| Mention Everyone | 0x2000000 (33554432) | Notifications |
| Use External Emojis | 0x4000000 (67108864) | Custom emojis |
| Add Reactions | 0x40 (64) | Interactive features |
| Use Slash Commands | 0x8000000 (134217728) | Command responses |

**Total Permission Value**: 234881024

#### Bot Invite URL
```
https://discord.com/api/oauth2/authorize?client_id=1413486967525478462&permissions=234881024&scope=bot
```

#### Bot Application Setup
1. Create application at https://discord.com/developers/applications
2. Enable required intents in the "Bot" section
3. Generate bot token and add to `.env` file
4. Invite bot to servers with appropriate permissions

### File Structure
```
arc-raiders-countdown-bot/
├── bot.js                    # Main application file
├── package.json              # Dependencies and scripts
├── package-lock.json         # Dependency lock file
├── ecosystem.config.js       # PM2 configuration
├── deploy.sh                 # Deployment script
├── env.example               # Environment variables template
├── add-message.js            # Developer script to add social messages
├── monitor                   # Monitoring script
├── README.md                 # User documentation
├── SYSTEM_DOCUMENTATION.md   # Complete system documentation
├── .gitignore                # Git ignore rules
├── server-config.json        # Per-server configuration (auto-generated)
├── next-message.txt          # Social message for next post (auto-generated, created when needed)
├── monitor-data.json         # Monitoring data (auto-generated, created when bot runs)
├── server-config-backup-*.json # Configuration backups (auto-generated, max 5, created during saves)
└── logs/                     # PM2 log files (auto-generated, created by PM2)
    ├── err.log              # Error logs
    ├── out.log              # Output logs
    └── combined.log         # Combined logs
```

## Core Features

### 1. Multi-Server Support
**Purpose**: Allow the bot to serve multiple Discord servers with independent configurations.

**Implementation**:
- Per-server configuration stored in `server-config.json`
- Each server can have its own channel and posting time
- Automatic setup via Discord slash commands
- Independent cron job scheduling per server

**Configuration Structure**:
```json
{
  "servers": {
    "guild_id": {
      "channelId": "channel_id",
      "channelName": "channel_name", 
      "postTime": "12:00"
    }
  }
}
```

### 2. Reddit Integration
**Purpose**: Automatically include top community content from r/arcraiders in countdown messages.

**Features**:
- OAuth authentication with Reddit API
- Fetches #1 top-voted post from r/arcraiders daily
- Media support (images/videos) from Reddit posts
- File attachment capability
- Graceful degradation if Reddit API fails

**API Details**:
- **Rate Limit**: 60 requests per minute for OAuth applications
- **Token Caching**: 45-minute refresh cycle (tokens expire after 1 hour)
- **Daily Caching**: Reddit posts fetched once per day, cached for all servers
- **Retry Logic**: 3 attempts with exponential backoff (1s, 2s, 4s delays)

### 3. Dynamic Emoji System
**Purpose**: Provide visual progression of excitement as the release date approaches.

**Phase Structure**:
| Phase | Days Remaining | Emoji Count | Mood |
|-------|----------------|-------------|------|
| Phase 1 | 55+ days | 1 emoji | Depressed/Melancholy |
| Phase 2 | 30-54 days | 2 emojis | Hopeful/Excited |
| Phase 3 | 15-29 days | 3 emojis | Hype Building |
| Phase 4 | 7-14 days | 4 emojis | Maximum Hype |
| Phase 5 | 1-6 days | 4 emojis | Insane Hype |

**Technical Implementation**:
- 200+ custom emojis from various Discord servers
- No duplicate emojis in same message
- Character limit compliance (Discord's 256 character title limit)
- Random selection with 100-attempt limit to prevent infinite loops

### 4. Social Messages System
**Purpose**: Allow developer to add custom messages to countdown posts.

**Features**:
- One-time use messages (consumed after posting)
- All servers get the same message on next post
- Developer-only access via `node add-message.js "message"`
- Automatic file management (deletion after consumption)
- Fallback to default description if no message available

### 5. Game Launch Detection
**Purpose**: Automatically stop countdown posting when the game launches.

**Behavior**:
- Bot stops posting countdown messages when release date is reached
- Server configurations are preserved
- Commands show launch status instead of configuration options
- Bot remains functional for potential post-launch features

### 6. Health Check System
**Purpose**: Provide external monitoring capability without log access.

**Features**:
- HTTP endpoint on configurable port (default: 3000)
- Real-time status including uptime, server count, memory usage
- JSON response format for automated monitoring
- Independent of Discord API status

#### API Rate Limits
- **Discord API**: 50 requests per second per bot (global rate limit)
- **Reddit API**: 60 requests per minute for OAuth applications
- **Bot Strategy**: Exponential backoff with 429 error handling
- **Request Timeout**: 10-second timeout for all API requests
- **Retry Logic**: 3 attempts with 1s, 2s, 4s delays for Reddit API
- **Token Caching**: Reddit tokens cached for 45 minutes to reduce API calls

#### Discord API Rate Limit Handling
The bot implements sophisticated rate limit handling for Discord API calls:
- **Error Codes Handled**: 
  - `50013` (Permission Denied)
  - `429` (Too Many Requests)
- **Retry Logic**: Maximum 3 attempts with exponential backoff
- **Retry After Header**: Respects Discord's `retry_after` header for wait times
- **Fallback Wait Time**: Uses attempt-based delay if `retry_after` not provided
- **Implementation**:
  ```javascript
  async function sendMessageWithRetry(channel, messageOptions, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
              return await channel.send(messageOptions);
          } catch (error) {
              if (error.code === 50013 || error.status === 429) {
                  const retryAfter = error.retry_after || (attempt * 1000);
                  await new Promise(resolve => setTimeout(resolve, retryAfter));
              } else {
                  throw error; // Non-rate-limit errors throw immediately
              }
          }
      }
  }
  ```

#### Reddit API Rate Limit Details
- **Rate Limit**: 60 requests per minute for OAuth applications
- **Token Caching**: Access tokens cached for 45 minutes (tokens expire after 1 hour)
- **Daily Post Caching**: Reddit posts fetched once per day, cached for all servers
- **Request Reduction**: Token caching reduces API calls from N servers to 1 per day
- **Retry Strategy**: 3 attempts with exponential backoff (1s, 2s, 4s delays)
- **Timeout Protection**: 10-second timeout prevents hanging requests
- **Error Handling**: Graceful degradation if Reddit API fails

### 8. Configuration Backup System
- **Automatic Backups**: Creates timestamped backups before saving configurations
- **Backup Naming**: `server-config-backup-{timestamp}.json` format
- **Rollback Protection**: Keeps last 5 backups for data recovery
- **Data Safety**: Prevents configuration loss from file corruption
- **Cleanup Management**: Automatically removes old backups (keeps 5 most recent)
- **Atomic Operations**: Backup creation before main file write
- **Error Recovery**: Continues operation even if backup creation fails
- **Backup Implementation**: Uses `fs.copyFileSync()` for atomic backup creation
- **Cleanup Logic**: Automatically removes backups beyond the 5 most recent
- **File Filtering**: Identifies backup files by naming pattern and sorts by timestamp
- **Sorting Algorithm**: 
  ```javascript
  const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('server-config-backup-') && file.endsWith('.json'))
      .sort()
      .reverse();
  ```
- **Cleanup Process**: Removes files beyond the 5 most recent (sorted in reverse order)

#### Backup File Format
- **Naming Convention**: `server-config-backup-{unix_timestamp}.json`
- **Timestamp Format**: Unix milliseconds (e.g., `1704067200000`)
- **File Location**: Same directory as `server-config.json`
- **Retention Policy**: 5 most recent backups automatically maintained
- **Manual Recovery**: Restore by copying backup file to `server-config.json`
- **Timestamp Example**: `server-config-backup-1704067200000.json` (January 1, 2024 00:00:00 UTC)

### 9. Game Launch Detection System
- **Automatic Shutdown**: Bot automatically stops posting countdown messages when the release date is reached
- **Post-Launch Behavior**: Bot remains functional but stops countdown posting
- **Command Restrictions**: Slash commands show launch status instead of configuration options
- **Future Features**: Bot may be updated with post-launch features
- **Launch Date Check**: Validates current time against configured release date
- **Graceful Transition**: No error messages, just stops countdown functionality

#### Launch Detection Logic
The bot uses precise date comparison to determine if the game has launched:
```javascript
const now = new Date();
if (now >= releaseDate) {
    // Game has launched - stop countdown posting
    return;
}
```

#### Post-Launch Behavior Details
- **Configuration Preservation**: Server configurations are NOT removed when game launches
- **Cron Job Management**: Existing cron jobs continue running but skip posting
- **Command Responses**: All slash commands show launch status message instead of configuration options
- **Bot Functionality**: Bot remains online and responsive to commands
- **Future Compatibility**: Bot may be updated with post-launch features without losing server configurations
- **Launch Status Message**: Commands display current date vs launch date for transparency

#### Launch Status Command Response
When the game has launched, commands return:
```
🎉 Arc Raiders has already launched! Countdown messages have stopped.

Launch date: [RELEASE_DATE]
Current time: [CURRENT_DATE]

*The bot may be updated with new features in the future!*
```

## Configuration System

### Environment Variables (.env)
```bash
# Required
DISCORD_TOKEN=your_bot_token_here

# Optional - Release Date Configuration
RELEASE_DATE=2025-10-30T00:00:00Z

# Optional Reddit Integration (bot works without these)
REDDIT_CLIENT_ID=your_reddit_client_id_here
REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
REDDIT_USERNAME=your_reddit_username_here
REDDIT_PASSWORD=your_reddit_password_here

# Optional Health Check Server
HEALTH_PORT=3000
```

### Server Configuration Management
**File**: `server-config.json` (auto-generated)

**Functions**:
- `loadServerConfigs()` - Load configurations from JSON file
- `saveServerConfigs(configs)` - Save configurations with backup
- `getServerConfig(guildId)` - Get server config with defaults
- `updateServerConfig(guildId, updates)` - Update specific server config
- `removeServerConfig(guildId)` - Remove server config and cleanup cron jobs

### Configuration Backup System
**Purpose**: Prevent data loss from file corruption.

**Features**:
- Automatic timestamped backups before saving
- Backup naming: `server-config-backup-{timestamp}.json`
- Keeps last 5 backups automatically
- Atomic operations (backup before main file write)
- Automatic cleanup of old backups

## Discord Integration

### Bot Setup Requirements

#### Required Intents
- **Guilds**: Access to server information and member data
- **Guild Messages**: Ability to send messages in text channels

#### Required Permissions
| Permission | Flag | Purpose |
|------------|------|---------|
| Send Messages | 0x800 (2048) | Post countdown messages |
| Embed Links | 0x4000 (16384) | Send rich embeds |
| Attach Files | 0x8000 (32768) | Upload Reddit media |
| Mention Everyone | 0x2000000 (33554432) | Notifications |
| Use External Emojis | 0x4000000 (67108864) | Custom emojis |
| Add Reactions | 0x40 (64) | Interactive features |
| Use Slash Commands | 0x8000000 (134217728) | Command responses |

**Total Permission Value**: 234881024

#### Bot Invite URL
```
https://discord.com/api/oauth2/authorize?client_id=1413486967525478462&permissions=234881024&scope=bot
```

### Discord Commands

#### Slash Commands
1. **`/countdown-setup channel:<name>`**
   - Sets up bot for the server
   - Requires: Manage Guild or Administrator permission
   - Sets channel and default time (12:00 UTC)
   - Creates cron job for scheduled posting

2. **`/countdown-time time:<time>`**
   - Updates posting time
   - Accepts: "3am", "15:00", "3:30pm" (all UTC)
   - Updates existing cron job schedule

3. **`/countdown-status`**
   - Shows current configuration
   - Ephemeral response for privacy

4. **`/countdown-test`**
   - Tests current emoji phase
   - Posts example message for current phase

5. **`/countdown-love`**
   - Shows donation links (Bitcoin, Ethereum, Monero)
   - Ephemeral response for privacy

#### Discord Events
- **Guild Join**: Posts welcome message to first available channel
- **Guild Leave**: Automatically removes server configuration and stops cron jobs
- **Permission Validation**: All commands require Manage Guild permission

### Rate Limit Handling
**Discord API Protection**:
- Automatic retry with exponential backoff for 429 errors
- Respects Discord's retry_after headers
- Maximum 3 attempts with smart retry logic
- Graceful degradation under rate limits

**Implementation**:
```javascript
async function sendMessageWithRetry(channel, messageOptions, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await channel.send(messageOptions);
        } catch (error) {
            if (error.code === 50013 || error.status === 429) {
                const retryAfter = error.retry_after || (attempt * 1000);
                await new Promise(resolve => setTimeout(resolve, retryAfter));
            } else {
                throw error;
            }
        }
    }
}
```

## Reddit Integration

### External Dependencies
**Critical Dependencies**:
- **r/arcraiders subreddit**: Target subreddit (hardcoded)
- **Steam App ID 2389730**: Arc Raiders thumbnail source
- **Discord Bot Client ID 1413486967525478462**: Bot identification

### Authentication Flow
1. **OAuth Token Request**: Uses Reddit's password grant type with Basic auth
2. **Token Caching**: Stores access token and expiry time (45-minute refresh cycle)
3. **Automatic Refresh**: Refreshes token when expired (tokens last 1 hour)
4. **Error Handling**: Graceful fallback if authentication fails
5. **Request Timeout**: 10-second timeout for all API requests

### API Endpoints
- **Token Endpoint**: `https://www.reddit.com/api/v1/access_token`
- **Posts Endpoint**: `https://oauth.reddit.com/r/arcraiders/top.json?limit=1&t=day`
- **User Agent**: `ArcRaidersCountdownBot/1.0.0`

### Post Filtering & Processing
**Content Validation**:
- Minimum 10 character title length
- Excludes NSFW (`over_18`) and spoiler (`spoiler`) posts
- HTML entity decoding for image URLs
- Media attachment if available

**Error Handling**:
- 3 attempts with exponential backoff (1s, 2s, 4s delays)
- Graceful degradation if Reddit API fails
- Daily caching reduces API calls from N servers to 1 per day

## Emoji System

### Phase Boundaries & Logic
```javascript
// Exact phase boundaries
if (daysRemaining >= 55) return 'early';           // Phase 1: 1 emoji
if (daysRemaining >= 30 && daysRemaining < 55) return 'mid';  // Phase 2: 2 emojis  
if (daysRemaining >= 15 && daysRemaining < 30) return 'final_month'; // Phase 3: 3 emojis
if (daysRemaining >= 7 && daysRemaining < 15) return 'final_week';   // Phase 4: 4 emojis
if (daysRemaining >= 1 && daysRemaining < 7) return 'final_days';    // Phase 5: 4 emojis
if (daysRemaining === 0) return 'launch';          // Special: no emojis
```

### Emoji Categories & Sources
**Early Phase Emojis** (55+ days): Depressed, waiting, sad emotions
- Examples: `<:TrollDespair:1081962916615553034>`, `<a:Loading:1229852033981612102>`

**Mid Phase Emojis** (30-54 days): Hopeful, excited, building anticipation  
- Examples: `<:EZ:1081947114663321620>`, `<:HYPERS:1081947121009295401>`

**Final Month Emojis** (15-29 days): Hype building, getting excited
- Examples: `<a:HYPERNODDERS:1229852036288217118>`, `<a:OkayuDance:1229866154244182026>`

**Final Week Emojis** (7-14 days): Maximum hype, intense emotions
- Examples: `<a:BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1081971147622596628>`

**Final Days Emojis** (1-6 days): Insane hype, chaotic excitement
- Same as Final Week emojis for maximum intensity

### Technical Implementation
**Selection Algorithm**:
```javascript
let attempts = 0;
while (selectedEmojis.length < emojiCount && attempts < 100) {
    const randomEmoji = emojiArray[Math.floor(Math.random() * emojiArray.length)];
    if (!selectedEmojis.includes(randomEmoji)) {
        selectedEmojis.push(randomEmoji);
    }
    attempts++;
}
```

**Key Features**:
- No duplicate emojis in same message
- Character limit compliance (Discord's 256 character title limit)
- Fallback protection (100 attempt limit)
- External emoji support (requires "Use External Emojis" permission)

## Social Messages System

### Overview
The social messages system allows the bot developer to add personal messages to daily countdown posts. Messages are used once and then consumed across all servers.

### File Management
**File**: `next-message.txt` (auto-generated in project root)
**Usage**: `node add-message.js "Your custom message here"`
**Behavior**: Message consumed after one use, file automatically deleted

### Integration Details
- **Embed Integration**: Messages replace the embed description (main content area)
- **Title Preservation**: Countdown title and emojis remain unchanged
- **Styling**: Clean, prominent text without emojis or special formatting
- **Fallback**: Default "Arc Raiders launches on [configurable date]" if no message available
- **Synchronization**: All servers get the same message on the next post

### Message Lifecycle
1. Developer runs `node add-message.js "message"`
2. Bot creates `next-message.txt` with message content
3. On next countdown post, bot reads and uses message
4. Bot deletes `next-message.txt` after consumption
5. All servers receive the same message

## Monitoring & Health Checks

### Health Check System
**HTTP Endpoint**: `http://localhost:3000/health` (configurable port)
**Method**: GET
**Response Format**: JSON

**Health Data Response**:
```json
{
  "status": "healthy",
  "uptime": 12345.67,
  "servers": 5,
  "activeCronJobs": 5,
  "memory": {
    "rss": 45678912,
    "heapTotal": 20971520,
    "heapUsed": 12345678,
    "external": 1234567
  },
  "timestamp": "2025-01-06T12:00:00.000Z"
}
```

### Monitoring System
**Data Storage**: `monitor-data.json`
**Content**: Server count and last update timestamp
**Access**: `./monitor` command or direct file reading

### Health Server Behavior
- **Startup Order**: Starts after Discord client creation, before Discord login
- **Independence**: Continues running even if Discord client disconnects
- **Response Codes**: 200 OK for `/health`, 404 Not Found for other endpoints
- **Real-time Data**: All metrics current at request time

## Scheduling System

### Cron Job Management
**Per-Server Scheduling**: Each server has its own cron job
**Time Format**: User-friendly input converted to cron format
**UTC Timezone**: All times in UTC for consistency
**Memory Management**: Active cron jobs tracked in Map for proper cleanup

### Time Conversion Examples
```javascript
// User input → Cron format
"3am" → "0 3 * * *"
"3pm" → "0 15 * * *"  
"15:00" → "0 15 * * *"
"3:30pm" → "30 15 * * *"
"12:00" → "0 12 * * *"
```

### Supported Time Formats
- **12-hour format**: "3am", "3pm", "12am", "12pm"
- **24-hour format**: "15:00", "00:30", "23:59"
- **Mixed format**: "3:30pm", "11:45am"
- **Validation**: Ensures hour (0-23) and minute (0-59) are valid

### Cron Job Lifecycle
1. **Creation**: When server configures bot via `/countdown-setup`
2. **Active**: Runs daily at configured time
3. **Update**: Modified when posting time changes via `/countdown-time`
4. **Destruction**: Removed when server config is deleted or bot leaves server
5. **Persistence**: Recreated from saved configurations on bot restart

## Error Handling & Recovery

### Reddit API Error Handling
**Retry Strategy**:
- 3 attempts with exponential backoff (1s, 2s, 4s delays)
- Automatic token refresh on 401 errors
- 10-second request timeout
- Graceful degradation if API fails

**Error Types**:
- **401 Unauthorized**: Automatic token refresh and retry
- **Network Timeouts**: 10-second timeout with retry logic
- **Rate Limits**: Respects Reddit's 60 requests per minute limit

### Discord API Error Handling
**Permission Validation**:
- Checks bot permissions before posting
- Validates channel exists and is accessible
- Automatic retry with exponential backoff for 429 errors

**Error Recovery**:
- Removes server config when bot loses access
- Posts error messages to server admins when possible
- Continues operation after non-critical errors

**Error Message Format**:
```javascript
{
  title: "⚠️ Arc Raiders Countdown Bot - Configuration Issue",
  description: "Error details and solutions",
  color: 0xFF6B6B,
  footer: "This message will stop appearing once the issue is resolved"
}
```

### Configuration Error Handling
**Startup Validation**: Validates required environment variables
**File Corruption**: Handles corrupted JSON files with fallback defaults
**Backup System**: Creates backups before saving configurations
**Orphaned Configs**: Automatically cleans up configs for removed servers

### Process Management
**Graceful Shutdown**: Handles SIGINT and SIGTERM signals
**Uncaught Exceptions**: Continues running after unhandled errors (intentional)
**Memory Limits**: PM2 restarts process at 1GB memory usage
**Cron Job Cleanup**: Properly destroys cron jobs on server removal

## File System Operations

### Required Permissions
**File System Access**:
- Read/write access to project directory
- File creation and modification capabilities
- Directory creation (logs/ directory)
- File deletion (social message cleanup)
- Backup creation in same directory

### Files Created/Modified by Bot
| File Type | Purpose | Operations |
|-----------|---------|------------|
| `server-config.json` | Server configurations | Read/write |
| `next-message.txt` | Social messages | Create/read/delete |
| `monitor-data.json` | Monitoring data | Create/read/write |
| `server-config-backup-*.json` | Configuration backups | Create/delete |
| `logs/` directory | PM2 logging | Create directory |

### Automatic Directory Creation
**Logs Directory**: Created automatically by `ecosystem.config.js`
**Implementation**: `fs.mkdirSync(logsDir, { recursive: true })`
**PM2 Integration**: Ensures proper directory structure before PM2 starts

### Backup Management
**Automatic Backups**: Timestamped backups before saving configurations
**Backup Naming**: `server-config-backup-{timestamp}.json`
**Cleanup Logic**: Keeps last 5 backups, removes older ones
**Atomic Operations**: Backup creation before main file write

## Deployment & Operations

### PM2 Configuration
**Process Management**:
- Automatic restart on crashes
- 1GB memory limit with automatic restart
- Comprehensive logging to `./logs/` directory
- Automatic startup on system boot

**Restart Policy**:
- Maximum 10 restarts with 4-second delay
- Minimum 10 seconds uptime before restart
- 5-second graceful shutdown timeout

### Deployment Script (deploy.sh)
1. **Environment Check**: Validates .env file and variables
2. **Dependency Installation**: Installs npm packages
3. **Git Pull**: Updates from repository
4. **PM2 Management**: Stops old process, starts new one
5. **Status Check**: Shows deployment status

### Production Setup
```bash
# Clone repository
git clone <repository-url>
cd arc-raiders-countdown-bot

# Setup environment
cp env.example .env
# Edit .env with your tokens

# Deploy
./deploy.sh
```

### Security Considerations
**Token Management**:
- All sensitive data in .env file
- .env and server-config.json excluded from version control
- Reddit credentials stored securely, not logged

**Permission System**:
- Discord permissions require Manage Guild or Administrator
- Channel access validation before posting
- Command restrictions to authorized users

## Troubleshooting Guide

### Common Issues & Solutions

#### Bot Offline
**Symptoms**: Bot appears offline in Discord
**Solutions**:
```bash
pm2 status                    # Check PM2 status
pm2 restart arc-raiders-countdown-bot  # Restart bot
pm2 logs arc-raiders-countdown-bot     # Check logs
```

#### No Countdown Messages
**Symptoms**: Bot online but no messages posted
**Causes & Solutions**:
- **Channel not configured**: Run `/countdown-setup`
- **Permission issues**: Check bot permissions in channel
- **Game already launched**: Check release date vs current date
- **Cron job issues**: Check PM2 logs for cron errors

#### Reddit Integration Issues
**Symptoms**: No Reddit content in messages
**Solutions**:
- Check Reddit API credentials in .env
- Verify Reddit 2FA settings
- Check PM2 logs for Reddit API errors
- Bot continues working without Reddit content

#### Emoji Display Issues
**Symptoms**: Emojis showing as text or missing
**Solutions**:
1. **Check Bot Permissions**: Ensure "Use External Emojis" permission
2. **Verify Emoji Sources**: Custom emojis from various Discord servers
3. **Test Emoji Display**: Use `/countdown-test` command
4. **Permission Verification**: Check server emoji restrictions

#### Port Conflicts
**Symptoms**: Health check server fails to start
**Solutions**:
```bash
# Check if port 3000 is in use
netstat -tulpn | grep :3000
# or
lsof -i :3000

# Change health check port
export HEALTH_PORT=3001
pm2 restart arc-raiders-countdown-bot
```

#### Memory Issues
**Symptoms**: Bot hitting PM2 memory limits
**Solutions**:
```bash
pm2 monit  # Check memory usage
# Increase PM2 memory limit in ecosystem.config.js
# Change max_memory_restart from '1G' to '2G'
```

### Debug Commands
```bash
# Check bot status
pm2 status

# View logs
pm2 logs arc-raiders-countdown-bot

# Restart bot
pm2 restart arc-raiders-countdown-bot

# Check monitoring data
./monitor

# Check health endpoint
curl http://localhost:3000/health
```

### Log Analysis
**PM2 Logs**: `pm2 logs` for runtime errors
**Monitor Data**: `cat monitor-data.json` for server count
**Error Patterns**: Look for specific error codes and messages

## Development & Maintenance

### Code Structure
**Modular Functions**: Each function has single responsibility
**Error Handling**: Comprehensive try-catch blocks
**Logging**: Consistent logging format throughout
**Documentation**: Inline comments for complex logic

### Core Function Reference

#### Configuration Management
```javascript
loadServerConfigs()           // Load server configurations from JSON
saveServerConfigs(configs)    // Save configurations with backup
getServerConfig(guildId)      // Get server config with defaults
updateServerConfig(guildId, updates)  // Update specific server config
removeServerConfig(guildId)   // Remove server config and cleanup
cleanupOrphanedConfigs()      // Clean up orphaned configurations
```

#### Reddit Integration
```javascript
getRedditAccessToken()        // Get OAuth access token
getCachedRedditPost()         // Get cached Reddit post (daily)
getTopArcRaidersPost(retries) // Fetch top post with media
```

#### Emoji System
```javascript
getCustomEmoji(daysRemaining) // Get emojis based on days remaining
getEmojiPlacement(daysRemaining) // Get emoji placement in embed
```

#### Message Posting
```javascript
postCountdownMessage(guildId) // Post countdown to server
postTestCountdownMessage(guildId, testPhase) // Post test message
sendMessageWithRetry(channel, messageOptions, maxRetries) // Retry logic
```

### Testing
**Test Commands**: Built-in test functionality via `/countdown-test`
**Phase Testing**: Internal `testPhase` parameter for specific phases:
- `'early'` - Phase 1 (60 days remaining)
- `'mid'` - Phase 2 (40 days remaining)  
- `'final_month'` - Phase 3 (20 days remaining)
- `'final_week'` - Phase 4 (10 days remaining)
- `'final_days'` - Phase 5 (3 days remaining)

### Performance Optimization
**Memory Management**:
- Typical usage: 50-100MB under normal operation
- Peak usage: Up to 200MB during Reddit API calls
- PM2 limit: 1GB (automatic restart if exceeded)
- Emoji arrays loaded once, cached for performance

**API Efficiency**:
- Token caching reduces Reddit API calls
- Daily post caching for all servers
- 10-second request timeouts
- Smart retry with exponential backoff

### Maintenance Tasks
**Regular Updates**: Keep dependencies updated
**Log Rotation**: Implement log rotation for long-term operation
**Health Checks**: Regular health check endpoint monitoring
**Backup Procedures**: Regular configuration backups (automatic)

### Future Enhancements
**Potential Features**:
- Multiple game support
- Custom emoji upload
- Analytics dashboard
- Notification system
- Web dashboard expansion

**Scalability Considerations**:
- Database migration from JSON
- Load balancing for large servers
- Redis caching layer
- More sophisticated rate limiting

## Bot Startup Sequence

### Initialization Process
1. **Configuration Validation**: Validates environment variables
2. **Discord Client Creation**: Creates client with necessary intents
3. **Server Count Update**: Updates monitoring data
4. **Orphaned Config Cleanup**: Removes configs for removed servers
5. **Slash Command Registration**: Registers Discord slash commands
6. **Game Launch Check**: Checks if game has already launched
7. **Cron Job Scheduling**: Schedules countdown messages for all servers
8. **Health Server Start**: Starts HTTP health check server
9. **Discord Login**: Connects to Discord and begins listening

### Startup Event Handling
- **Guild Join**: Posts welcome message to first available channel
- **Guild Leave**: Automatically removes server configuration and stops cron jobs
- **Command Registration**: Registers slash commands with Discord API
- **Cron Job Management**: Creates and manages scheduled tasks for each server

### Error Handling During Startup
- **Configuration Errors**: Exits gracefully if required tokens missing
- **Discord Connection**: Handles connection failures and retries
- **Command Registration**: Continues operation even if registration fails
- **Cron Job Creation**: Logs errors but continues startup if individual jobs fail

---

This documentation provides a complete, structured overview of the Arc Raiders Countdown Bot system, optimized for both human understanding and LLM comprehension. The logical flow from overview through implementation details to troubleshooting ensures comprehensive coverage while maintaining clarity and navigability.

