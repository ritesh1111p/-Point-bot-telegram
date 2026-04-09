# -Point-bot-telegram
# 🤖 Telegram Leaderboard Bot

A Telegram bot with a point system and top 10 leaderboard. Only the admin can add/remove/set points.

---

## ✅ Features
- Multi-user point system
- Top 10 leaderboard
- Only admin can manage points
- Users can check their own points and rank
- SQLite database (data persists)

---

## 🚀 Setup Guide

### Step 1 — Get a Bot Token
1. Open Telegram and go to [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Enter a name and username (username must end with `bot`)
4. Copy the token — this is your `BOT_TOKEN`

### Step 2 — Get Your Admin ID
1. Go to [@userinfobot](https://t.me/userinfobot) on Telegram
2. Send `/start`
3. Copy your **ID** number — this is your `ADMIN_ID`

### Step 3 — Upload to GitHub
1. Create a new repository on [github.com](https://github.com)
2. Upload these 2 files:
   - `bot.js`
   - `package.json`

### Step 4 — Deploy on Railway
1. Log in at [railway.app](https://railway.app) with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Go to the **Variables** tab and add:
   - `BOT_TOKEN` = your Bot Token
   - `ADMIN_ID` = your Telegram User ID (numbers only)
5. Deploy — your bot is live!

---

## 📋 Command List

### For Everyone:
| Command | Description |
|---------|-------------|
| `/start` | Start the bot |
| `/mypoints` | Check your points and rank |
| `/leaderboard` | View top 10 users |
| `/help` | Show all commands |

### Admin Only:
| Command | Description |
|---------|-------------|
| `/addpoints 123456789 50` | Add 50 points to a user |
| `/removepoints 123456789 20` | Remove 20 points from a user |
| `/setpoints 123456789 100` | Set a user's points to exactly 100 |
| `/adduser 123456789 John` | Manually add a user by ID |
| `/stats` | View all users and their points |

---

## ❓ How to Find a User's ID?
- Ask them to go to [@userinfobot](https://t.me/userinfobot) and send `/start`
- Or use `/stats` after they have started your bot once
