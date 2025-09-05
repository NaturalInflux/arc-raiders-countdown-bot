#!/bin/bash

# Arc Raiders Countdown Bot Smart Monitor
# This script runs in the background and logs everything persistently

MONITOR_DIR="$HOME/.arc-raiders-monitor"
LOG_FILE="$MONITOR_DIR/monitor.log"
DATA_FILE="$MONITOR_DIR/monitor-data.json"
PID_FILE="$MONITOR_DIR/monitor.pid"

# Create monitor directory if it doesn't exist
mkdir -p "$MONITOR_DIR"

# Function to log with timestamp
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Function to update data file
update_data() {
    local key="$1"
    local value="$2"
    
    # Create data file if it doesn't exist
    if [ ! -f "$DATA_FILE" ]; then
        echo "{}" > "$DATA_FILE"
    fi
    
    # Update JSON data (simple approach)
    if [ -f "$DATA_FILE" ]; then
        # Use a simple approach to update JSON
        temp_file=$(mktemp)
        if command -v jq >/dev/null 2>&1; then
            jq ". + {\"$key\": \"$value\", \"last_updated\": \"$(date -Iseconds)\"}" "$DATA_FILE" > "$temp_file"
            mv "$temp_file" "$DATA_FILE"
        else
            # Fallback without jq
            echo "{\"$key\": \"$value\", \"last_updated\": \"$(date -Iseconds)\"}" > "$DATA_FILE"
        fi
    fi
}

# Function to get data
get_data() {
    local key="$1"
    if [ -f "$DATA_FILE" ] && command -v jq >/dev/null 2>&1; then
        jq -r ".$key // empty" "$DATA_FILE"
    fi
}

# Function to start monitoring
start_monitor() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "Monitor is already running (PID: $(cat "$PID_FILE"))"
        return 1
    fi
    
    echo "Starting smart monitor..."
    log_message "Smart monitor started"
    
    # Store initial baseline server count
    initial_count=$(pm2 logs arc-raiders-countdown-bot --lines 10 | grep -o "Currently in [0-9]* servers" | tail -1 | grep -o "[0-9]*" || echo "0")
    if [ -n "$initial_count" ] && [ "$initial_count" -gt 0 ]; then
        update_data "baseline_servers" "$initial_count"
        log_message "Baseline server count set to: $initial_count"
    else
        update_data "baseline_servers" "0"
        log_message "Could not determine baseline server count, set to 0"
    fi
    
    # Start background monitoring loop
    (
        echo $$ > "$PID_FILE"
        while true; do
            # Check bot status
            if pm2 list | grep -q "arc-raiders-countdown-bot"; then
                # Get current server count
                current_count=$(pm2 logs arc-raiders-countdown-bot --lines 5 | grep -o "Currently in [0-9]* servers" | tail -1 | grep -o "[0-9]*" || echo "")
                
                if [ -n "$current_count" ] && [ "$current_count" -gt 0 ]; then
                    baseline=$(get_data "baseline_servers")
                    if [ -n "$baseline" ] && [ "$baseline" -gt 0 ]; then
                        difference=$((current_count - baseline))
                        update_data "current_servers" "$current_count"
                        update_data "server_difference" "$difference"
                        
                        # Log significant changes
                        if [ "$difference" -ne "$(get_data "last_difference" 2>/dev/null || echo "0")" ]; then
                            log_message "Server count changed: $current_count (difference: $difference)"
                            update_data "last_difference" "$difference"
                        fi
                    fi
                fi
                
                # Log guild events
                pm2 logs arc-raiders-countdown-bot --lines 5 | grep -E "(JOINED|LEFT) EVENT" | while read -r line; do
                    if ! grep -q "$line" "$LOG_FILE"; then
                        log_message "GUILD_EVENT: $line"
                    fi
                done
                
                # Log errors
                pm2 logs arc-raiders-countdown-bot --lines 5 | grep -E "❌|ERROR|Error" | while read -r line; do
                    if ! grep -q "$line" "$LOG_FILE"; then
                        log_message "ERROR: $line"
                    fi
                done
            else
                log_message "WARNING: Bot is not running"
            fi
            
            # Sleep for 30 seconds
            sleep 30
        done
    ) &
    
    echo "Smart monitor started (PID: $!)"
    echo "Logs: $LOG_FILE"
    echo "Data: $DATA_FILE"
}

# Function to stop monitoring
stop_monitor() {
    if [ -f "$PID_FILE" ]; then
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            rm -f "$PID_FILE"
            log_message "Smart monitor stopped"
            echo "Smart monitor stopped"
        else
            echo "Monitor is not running"
            rm -f "$PID_FILE"
        fi
    else
        echo "Monitor is not running"
    fi
}

# Function to show status
show_status() {
    echo "🔍 Arc Raiders Countdown Bot Smart Monitor"
    echo "=========================================="
    echo ""
    
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "✅ Smart monitor is running (PID: $(cat "$PID_FILE"))"
    else
        echo "❌ Smart monitor is not running"
        echo "Start with: $0 start"
        return 1
    fi
    
    echo ""
    echo "📊 Current Status:"
    
    # Show server count info
    baseline=$(get_data "baseline_servers")
    current=$(get_data "current_servers")
    difference=$(get_data "server_difference")
    
    if [ -n "$baseline" ] && [ -n "$current" ] && [ -n "$difference" ]; then
        echo "  Baseline servers: $baseline"
        echo "  Current servers: $current"
        echo "  Net change: $difference"
    else
        echo "  Server data not available yet"
    fi
    
    echo ""
    echo "🔔 Recent Events (last 10):"
    if [ -f "$LOG_FILE" ]; then
        tail -10 "$LOG_FILE" | grep -E "(GUILD_EVENT|ERROR)" || echo "No recent events"
    else
        echo "No log file found"
    fi
    
    echo ""
    echo "📝 Recent Logs (last 20):"
    if [ -f "$LOG_FILE" ]; then
        tail -20 "$LOG_FILE"
    else
        echo "No log file found"
    fi
}

# Function to show live logs
show_live() {
    echo "📝 Live Monitor Logs (Press Ctrl+C to exit):"
    echo "============================================="
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "No log file found"
    fi
}

# Main script logic
case "$1" in
    start)
        start_monitor
        ;;
    stop)
        stop_monitor
        ;;
    status)
        show_status
        ;;
    live)
        show_live
        ;;
    restart)
        stop_monitor
        sleep 2
        start_monitor
        ;;
    *)
        echo "Usage: $0 {start|stop|status|live|restart}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the smart monitor in background"
        echo "  stop    - Stop the smart monitor"
        echo "  status  - Show current status and recent logs"
        echo "  live    - Show live logs (tail -f)"
        echo "  restart - Restart the smart monitor"
        echo ""
        echo "Files:"
        echo "  Logs: $LOG_FILE"
        echo "  Data: $DATA_FILE"
        echo "  PID:  $PID_FILE"
        ;;
esac
