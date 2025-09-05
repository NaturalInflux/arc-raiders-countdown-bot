#!/bin/bash

# Arc Raiders Countdown Bot Monitor (Legacy)
# For smart monitoring, use: ./smart-monitor.sh

echo "🔍 Arc Raiders Countdown Bot Monitor (Legacy)"
echo "============================================="
echo ""
echo "⚠️  This is the legacy monitor. For smart monitoring, use:"
echo "   ./smart-monitor.sh start    # Start background monitoring"
echo "   ./smart-monitor.sh status   # View status"
echo "   ./smart-monitor.sh live     # Live logs"
echo ""

# Check if smart monitor is running
if [ -f "$HOME/.arc-raiders-monitor/monitor.pid" ] && kill -0 "$(cat "$HOME/.arc-raiders-monitor/monitor.pid")" 2>/dev/null; then
    echo "✅ Smart monitor is running in background"
    echo "   Use './smart-monitor.sh status' to view data"
    echo ""
fi

# Check if PM2 is running the bot
if pm2 list | grep -q "arc-raiders-countdown-bot"; then
    echo "✅ Bot is running"
    echo ""
    
    # Show basic status
    echo "📊 Basic Status:"
    pm2 logs arc-raiders-countdown-bot --lines 1 | grep -E "(Currently in|Total servers)" || echo "No server count info available"
    echo ""
    
    # Show recent guild events (joins/leaves)
    echo "🔔 Recent Server Events:"
    pm2 logs arc-raiders-countdown-bot --lines 50 | grep -E "(JOINED|LEFT) EVENT" | tail -5 || echo "No recent events"
    echo ""
    
    echo "💡 For detailed monitoring, start the smart monitor:"
    echo "   ./smart-monitor.sh start"
    echo ""
    
    # Ask if user wants to see live logs
    read -p "Show live logs? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📝 Live Logs (Press Ctrl+C to exit):"
        echo "=================================="
        pm2 logs arc-raiders-countdown-bot --lines 0 --raw
    fi
else
    echo "❌ Bot is not running"
    echo "Start it with: pm2 start arc-raiders-countdown-bot"
fi
