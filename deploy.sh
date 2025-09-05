#!/bin/bash

# Arc Raiders Countdown Bot Deployment Script
echo "🚀 Deploying Arc Raiders Countdown Bot..."

# Pull latest changes from GitHub (public repo)
echo "📥 Pulling latest changes..."
git pull origin main

# Create logs directory if it doesn't exist
mkdir -p logs

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Stop existing PM2 process if running
echo "🛑 Stopping existing bot..."
pm2 stop arc-countdown-bot 2>/dev/null || true

# Start the bot with PM2
echo "▶️ Starting bot..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

echo "✅ Deployment complete!"
echo "📊 Bot status:"
pm2 status
