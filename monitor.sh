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
    
    # Performance Metrics (using pm2 list output)
    echo "📊 Performance:"
    PM2_STATUS=$(pm2 list | grep "arc-raiders-countdown-bot")
    if [ ! -z "$PM2_STATUS" ]; then
        MEMORY=$(echo $PM2_STATUS | awk '{print $10}')
        CPU=$(echo $PM2_STATUS | awk '{print $9}')
        STATUS=$(echo $PM2_STATUS | awk '{print $8}')
        RESTARTS=$(echo $PM2_STATUS | awk '{print $7}')
        echo "  Memory: $MEMORY"
        echo "  CPU: $CPU"
        echo "  Status: $STATUS"
        echo "  Restarts: $RESTARTS"
    else
        echo "  Unable to get performance data"
    fi
    echo ""
    
    # Server Status
    echo "🌐 Server Status:"
    pm2 logs arc-raiders-countdown-bot --lines 1 | grep -E "(Currently in|Total servers)" || echo "  No server count info available"
    echo ""
    
    # Recent Activity
    echo "🔔 Recent Server Events:"
    pm2 logs arc-raiders-countdown-bot --lines 50 | grep -E "(JOINED|LEFT) EVENT" | tail -5 || echo "  No recent events"
    echo ""
    
    # Error Summary
    echo "⚠️  Recent Errors:"
    pm2 logs arc-raiders-countdown-bot --lines 100 | grep -E "❌|ERROR" | tail -3 || echo "  No recent errors"
    echo ""
    
    # Bot Activity
    echo "📈 Bot Activity:"
    echo "  Last countdown post: $(pm2 logs arc-raiders-countdown-bot --lines 200 | grep "Countdown message posted" | tail -1 | cut -d' ' -f1-2 || echo "None today")"
    echo "  Reddit API status: $(pm2 logs arc-raiders-countdown-bot --lines 50 | grep -E "(Reddit OAuth|Reddit post)" | tail -1 | grep -o "✅\|❌" || echo "Unknown")"
    echo ""
    
    # Show live logs
    echo "📝 Live Logs (Press Ctrl+C to exit):"
    echo "=================================="
    pm2 logs arc-raiders-countdown-bot --lines 0 --raw
else
    echo "❌ Bot is not running"
    echo "Start it with: pm2 start arc-raiders-countdown-bot"
fi
