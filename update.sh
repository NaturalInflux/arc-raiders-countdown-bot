#!/bin/bash

# Update script for Arc Raiders Countdown Bot
echo "🔄 Updating Arc Raiders Countdown Bot..."

# Pull latest changes from GitHub
echo "📥 Pulling latest changes..."
git pull origin main

# Install any new dependencies
echo "📦 Installing dependencies..."
npm install --production

# Restart the bot
echo "🔄 Restarting bot..."
pm2 restart arc-countdown-bot

echo "✅ Update complete!"
echo "📊 Bot status:"
pm2 status
