# Arc Raiders Countdown Bot

A Discord bot that posts daily countdown messages for the release of Arc Raiders, launching on October 30, 2025. Each message includes a random Reddit post from r/ArcRaiders to keep the community engaged!

## Features

- 🎮 Daily countdown messages posted automatically at 12:00 PM UTC (optimal for EU/NA timezones)
- 📅 Beautiful embed messages with game artwork and Steam header image
- 🔥 Top Reddit post of the day from r/ArcRaiders (with image) included in each message
- 🚀 Special messages for the final week and release day
- 🛡️ Robust error handling with retry logic for Reddit API calls
- 🎯 Simple setup and configuration
- 🔒 Input validation and graceful error handling

## Setup Instructions

### 1. Install Node.js

First, you need to install Node.js:
1. Go to [nodejs.org](https://nodejs.org/)
2. Download and install the LTS version
3. Restart your command prompt/terminal after installation

### 2. Install Dependencies

```bash
npm install
```

### 3. Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section
4. Click "Add Bot"
5. Copy the bot token (you'll need this later)
6. **No special intents required** - this bot only needs basic guild access

### 4. Invite Bot to Your Server

**Quick Invite Link:**
[**Click here to add the bot to your server**](https://discord.com/oauth2/authorize?client_id=1413486967525478462&permissions=51264&integration_type=0&scope=bot)

The bot will automatically register slash commands when it joins your server.

**Manual Setup (if needed):**
1. Go to the "OAuth2" > "URL Generator" section
2. Select scopes: `bot` and `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Embed Links
   - Attach Files
4. Copy the generated URL and open it in your browser
5. Select your server and authorize the bot

### 6. Create Reddit API Application (Optional)

To enable Reddit integration, you need to create a Reddit API application:

1. Go to [Reddit App Preferences](https://www.reddit.com/prefs/apps)
2. Click "Create App" or "Create Another App"
3. Fill in the details:
   - **Name**: Arc Raiders Countdown Bot
   - **App type**: Select "script"
   - **Description**: Discord bot for Arc Raiders countdown
   - **About URL**: Leave blank
   - **Redirect URI**: `http://localhost:8080` (required but not used)
4. Click "Create app"
5. Note down the **Client ID** (under the app name) and **Client Secret**
6. You'll also need your Reddit username and password

### 7. Configure the Bot

1. Copy the environment example file:
   ```bash
   cp env.example .env
   ```

2. Edit the `.env` file with your actual values:
   ```bash
   DISCORD_TOKEN=your_actual_bot_token
   CHANNEL_ID=your_actual_channel_id
   
   # Reddit API credentials (optional - bot works without these)
   REDDIT_CLIENT_ID=your_reddit_client_id
   REDDIT_CLIENT_SECRET=your_reddit_client_secret
   REDDIT_USERNAME=your_reddit_username
   REDDIT_PASSWORD=your_reddit_password
   ```

3. Optionally customize other settings like posting schedule, timezone, etc.

### 8. Run the Bot

```bash
npm start
```

## Usage

### Quick Setup
1. **Add the bot to your server** using the invite link above
2. **Set up the bot:**
   ```
   /countdown-setup channel:general
   ```
3. **Set the posting time (optional):**
   ```
   /countdown-time time:3pm
   ```

### Commands
- **`/countdown-setup channel`** - Set which channel to post in (defaults to 12:00 UTC)
- **`/countdown-time time`** - Set the posting time (e.g., "3am", "15:00", "3:30pm")
- **`/countdown-status`** - View current configuration
- **`/countdown-test`** - Test the bot by posting a message now

### Features
- Posts daily countdown messages at your specified time (UTC timezone)
- Each message includes the top Reddit post of the day from r/arcraiders (with image, when available)
- Special formatting for the final week and release day
- Multi-server support - each server has its own configuration
- The bot will gracefully handle Reddit API failures and continue posting countdown messages

## File Structure

```
arc-raiders-countdown-bot/
├── bot.js              # Main bot file with countdown and Reddit integration
├── .env                # Environment variables (create from env.example)
├── env.example         # Environment variables template
├── package.json        # Dependencies and project metadata
├── ecosystem.config.js # PM2 configuration for production
├── deploy.sh           # Deployment script for VPS
└── README.md          # This file
```

## Configuration

The bot uses environment variables for configuration. Create a `.env` file from the example:

```bash
cp env.example .env
```

Then edit `.env` with your values:

```bash
# Required settings
DISCORD_TOKEN=your_actual_bot_token
CHANNEL_ID=your_actual_channel_id

# Optional customizations
RELEASE_DATE=2025-10-30T00:00:00Z
POST_SCHEDULE=0 9 * * *
POST_TIMEZONE=UTC
REDDIT_SUBREDDIT=arcraiders
```

### Available Configuration Options

- `DISCORD_TOKEN` - Your Discord bot token (required)
- `CHANNEL_ID` - Discord channel ID for countdown messages (required)
- `RELEASE_DATE` - Game release date (default: 2025-10-30T00:00:00Z)
- `POST_SCHEDULE` - Cron schedule for daily posts (default: 0 12 * * * - optimal for EU/NA)
- `POST_TIMEZONE` - Timezone for posting schedule (default: UTC)
- `REDDIT_SUBREDDIT` - Subreddit to fetch posts from (default: arcraiders)
- `REDDIT_CLIENT_ID` - Reddit API client ID (optional)
- `REDDIT_CLIENT_SECRET` - Reddit API client secret (optional)
- `REDDIT_USERNAME` - Reddit username for API access (optional)
- `REDDIT_PASSWORD` - Reddit password for API access (optional)
- `REDDIT_POST_LIMIT` - Number of posts to fetch (default: 1 - only top post of the day)
- `API_TIMEOUT` - API request timeout in ms (default: 10000)
- `API_RETRY_ATTEMPTS` - Number of retry attempts (default: 3)

## Troubleshooting

- Make sure your bot has the correct permissions in the channel
- Verify the channel ID is correct (right-click channel > Copy ID)
- Check that the bot token is valid and not expired
- Ensure the bot is online in your server
- Verify your `.env` file exists and contains the required variables
- If Reddit posts aren't appearing, check the console logs for API errors
- The bot will continue working even if Reddit API is unavailable

### Common Issues

**Bot won't start:**
- Check that `.env` file exists and contains `DISCORD_TOKEN` and `CHANNEL_ID`
- Verify the bot token is correct and not expired
- Ensure the channel ID is valid (17-19 digits)

**No Reddit posts appearing:**
- Check if Reddit OAuth credentials are configured in `.env`
- Verify Reddit API credentials are correct
- Check if the subreddit exists and has posts
- Verify internet connection
- Check console logs for API errors
- The bot will work without Reddit integration if credentials are not provided

## Production Deployment

For production deployment on a VPS:

### Initial Setup
1. **Install Node.js and PM2:**
   ```bash
   # Install Node.js (Ubuntu/Debian)
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 globally
   sudo npm install -g pm2
   ```

2. **Clone and setup the bot:**
   ```bash
   git clone https://github.com/NaturalInflux/arc-raiders-countdown-bot.git
   cd arc-raiders-countdown-bot
   npm install
   ```

3. **Configure the bot:**
   ```bash
   cp env.example .env
   # Edit .env with your bot token and channel ID
   ```

4. **Deploy:**
   ```bash
   ./deploy.sh
   ```

### Updating the Bot
```bash
git pull origin main
npm install --production
pm2 restart arc-countdown-bot
```

### Monitoring
- Check status: `pm2 status`
- View logs: `pm2 logs arc-countdown-bot`
- Restart: `pm2 restart arc-countdown-bot`

## Release Date

Arc Raiders launches on **October 30, 2025**

The bot will automatically stop posting countdown messages after the release date and will post a "Released!" message instead.
