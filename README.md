# Arc Raiders Discord Countdown Bot

Daily countdown post in Discord channel to Arc Raiders release (October 30, 2025) with the top daily Reddit post from r/arcraiders.

## Quick Add

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

## Self-Hosting

Want to run on your own server?

**Deploy:**
```bash
git clone https://github.com/NaturalInflux/arc-raiders-countdown-bot.git
```
```bash
cd arc-raiders-countdown-bot
```
```bash
npm install
```
```bash
cp env.example .env
```
```bash
./deploy.sh
```
```bash
npm start
```
> Create a Discord bot on the [Discord Developer Portal](https://discord.com/developers/applications)
> Optional: Create a Reddit apo on the [Reddit App Preferences](https://www.reddit.com/prefs/apps)
> Edit .env with your Discord bot token (and Reddit credentials)

**Monitor:**
```bash
./monitor-bot.sh
```
> Watch live logs and server joins
```bash
pm2 status
```
> Check if running

**Update:**
```bash
git pull origin main
```
```bash
pm2 restart arc-countdown-bot
```