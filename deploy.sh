#!/bin/bash

# Arc Raiders Countdown Bot Deployment Script
set -e  # Exit on any error

echo "🚀 Deploying Arc Raiders Countdown Bot..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found! Please create it from env.example"
    echo "   cp env.example .env"
    echo "   # Then edit .env with your bot token and channel ID"
    exit 1
fi

# Check if required environment variables are set
if ! grep -q "DISCORD_TOKEN=" .env || ! grep -q "CHANNEL_ID=" .env; then
    echo "❌ Required environment variables not found in .env file"
    echo "   Please ensure DISCORD_TOKEN and CHANNEL_ID are set in your .env file"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed! Please install Node.js first"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed! Please install npm first"
    exit 1
fi

# Pull latest changes from GitHub (public repo)
echo "📥 Pulling latest changes..."
if ! git pull origin main; then
    echo "❌ Failed to pull latest changes from GitHub"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Install dependencies
echo "📦 Installing dependencies..."
if ! npm install --production; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Stop existing PM2 process if running
echo "🛑 Stopping existing bot..."
pm2 stop arc-raiders-countdown-bot 2>/dev/null || true

# Start the bot with PM2
echo "▶️ Starting bot..."
if ! pm2 start ecosystem.config.js; then
    echo "❌ Failed to start bot with PM2"
    exit 1
fi

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot (only if not already set up)
if ! pm2 startup | grep -q "already"; then
    echo "🔧 Setting up PM2 to start on boot..."
    pm2 startup
fi

echo "✅ Deployment complete!"
echo "📊 Bot status:"
pm2 status
