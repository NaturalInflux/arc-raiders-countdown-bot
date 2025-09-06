# Arc Raiders Countdown Bot - Complete System Documentation

## Overview
The Arc Raiders Countdown Bot is a Discord bot that posts daily countdown messages for the Arc Raiders game release (October 30, 2025). It features multi-server support, Reddit integration, dynamic emoji systems, and comprehensive monitoring.

## Architecture

### Core Technologies
- **Node.js** (>=16.0.0) - Runtime environment
- **Discord.js v14** - Discord API wrapper
- **Node-cron** - Scheduled task management
- **Axios** - HTTP client for Reddit API
- **PM2** - Process management and monitoring
- **JSON File Database** - Per-server configuration storage

### File Structure
```
arc-raiders-countdown-bot/
├── bot.js                    # Main application file
├── package.json              # Dependencies and scripts
├── ecosystem.config.js       # PM2 configuration
├── deploy.sh                 # Deployment script
├── env.example               # Environment variables template
├── server-config.json        # Per-server configuration (auto-generated)
├── emojis.txt                # Emoji definitions and interpretations
├── README.md                 # User documentation
├── .gitignore                # Git ignore rules
└── logs/                     # PM2 log files (auto-generated)
```

## Core Features

### 1. Multi-Server Support
- **Per-server configuration**: Each Discord server can have its own channel and posting time
- **JSON-based storage**: Server configurations stored in `server-config.json`
- **Automatic setup**: Servers can configure the bot using Discord slash commands

### 2. Reddit Integration
- **OAuth Authentication**: Uses Reddit API with proper authentication
- **Top Post Fetching**: Gets the #1 top-voted post from r/arcraiders daily
- **Media Support**: Automatically uses Reddit post images or videos as embed media
- **Video Priority**: Prefers video posts over image posts when available
- **Graceful Degradation**: Bot continues working even if Reddit API fails

### 3. Dynamic Emoji System
- **5 Phases**: Different emoji intensity based on days remaining
- **Steady Progression**: 1 → 2 → 3 → 4 → 4 emojis per phase
- **Custom Emojis**: Uses Discord custom emojis from various servers
- **No Duplicates**: Prevents duplicate emojis in the same message

### 4. Monitoring System
- **Integrated Monitoring**: Built into the bot process
- **Persistent Logging**: Stores data in `~/.arc-raiders-monitor/`
- **Server Tracking**: Monitors server joins/leaves
- **Performance Metrics**: Tracks memory usage and uptime

## Configuration System

### Environment Variables (.env)
```bash
# Required
DISCORD_TOKEN=your_bot_token_here

# Optional Reddit Integration
REDDIT_CLIENT_ID=your_reddit_client_id_here
REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
REDDIT_USERNAME=your_reddit_username_here
REDDIT_PASSWORD=your_reddit_password_here

# Optional Advanced
API_TIMEOUT=10000
API_RETRY_ATTEMPTS=3
LOG_LEVEL=info
NODE_ENV=production
```

### Server Configuration (server-config.json)
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

## Discord Commands

### Slash Commands
1. **`/countdown-setup channel:<name>`**
   - Sets up the bot for the server
   - Requires: Manage Guild or Administrator permission
   - Sets channel and default time (12:00 UTC)

2. **`/countdown-time time:<time>`**
   - Updates the posting time
   - Accepts formats: "3am", "15:00", "3:30pm"
   - Always in UTC timezone

3. **`/countdown-status`**
   - Shows current configuration
   - Displays channel and posting time

4. **`/countdown-test`**
   - Tests current emoji phase
   - Posts example message for current phase
   - Useful for previewing current emoji intensity

5. **`/countdown-donate`**
   - Shows donation links to support the bot developer
   - Includes PayPal, Ko-fi, Patreon, and GitHub Sponsors
   - Ephemeral response for privacy

## Core Functions

### Configuration Management
```javascript
// Load server configurations from JSON file
function loadServerConfigs()

// Save server configurations to JSON file
function saveServerConfigs(configs)

// Get server configuration with defaults
function getServerConfig(guildId)

// Update server configuration
function updateServerConfig(guildId, updates)
```

### Reddit Integration
```javascript
// Get Reddit OAuth access token
async function getRedditAccessToken()

// Fetch top Arc Raiders post with media (image or video)
async function getTopArcRaidersPostWithMedia()
```

### Emoji System
```javascript
// Get custom emojis based on days remaining
function getCustomEmoji(daysRemaining)

// Get emoji placement in embed
function getEmojiPlacement(daysRemaining)
```

### Embed Creation
```javascript
// Create countdown embed for production
async function createCountdownEmbed()

// Create countdown embed for testing
async function createCountdownEmbedTest(daysRemaining)
```

### Message Posting
```javascript
// Post countdown message to server
async function postCountdownMessage(guildId)

// Post test countdown message
async function postTestCountdownMessage(guildId, testPhase)
```

## Emoji System Details

### Phase Structure
- **Phase 1** (55+ days): 1 emoji - Depressed/Melancholy
- **Phase 2** (30-54 days): 2 emojis - Hopeful/Excited
- **Phase 3** (15-29 days): 3 emojis - Hype Building
- **Phase 4** (7-14 days): 4 emojis - Maximum Hype
- **Phase 5** (1-6 days): 4 emojis - Insane Hype

### Emoji Categories
- **Early Emojis**: Depressed, waiting, sad emotions
- **Mid Emojis**: Hopeful, excited, building anticipation
- **Final Month Emojis**: Hype building, getting excited
- **Final Week Emojis**: Maximum hype, intense emotions
- **Final Days Emojis**: Insane hype, chaotic excitement

### Technical Implementation
- **No Duplicates**: Uses `Array.includes()` to prevent duplicate emojis
- **Character Limit**: Limited to 4 emojis max to stay under Discord's 256 character title limit
- **Random Selection**: Uses `Math.random()` for emoji selection
- **Fallback Protection**: 100 attempt limit to prevent infinite loops

## Reddit Integration Details

### Authentication Flow
1. **OAuth Token Request**: Uses Reddit's password grant type
2. **Token Caching**: Stores access token and expiry time
3. **Automatic Refresh**: Refreshes token when expired
4. **Error Handling**: Graceful fallback if authentication fails

### API Endpoints
- **Token Endpoint**: `https://www.reddit.com/api/v1/access_token`
- **Posts Endpoint**: `https://oauth.reddit.com/r/arcraiders/top.json`
- **Parameters**: `limit=1`, `t=day`, `raw_json=1`

### Post Filtering
- **Media Requirement**: Only posts with images or videos are selected
- **Video Priority**: Prefers video posts over image posts when available
- **Score Filtering**: Gets the top-voted post of the day
- **Content Validation**: Ensures post has valid title and URL

## Monitoring System

### Data Storage
- **Location**: `~/.arc-raiders-monitor/`
- **Files**: 
  - `monitor-data.json` - Current metrics
  - `monitor.log` - Event log
  - `monitor.pid` - Process ID

### Metrics Tracked
- **Server Count**: Current number of Discord servers
- **Server Changes**: Joins and leaves with timestamps
- **Memory Usage**: Bot memory consumption
- **Uptime**: Bot runtime duration
- **Last Update**: Timestamp of last data update

### Access Methods
- **Terminal Command**: `./monitor` - Shows current data
- **Log File**: `tail ~/.arc-raiders-monitor/monitor.log` - Shows events
- **Data File**: `cat ~/.arc-raiders-monitor/monitor-data.json` - Shows metrics

## Scheduling System

### Cron Jobs
- **Per-Server Scheduling**: Each server has its own cron job
- **Time Format**: User-friendly input converted to cron format
- **UTC Timezone**: All times are in UTC for consistency
- **Automatic Setup**: Cron jobs created when server configures bot

### Time Conversion
```javascript
// Convert user input to cron format
function timeToCron(timeInput)
// Examples:
// "3am" → "0 3 * * *"
// "15:00" → "0 15 * * *"
// "3:30pm" → "30 15 * * *"
```

## Error Handling

### Reddit API Errors
- **Retry Logic**: Exponential backoff for failed requests
- **Token Refresh**: Automatic token renewal on 401 errors
- **Graceful Degradation**: Bot continues without Reddit post if API fails
- **Logging**: Comprehensive error logging with context

### Discord API Errors
- **Rate Limiting**: Built-in rate limit handling
- **Permission Checks**: Validates bot permissions before posting
- **Channel Validation**: Ensures channel exists and is accessible
- **Error Recovery**: Continues operation after non-critical errors

### General Error Handling
- **Try-Catch Blocks**: Comprehensive error catching
- **Error Logging**: Detailed error messages with context
- **Process Continuation**: Bot continues running after errors
- **User Feedback**: Clear error messages for users

## Deployment

### PM2 Configuration
- **Process Management**: Automatic restart on crashes
- **Memory Limits**: 1GB memory limit with restart
- **Logging**: Comprehensive logging to files
- **Startup**: Automatic startup on system boot

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

## Security Considerations

### Token Management
- **Environment Variables**: All sensitive data in .env file
- **Git Ignore**: .env and server-config.json excluded from version control
- **Reddit Credentials**: Stored securely, not logged

### Permission System
- **Discord Permissions**: Requires Manage Guild or Administrator
- **Channel Access**: Validates bot permissions before posting
- **Command Restrictions**: Slash commands restricted to authorized users

### API Security
- **User Agent**: Proper Reddit API user agent
- **Rate Limiting**: Respects API rate limits
- **Error Handling**: Doesn't expose sensitive information in errors

## Performance Optimization

### Memory Management
- **PM2 Limits**: 1GB memory limit with automatic restart
- **Efficient Data Structures**: Optimized emoji selection algorithms
- **Minimal Dependencies**: Only essential packages included

### API Efficiency
- **Token Caching**: Reddit tokens cached to reduce API calls
- **Request Timeouts**: 10-second timeout for API requests
- **Retry Logic**: Smart retry with exponential backoff

### Database Efficiency
- **JSON Storage**: Lightweight file-based storage
- **Lazy Loading**: Configurations loaded only when needed
- **Atomic Writes**: Safe file writing with error handling

## Troubleshooting

### Common Issues
1. **Bot Offline**: Check PM2 status, restart if needed
2. **No Messages**: Verify channel configuration and permissions
3. **Reddit Errors**: Check Reddit API credentials and 2FA settings
4. **Permission Errors**: Ensure bot has proper Discord permissions

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
```

### Log Analysis
- **PM2 Logs**: `pm2 logs` for runtime errors
- **Monitor Logs**: `tail ~/.arc-raiders-monitor/monitor.log` for events
- **Error Patterns**: Look for specific error codes and messages

## Future Enhancements

### Potential Features
- **Multiple Game Support**: Extend to other game countdowns
- **Custom Emoji Upload**: Allow servers to upload their own emojis
- **Analytics Dashboard**: Web interface for monitoring data
- **Notification System**: Alert admins of issues
- **Backup System**: Automated configuration backups

### Scalability Considerations
- **Database Migration**: Move from JSON to proper database
- **Load Balancing**: Multiple bot instances for large servers
- **Caching Layer**: Redis for improved performance
- **API Rate Limiting**: More sophisticated rate limiting

## Development Guidelines

### Code Structure
- **Modular Functions**: Each function has a single responsibility
- **Error Handling**: Comprehensive try-catch blocks
- **Logging**: Consistent logging format throughout
- **Documentation**: Inline comments for complex logic

### Testing
- **Test Commands**: Built-in test functionality for all phases
- **Error Simulation**: Test error handling paths
- **Performance Testing**: Monitor memory and CPU usage
- **Integration Testing**: Test with real Discord and Reddit APIs

### Maintenance
- **Regular Updates**: Keep dependencies updated
- **Log Rotation**: Implement log rotation for long-term operation
- **Health Checks**: Regular health check endpoints
- **Backup Procedures**: Regular configuration backups

---

This documentation provides a complete overview of the Arc Raiders Countdown Bot system. For specific implementation details, refer to the source code in `bot.js` and related configuration files.
