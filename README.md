# Arc Raiders Countdown Bot

A Discord bot that posts daily countdown messages for the release of Arc Raiders, launching on October 30, 2025.

## Features

- 🎮 Daily countdown messages posted automatically at 9:00 AM UTC
- 📅 Beautiful embed messages with game artwork
- 🚀 Special messages for the final week and release day
- ⚡ Manual countdown command (`/countdown`)
- 🎯 Simple setup and configuration

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
6. Under "Privileged Gateway Intents", enable:
   - Server Members Intent
   - Message Content Intent

### 4. Invite Bot to Your Server

1. Go to the "OAuth2" > "URL Generator" section
2. Select scopes: `bot` and `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Use Slash Commands
   - Embed Links
   - Attach Files
4. Copy the generated URL and open it in your browser
5. Select your server and authorize the bot

### 5. Get Channel ID

1. In Discord, right-click on the channel where you want countdown messages
2. Select "Copy Channel ID"
3. You'll need this for the configuration

### 6. Configure the Bot

1. Open `config.js`
2. Replace `your_bot_token_here` with your actual bot token
3. Replace `your_channel_id_here` with the channel ID you copied

### 7. Run the Bot

```bash
npm start
```

## Usage

- The bot will automatically post countdown messages every day at 9:00 AM UTC
- Users can use `/countdown` to get the current countdown status
- Special formatting for the final week and release day

## File Structure

```
arc-raiders-countdown-bot/
├── bot.js              # Main bot file
├── config.js           # Configuration file (fill in your values)
├── config.example.js   # Example configuration
├── package.json        # Dependencies
└── README.md          # This file
```

## Configuration

Edit `config.js` with your bot token and channel ID:

```javascript
module.exports = {
    DISCORD_TOKEN: 'your_actual_bot_token',
    CHANNEL_ID: 'your_actual_channel_id'
};
```

## Troubleshooting

- Make sure your bot has the correct permissions in the channel
- Verify the channel ID is correct (right-click channel > Copy ID)
- Check that the bot token is valid and not expired
- Ensure the bot is online in your server

## Release Date

Arc Raiders launches on **October 30, 2025**

The bot will automatically stop posting countdown messages after the release date and will post a "Released!" message instead.
