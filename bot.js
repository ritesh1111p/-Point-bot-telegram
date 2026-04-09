const TelegramBot = require("node-telegram-bot-api");
const Database = require("better-sqlite3");
const path = require("path");

// ===================== CONFIG =====================
const TOKEN = "8756023029:AAHnBDv6MMnVA5WQmR34c-Nz3L8qA_4irLg";
const ADMIN_ID = 5924662015;
// ==================================================

const bot = new TelegramBot(TOKEN, { polling: true });
const db = new Database(path.join(__dirname, "data.db"));

// Database setup
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    username TEXT,
    full_name TEXT,
    points INTEGER DEFAULT 0
  )
`);

function upsertUser(userId, username, fullName) {
  const existing = db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId);
  if (!existing) {
    db.prepare("INSERT INTO users (user_id, username, full_name, points) VALUES (?, ?, ?, 0)")
      .run(userId, username || null, fullName || "Unknown");
  } else {
    db.prepare("UPDATE users SET username = ?, full_name = ? WHERE user_id = ?")
      .run(username || existing.username, fullName || existing.full_name, userId);
  }
}

function isAdmin(userId) {
  return userId === ADMIN_ID;
}

// ===================== COMMANDS =====================

// /start
bot.onText(/\/start/, (msg) => {
  const { id, username, first_name, last_name } = msg.from;
  const fullName = [first_name, last_name].filter(Boolean).join(" ");
  upsertUser(id, username, fullName);

  bot.sendMessage(msg.chat.id,
    `👋 *Welcome, ${first_name}!*\n\n` +
    `🏆 This bot has a point & leaderboard system.\n\n` +
    `📋 *Commands:*\n` +
    `/mypoints — Check your points & rank\n` +
    `/leaderboard — View top 10\n` +
    `/help — Show all commands`,
    { parse_mode: "Markdown" }
  );
});

// /help
bot.onText(/\/help/, (msg) => {
  const isAdm = isAdmin(msg.from.id);
  let text =
    `📋 *Command List:*\n\n` +
    `/mypoints — Check your points & rank\n` +
    `/leaderboard — View top 10\n`;

  if (isAdm) {
    text +=
      `\n🔑 *Admin Commands:*\n` +
      `/addpoints <user_id> <amount> — Add points to a user\n` +
      `/removepoints <user_id> <amount> — Remove points from a user\n` +
      `/setpoints <user_id> <amount> — Set exact points for a user\n` +
      `/adduser <user_id> <name> — Manually add a user\n` +
      `/stats — View all users\n`;
  }

  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// /mypoints
bot.onText(/\/mypoints/, (msg) => {
  const { id, username, first_name, last_name } = msg.from;
  const fullName = [first_name, last_name].filter(Boolean).join(" ");
  upsertUser(id, username, fullName);

  const user = db.prepare("SELECT * FROM users WHERE user_id = ?").get(id);
  const rank = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE points > ?").get(user.points).cnt + 1;

  bot.sendMessage(msg.chat.id,
    `👤 *${user.full_name}*\n\n` +
    `💎 Points: *${user.points}*\n` +
    `🏅 Rank: *#${rank}*`,
    { parse_mode: "Markdown" }
  );
});

// /leaderboard
bot.onText(/\/leaderboard/, (msg) => {
  const top10 = db.prepare("SELECT * FROM users ORDER BY points DESC LIMIT 10").all();

  if (top10.length === 0) {
    return bot.sendMessage(msg.chat.id, "❌ No users found yet.");
  }

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

  let text = `🏆 *Leaderboard — Top 10*\n\n`;
  top10.forEach((user, i) => {
    const name = user.username ? `@${user.username}` : user.full_name;
    text += `${medals[i]} ${name} — *${user.points}* pts\n`;
  });

  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// /addpoints <user_id> <amount>
bot.onText(/\/addpoints (.+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You are not an admin!");

  const args = match[1].trim().split(/\s+/);
  if (args.length < 2) return bot.sendMessage(msg.chat.id, "⚠️ Usage: /addpoints <user_id> <amount>");

  const userId = parseInt(args[0]);
  const amount = parseInt(args[1]);

  if (isNaN(userId) || isNaN(amount) || amount <= 0) {
    return bot.sendMessage(msg.chat.id, "❌ Please provide a valid User ID and amount.");
  }

  const user = db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId);
  if (!user) return bot.sendMessage(msg.chat.id,
    `❌ User ID \`${userId}\` not found.\n\nUse /adduser to add them manually.`,
    { parse_mode: "Markdown" }
  );

  db.prepare("UPDATE users SET points = points + ? WHERE user_id = ?").run(amount, userId);
  const updated = db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId);

  bot.sendMessage(msg.chat.id,
    `✅ Added *+${amount}* points to *${user.full_name}*!\n` +
    `💎 Total Points: *${updated.points}*`,
    { parse_mode: "Markdown" }
  );
});

// /removepoints <user_id> <amount>
bot.onText(/\/removepoints (.+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You are not an admin!");

  const args = match[1].trim().split(/\s+/);
  if (args.length < 2) return bot.sendMessage(msg.chat.id, "⚠️ Usage: /removepoints <user_id> <amount>");

  const userId = parseInt(args[0]);
  const amount = parseInt(args[1]);

  if (isNaN(userId) || isNaN(amount) || amount <= 0) {
    return bot.sendMessage(msg.chat.id, "❌ Please provide a valid User ID and amount.");
  }

  const user = db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId);
  if (!user) return bot.sendMessage(msg.chat.id, `❌ User ID \`${userId}\` not found.`, { parse_mode: "Markdown" });

  const newPoints = Math.max(0, user.points - amount);
  db.prepare("UPDATE users SET points = ? WHERE user_id = ?").run(newPoints, userId);

  bot.sendMessage(msg.chat.id,
    `✅ Removed *-${amount}* points from *${user.full_name}*!\n` +
    `💎 Total Points: *${newPoints}*`,
    { parse_mode: "Markdown" }
  );
});

// /setpoints <user_id> <amount>
bot.onText(/\/setpoints (.+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You are not an admin!");

  const args = match[1].trim().split(/\s+/);
  if (args.length < 2) return bot.sendMessage(msg.chat.id, "⚠️ Usage: /setpoints <user_id> <amount>");

  const userId = parseInt(args[0]);
  const amount = parseInt(args[1]);

  if (isNaN(userId) || isNaN(amount) || amount < 0) {
    return bot.sendMessage(msg.chat.id, "❌ Please provide a valid User ID and amount.");
  }

  const user = db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId);
  if (!user) return bot.sendMessage(msg.chat.id, `❌ User ID \`${userId}\` not found.`, { parse_mode: "Markdown" });

  db.prepare("UPDATE users SET points = ? WHERE user_id = ?").run(amount, userId);

  bot.sendMessage(msg.chat.id,
    `✅ Set *${user.full_name}*'s points to *${amount}*!`,
    { parse_mode: "Markdown" }
  );
});

// /adduser <user_id> <name>
bot.onText(/\/adduser (.+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You are not an admin!");

  const args = match[1].trim().split(/\s+/);
  if (args.length < 2) return bot.sendMessage(msg.chat.id, "⚠️ Usage: /adduser <user_id> <name>");

  const userId = parseInt(args[0]);
  const name = args.slice(1).join(" ");

  if (isNaN(userId)) return bot.sendMessage(msg.chat.id, "❌ Please provide a valid User ID.");

  const existing = db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId);
  if (existing) return bot.sendMessage(msg.chat.id, `⚠️ User ID \`${userId}\` already exists.`, { parse_mode: "Markdown" });

  db.prepare("INSERT INTO users (user_id, full_name, points) VALUES (?, ?, 0)").run(userId, name);

  bot.sendMessage(msg.chat.id,
    `✅ *${name}* (ID: \`${userId}\`) has been added!`,
    { parse_mode: "Markdown" }
  );
});

// /stats
bot.onText(/\/stats/, (msg) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You are not an admin!");

  const users = db.prepare("SELECT * FROM users ORDER BY points DESC").all();
  if (users.length === 0) return bot.sendMessage(msg.chat.id, "❌ No users found.");

  let text = `📊 *All Users (${users.length} total):*\n\n`;
  users.forEach((u, i) => {
    const name = u.username ? `@${u.username}` : u.full_name;
    text += `${i + 1}. ${name} — *${u.points}* pts (ID: \`${u.user_id}\`)\n`;
  });

  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

console.log("🤖 Bot is running!");
