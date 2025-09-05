#!/bin/bash

# Arc Raiders Countdown Bot Monitor
# Usage: ./monitor.sh

echo "🔍 Arc Raiders Countdown Bot Monitor"
echo "=================================="
echo ""

# Check if PM2 is running the bot
if pm2 list | grep -q "arc-raiders-countdown-bot"; then
    echo "✅ Bot is running"
    echo ""
    
    # Show current server count
    echo "📊 Current Status:"
    pm2 logs arc-raiders-countdown-bot --lines 1 | grep -E "(Currently in|Total servers)" || echo "No server count info available"
    echo ""
    
    # Show recent guild events (joins/leaves)
    echo "🔔 Recent Server Events:"
    pm2 logs arc-raiders-countdown-bot --lines 50 | grep -E "(JOINED|LEFT) EVENT" | tail -10 || echo "No recent events"
    echo ""
    
    # Show live logs
    echo "📝 Live Logs (Press Ctrl+C to exit):"
    echo "=================================="
    pm2 logs arc-raiders-countdown-bot --lines 0 --raw
else
    echo "❌ Bot is not running"
    echo "Start it with: pm2 start arc-raiders-countdown-bot"
fi
