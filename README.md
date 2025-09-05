# Arc Raiders Countdown Bot

Daily countdown to Arc Raiders (October 30, 2025) with the top Reddit post from r/arcraiders. Simple setup, works great.

## Quick Add (Most People)

[**Add bot to your server**](https://discord.com/oauth2/authorize?client_id=1413486967525478462&permissions=51264&integration_type=0&scope=bot)

Then type: `/countdown-setup channel:general`

Done. Bot posts daily at 12:00 UTC. Want a different time? `/countdown-time time:3pm`

**Commands:**
- `/countdown-setup channel` - Pick your channel
- `/countdown-time time` - Set posting time (3am, 15:00, 3:30pm all work)
- `/countdown-test` - Test it right now
- `/countdown-status` - Check your settings

**Troubleshooting:**
- Bot not working? You need "Manage Server" permission
- Wrong channel? Run setup command again

---

## Self-Hosting

Want to run your own? You'll need Node.js and a Discord bot token.

**Setup:**
1. `npm install`
2. Create bot at [Discord Developer Portal](https://discord.com/developers/applications)
3. Copy `env.example` to `.env` and add your bot token
4. `npm start`

**Reddit integration (optional):**
- Create app at [Reddit App Preferences](https://www.reddit.com/prefs/apps)
- Add credentials to `.env`
- Bot works fine without Reddit too

## Production (VPS)

**Deploy:**
```bash
git clone https://github.com/NaturalInflux/arc-raiders-countdown-bot.git
cd arc-raiders-countdown-bot
npm install
cp env.example .env
# Edit .env with your bot token
./deploy.sh
```

**Monitor:**
```bash
./monitor-bot.sh  # Watch live logs and server joins
pm2 status        # Check if running
```

**Update:**
```bash
git pull origin main
pm2 restart arc-countdown-bot
```