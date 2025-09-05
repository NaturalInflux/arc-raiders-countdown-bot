#!/bin/bash

# VPS Setup Script for Arc Raiders Countdown Bot
echo "🔧 Setting up VPS for Arc Raiders Countdown Bot..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install git if not already installed
echo "📦 Installing git..."
sudo apt install git -y

# Clone the repository (public repo, no auth needed)
echo "📥 Cloning repository..."
cd ~/projects/discord-bots/
git clone https://github.com/NaturalInflux/arc-raiders-countdown-bot.git arc-countdown
cd arc-countdown

# Install dependencies
echo "📦 Installing project dependencies..."
npm install

# Create logs directory
mkdir -p logs

# Make deploy script executable
chmod +x deploy.sh

echo "✅ VPS setup complete!"
echo "📝 Next steps:"
echo "1. Copy your config.js file to ~/projects/discord-bots/arc-countdown/"
echo "2. Run: ./deploy.sh"
echo "3. Check status with: pm2 status"
