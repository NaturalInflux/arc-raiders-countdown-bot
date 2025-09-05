Daily countdown post in Discord channel up to Arc Raiders release (October 30, 2025).
With the top daily Reddit post from r/arcraiders.

# Quick Add

[**Add bot to your server**](https://discord.com/oauth2/authorize?client_id=1413486967525478462&permissions=51264&integration_type=0&scope=bot)

Then type:
`/countdown-setup <channel name>`

Bot posts daily at 12:00 UTC.
Want a different time?
`/countdown-time <time in UTC>`

**Other Commands:**
- `/countdown-test` - Test it right now
- `/countdown-status` - Check your settings

---

# Self-Hosting

Want to run on your own server? Instructions for Ubuntu below.

## Deploy:
> Clone the repository
```bash
git clone https://github.com/NaturalInflux/arc-raiders-countdown-bot.git
```
> Navigate to the directory
```bash
cd arc-raiders-countdown-bot
```
> Install dependencies
```bash
npm install
```
> Copy environment file to .env
```bash
cp env.example .env
```
- Create a Discord bot on the [Discord Developer Portal](https://discord.com/developers/applications)
- Create a Reddit app of type "Script" on the [Reddit App Preferences](https://www.reddit.com/prefs/apps)
- Edit .env with your Discord bot token and Reddit credentials (comments inside)
> Make deploy script executable
```bash
chmod +x deploy.sh
```
> Run deploy script
```bash
./deploy.sh
```
> Start the bot
```bash
npm start
```

## Monitor:
> Make monitor script executable
```bash
chmod +x monitor.sh
```
> Run monitor script to watch live logs and server joins
```bash
./monitor.sh
```
> Check if running
```bash
pm2 status
```

### Update:
> Pull latest changes
```bash
git pull origin main
```
> Restart the bot
```bash
pm2 restart arc-raiders-countdown-bot
```

### Monitoring System

The bot includes an integrated monitoring system that automatically starts when the bot starts:

> Make monitor script executable
```bash
chmod +x monitor.sh
```
> View monitoring data
```bash
./monitor
```

The monitoring system:
- **Automatically starts** when the bot starts
- **Tracks baseline server count** and calculates net changes
- **Logs all guild join/leave events** persistently
- **Stores data in** `~/.arc-raiders-monitor/`
- **Runs continuously** in the background
- **Survives server restarts**