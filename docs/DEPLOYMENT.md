# Arc Raiders Countdown Bot - Deployment & Operations

> **📖 Master Documentation**: See [../SYSTEM_DOCUMENTATION.md](../SYSTEM_DOCUMENTATION.md) for complete system overview and cross-references to other documentation.

## Overview

This document provides comprehensive guidance for deploying, monitoring, and maintaining the Arc Raiders Countdown Bot in production environments.

## Production Deployment

### Prerequisites
- **Operating System**: Ubuntu 20.04+ (recommended) or compatible Linux distribution
- **Node.js**: Version 16.0.0 or higher
- **PM2**: Process manager for Node.js applications
- **Git**: Version control system
- **Discord Bot**: Created Discord application with bot token
- **Reddit App**: Reddit application for API access (optional)

### Initial Setup

#### 1. System Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install git -y
```

#### 2. Application Deployment
```bash
# Clone repository
git clone https://github.com/NaturalInflux/arc-raiders-countdown-bot.git
cd arc-raiders-countdown-bot

# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Make scripts executable
chmod +x deploy.sh
chmod +x monitor
```

#### 3. Environment Configuration
Edit `.env` file with your configuration:
```bash
# Required
DISCORD_TOKEN=your_bot_token_here

# Optional - Release Date Configuration
RELEASE_DATE=2025-10-30T00:00:00Z

# Optional Reddit Integration
REDDIT_CLIENT_ID=your_reddit_client_id_here
REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
REDDIT_USERNAME=your_reddit_username_here
REDDIT_PASSWORD=your_reddit_password_here

# Optional Health Check Server
HEALTH_PORT=3000
```

#### 4. Initial Deployment
```bash
# Run deployment script
./deploy.sh

# Start the bot
npm start
```

## PM2 Configuration

### Process Management
The bot uses PM2 for process management with the following configuration (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [{
    name: 'arc-raiders-countdown-bot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000
  }]
};
```

### PM2 Commands
```bash
# Start bot
pm2 start ecosystem.config.js

# Stop bot
pm2 stop arc-raiders-countdown-bot

# Restart bot
pm2 restart arc-raiders-countdown-bot

# Reload bot (zero-downtime)
pm2 reload arc-raiders-countdown-bot

# Delete bot from PM2
pm2 delete arc-raiders-countdown-bot

# Show bot status
pm2 status

# Show bot logs
pm2 logs arc-raiders-countdown-bot

# Monitor bot resources
pm2 monit
```

### Automatic Startup
```bash
# Save current PM2 processes
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions provided by PM2 startup command
# This will create a systemd service for automatic startup
```

## Monitoring & Health Checks

### Health Check Endpoint
The bot provides an HTTP health check endpoint for external monitoring:

**Endpoint**: `http://localhost:3000/health`
**Method**: GET
**Response Format**: JSON

**Health Response Example**:
```json
{
  "status": "healthy",
  "uptime": 12345.67,
  "servers": 5,
  "activeCronJobs": 5,
  "memory": {
    "rss": 45678912,
    "heapTotal": 20971520,
    "heapUsed": 12345678,
    "external": 1234567
  },
  "timestamp": "2025-01-06T12:00:00.000Z"
}
```

### Monitoring Script
The bot includes a monitoring script for quick status checks:

```bash
# Make monitor script executable
chmod +x monitor

# View monitoring data
./monitor

# Output example:
# Server Count: 5
# Last Update: 2025-01-06T12:00:00.000Z
# Status: Healthy
```

### External Monitoring
You can use external monitoring tools to check the health endpoint:

```bash
# Simple health check
curl http://localhost:3000/health

# Health check with timeout
curl --max-time 10 http://localhost:3000/health

# Health check with error handling
curl -f http://localhost:3000/health || echo "Health check failed"
```

## Logging & Debugging

### Log Files
PM2 creates the following log files in the `logs/` directory:

- **`err.log`**: Error logs only
- **`out.log`**: Standard output logs
- **`combined.log`**: Combined error and output logs

### Log Management
```bash
# View real-time logs
pm2 logs arc-raiders-countdown-bot

# View error logs only
pm2 logs arc-raiders-countdown-bot --err

# View output logs only
pm2 logs arc-raiders-countdown-bot --out

# Clear logs
pm2 flush arc-raiders-countdown-bot

# Log rotation (recommended for production)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Debug Commands
```bash
# Check bot status
pm2 status

# View detailed process information
pm2 show arc-raiders-countdown-bot

# Monitor resource usage
pm2 monit

# Check system resources
htop
free -h
df -h
```

## Updates & Maintenance

### Application Updates
```bash
# Pull latest changes
git pull origin main

# Install new dependencies (if any)
npm install

# Restart bot with new code
pm2 restart arc-raiders-countdown-bot

# Verify bot is running
pm2 status
```

### Configuration Updates
```bash
# Edit environment variables
nano .env

# Restart bot to apply changes
pm2 restart arc-raiders-countdown-bot
```

### Backup Procedures
The bot automatically creates configuration backups, but you should also:

```bash
# Backup configuration files
cp server-config.json server-config-backup-$(date +%Y%m%d).json

# Backup environment file
cp .env .env.backup

# Backup logs (if needed)
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

## Troubleshooting

### Common Issues

#### Bot Offline
**Symptoms**: Bot appears offline in Discord
**Solutions**:
```bash
# Check PM2 status
pm2 status

# Restart bot
pm2 restart arc-raiders-countdown-bot

# Check logs for errors
pm2 logs arc-raiders-countdown-bot --err

# Check system resources
pm2 monit
```

#### No Countdown Messages
**Symptoms**: Bot online but no messages posted
**Causes & Solutions**:
- **Channel not configured**: Run `/countdown-setup` in Discord
- **Permission issues**: Check bot permissions in channel
- **Game already launched**: Check release date vs current date
- **Cron job issues**: Check PM2 logs for cron errors

#### Reddit Integration Issues
**Symptoms**: No Reddit content in messages
**Solutions**:
- Check Reddit API credentials in `.env`
- Verify Reddit 2FA settings
- Check PM2 logs for Reddit API errors
- Bot continues working without Reddit content

#### Emoji Display Issues
**Symptoms**: Emojis showing as text or missing
**Solutions**:
1. **Check Bot Permissions**: Ensure "Use External Emojis" permission
2. **Verify Emoji Sources**: Custom emojis from various Discord servers
3. **Test Emoji Display**: Use `/countdown-test` command
4. **Permission Verification**: Check server emoji restrictions

#### Port Conflicts
**Symptoms**: Health check server fails to start
**Solutions**:
```bash
# Check if port 3000 is in use
netstat -tulpn | grep :3000
# or
lsof -i :3000

# Change health check port
export HEALTH_PORT=3001
pm2 restart arc-raiders-countdown-bot
```

#### Memory Issues
**Symptoms**: Bot hitting PM2 memory limits
**Solutions**:
```bash
# Check memory usage
pm2 monit

# Increase PM2 memory limit in ecosystem.config.js
# Change max_memory_restart from '1G' to '2G'

# Restart with new configuration
pm2 restart arc-raiders-countdown-bot
```

### Error Analysis

#### Discord API Errors
- **50013 (Permission Denied)**: Check bot permissions
- **429 (Too Many Requests)**: Rate limit hit, bot will retry automatically
- **10003 (Unknown Channel)**: Channel deleted or bot lost access
- **50001 (Missing Access)**: Bot needs channel access

#### Reddit API Errors
- **401 (Unauthorized)**: Check Reddit credentials
- **403 (Forbidden)**: Check Reddit app permissions
- **429 (Rate Limited)**: Reddit rate limit hit
- **500 (Internal Server Error)**: Reddit API issue

#### System Errors
- **ENOENT (File Not Found)**: Missing configuration files
- **EACCES (Permission Denied)**: File system permissions
- **EMFILE (Too Many Open Files)**: System file descriptor limit
- **ENOMEM (Out of Memory)**: System memory exhaustion

## Security Considerations

### Token Management
- **Environment Variables**: All sensitive data in `.env` file
- **File Permissions**: Restrict access to `.env` file
- **Version Control**: Never commit tokens to Git
- **Regular Rotation**: Rotate tokens periodically

### File System Security
```bash
# Set proper file permissions
chmod 600 .env
chmod 644 server-config.json
chmod 755 deploy.sh
chmod 755 monitor

# Restrict directory access
chmod 700 logs/
```

### Network Security
- **Firewall**: Configure firewall to allow only necessary ports
- **Health Endpoint**: Consider restricting health endpoint access
- **HTTPS**: Use HTTPS for external monitoring if needed

## Performance Optimization

### Memory Management
- **Typical Usage**: 50-100MB under normal operation
- **Peak Usage**: Up to 200MB during Reddit API calls
- **PM2 Limit**: 1GB with automatic restart
- **Monitoring**: Use `pm2 monit` to track memory usage

### API Efficiency
- **Token Caching**: Reddit tokens cached for 45 minutes
- **Daily Caching**: Reddit posts fetched once per day
- **Request Timeouts**: 10-second timeout for all API requests
- **Rate Limit Handling**: Smart retry with exponential backoff

### System Optimization
```bash
# Increase file descriptor limit
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize Node.js memory
export NODE_OPTIONS="--max-old-space-size=1024"

# Enable PM2 clustering (if needed)
pm2 start ecosystem.config.js -i max
```

## Backup & Recovery

### Configuration Backups
The bot automatically creates configuration backups:
- **Backup Naming**: `server-config-backup-{timestamp}.json`
- **Retention**: 5 most recent backups
- **Location**: Same directory as `server-config.json`

### Manual Backups
```bash
# Create full backup
tar -czf bot-backup-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=logs \
  --exclude=.git \
  .

# Restore from backup
tar -xzf bot-backup-20250106.tar.gz
```

### Recovery Procedures
```bash
# Restore configuration
cp server-config-backup-1704067200000.json server-config.json

# Restore environment
cp .env.backup .env

# Restart bot
pm2 restart arc-raiders-countdown-bot
```

## Scaling Considerations

### Current Limitations
- **Single Process**: Single Node.js process
- **JSON Storage**: File-based configuration storage
- **Memory Limits**: PM2 memory limit of 1GB

### Future Scaling
- **Database Migration**: Move from JSON to database storage
- **Load Balancing**: Multiple bot instances for large servers
- **Redis Caching**: Distributed caching layer
- **Microservices**: Split into multiple services

### Performance Monitoring
```bash
# Monitor system resources
htop
iotop
netstat -tulpn

# Monitor PM2 processes
pm2 monit

# Monitor application logs
pm2 logs arc-raiders-countdown-bot --lines 100
```

## Maintenance Schedule

### Daily Tasks
- Check bot status: `pm2 status`
- Review error logs: `pm2 logs arc-raiders-countdown-bot --err`
- Monitor resource usage: `pm2 monit`

### Weekly Tasks
- Review all logs for patterns
- Check disk space usage
- Verify backup integrity
- Update dependencies if needed

### Monthly Tasks
- Rotate log files
- Review and update tokens
- Performance analysis
- Security audit

---

This deployment guide provides comprehensive instructions for deploying, monitoring, and maintaining the Arc Raiders Countdown Bot in production environments. Follow these procedures to ensure reliable operation and easy maintenance.
