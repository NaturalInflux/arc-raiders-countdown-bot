Daily countdown post in Discord channel till Arc Raiders release (October 30, 2025) with the top daily Reddit post from r/arcraiders.

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

Want to run on your own server?

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
> Create a Discord bot on the [Discord Developer Portal](https://discord.com/developers/applications)
> Optional: Create a Reddit app on the [Reddit App Preferences](https://www.reddit.com/prefs/apps)
> Copy environment file
```bash
cp env.example .env
```
> Edit .env with your Discord bot token (and Reddit credentials)
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
> Make script executable
```bash
chmod +x monitor-bot.sh
```
> Run monitor script to watch live logs and server joins
```bash
./monitor-bot.sh
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
pm2 restart arc-countdown-bot
```