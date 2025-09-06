<table>
<tr>
<td width="400">
  <img width="600" alt="Bot Message Example" src="https://github.com/user-attachments/assets/bd22cbfc-ee1e-40df-82a2-5cc82fcea017" />
</td>
<td>
  <strong>Discord bot that posts daily countdown messages until Arc Raiders release, including the top daily Reddit post from r/arcraiders and animated Twitch emotes that increase in amount and intensity.</strong>
  <br>
  <hr style="border: none; border-top: 2px solid #5865F2; margin: 2px 0;">
  <br>
  <img width="50" alt="PogChamping" src="https://cdn.discordapp.com/emojis/1229857218380304505.gif?size=48&animated=true&name=PogChamping" />
  <img width="50" alt="catPls" src="https://github.com/user-attachments/assets/e9709481-ff34-4506-ad0d-69c8232faf9f" />
  <img width="50" alt="agaCheck" src="https://cdn.discordapp.com/emojis/1411849176798462042.gif?size=48&animated=true&name=agaCheck" />
  <img width="50" alt="MONKE" src="https://cdn.discordapp.com/emojis/1229857286751518822.gif?size=48&animated=true&name=MONKE" />
  <img width="50" alt="borpaFast" src="https://cdn.discordapp.com/emojis/1411849800168505507.gif?size=48&animated=true&name=borpafast" />
  <img width="50" alt="veryCat" src="https://cdn.discordapp.com/emojis/1229852881465905212.gif?size=48&animated=true&name=veryCat" />
  <img width="50" alt="omgBruh" src="https://cdn.discordapp.com/emojis/1411863929117741218.gif?size=48&animated=true&name=omgBruh" />
  <img width="50" alt="pepeMeltdown" src="https://cdn.discordapp.com/emojis/1081967381460557824.gif?size=48&animated=true&name=pepeMeltdown" />
  <img width="50" alt="DEMONCAT" src="https://cdn.discordapp.com/emojis/1411879385509789736.gif?size=48&animated=true&name=DEMONCAT" />
  <img width="50" alt="PagBounce" src="https://cdn.discordapp.com/emojis/1229866080613437562.gif?size=48&animated=true&name=PagBounce" />
  <img width="50" alt="TryHarding" src="https://cdn.discordapp.com/emojis/1411880509499375736.gif?size=48&animated=true&name=TryHarding" />
  <img width="50" alt="AlienPls" src="https://cdn.discordapp.com/emojis/1411849327558529155.gif?size=48&animated=true&name=AlienPls" />
  <img width="50" alt="ForsenSingingAtYou" src="https://cdn.discordapp.com/emojis/1411879503982235679.gif?size=48&animated=true&name=ForsenSingingAtYou" />
  <img width="50" alt="zyzzRave" src="https://cdn.discordapp.com/emojis/1229861574152294550.gif?size=48&animated=true&name=zyzzRave" />
  <br><br>
  <a href="https://discord.com/oauth2/authorize?client_id=1413486967525478462&permissions=51264&integration_type=0&scope=bot">
    <img src="https://img.shields.io/badge/Add%20Bot%20to%20Your%20Server-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Add Bot to Your Server" />
  </a>
</td>
</tr>
</table>

# Bot Setup

Type: `/countdown-setup <channel name>`

Bot posts daily at 12:00 UTC. Want a different time? `/countdown-time <time in UTC>`

**Other Commands:**
- `/countdown-test` - Send a test message
- `/countdown-status` - Check your settings
- `/countdown-love` - Help cover server costs <3

---

# Self-Hosting the bot

Want to host the bot yourself? Instructions for Ubuntu Server below.

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

## Update:
> Pull latest changes
```bash
git pull origin main
```
> Restart the bot
```bash
pm2 restart arc-raiders-countdown-bot
```

## Monitoring

The bot includes an integrated monitoring system that automatically starts when the bot starts:

- Tracks baseline server count and calculates net changes
- Logs all guild join/leave events persistently
- Stores data in `~/.arc-raiders-monitor/`
- Runs continuously in the background
- Survives server restarts

> Make monitor script executable
```bash
chmod +x monitor.sh
```
> View monitoring data
```bash
./monitor
```
