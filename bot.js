const TelegramBot = require("node-telegram-bot-api");
const Database = require("better-sqlite3");
const path = require("path");

// ===================== CONFIG =====================
const TOKEN = "8756023029:AAHnBDv6MMnVA5WQmR34c-Nz3L8qA_4irLg";
const ADMIN_ID = 5924662015;

// ── Daily Claim ──
const DAILY_CLAIM_POINTS = 10;

// ── Point Use Rewards ──
// Photo rewards: use X points → get a photo
const PHOTO_REWARDS = [
  { points: 100, photo: "https://files.catbox.moe/0g1v16.jpg", caption: "🎁 100 Point Reward Photo!" },
  { points: 200, photo: "https://files.catbox.moe/p4cezg.jpg", caption: "🎁 200 Point Reward Photo!" },
  { points: 300, photo: "https://files.catbox.moe/jpnqxz.jpg", caption: "🎁 300 Point Reward Photo!" },
];

// Link rewards: use X points → get a link
const LINK_REWARDS = [
  { points: 500, link: "https://www.mediafire.com/file/rjkq0w61lz6nyaa/illuminate-XD-main.zip/file", text: "🔗 500 Point Reward Link!" },
  { points: 1000, link: "https://optiklink.net/home", text: "🔗 1000 Point Reward Link!" },
];

// ── Menu Photo (URL) ──
const MENU_PHOTO_URL = "https://files.catbox.moe/e92m41.png";
// ==================================================

const bot = new TelegramBot(TOKEN, { polling: true });
const db = new Database(path.join(__dirname, "data.db"));

// ── Database Setup ──
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    username TEXT,
    full_name TEXT,
    points INTEGER DEFAULT 0,
    last_claim TEXT DEFAULT NULL
  )
`);

// ── Helpers ──
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

function getTodayDate() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getUser(userId) {
  return db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId);
}

function getUserRank(points) {
  return db.prepare("SELECT COUNT(*) as cnt FROM users WHERE points > ?").get(points).cnt + 1;
}

// ── Main Menu (Inline Keyboard) ──
function sendMainMenu(chatId, firstName) {
  const caption =
    `🤖 *Bot Menu*\n\n` +
    `👋 Hello, *${firstName}*!\n\n` +
    `Choose an option below:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "💎 My Points", callback_data: "mypoints" },
        { text: "🏆 Leaderboard", callback_data: "leaderboard" },
      ],
      [
        { text: "🎁 Daily Claim", callback_data: "dailyclaim" },
        { text: "🛍️ Use Points", callback_data: "usepoints_menu" },
      ],
      [
        { text: "📋 All Commands", callback_data: "help" },
      ],
    ],
  };

  bot.sendPhoto(chatId, MENU_PHOTO_URL, {
    caption,
    parse_mode: "Markdown",
    reply_markup: keyboard,
  }).catch(() => {
    // Fallback if photo fails
    bot.sendMessage(chatId, caption, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  });
}

// ── Use Points Sub-Menu ──
function sendUsePointsMenu(chatId) {
  const text =
    `🛍️ *Use Points — Rewards*\n\n` +
    `📸 *Photo Rewards:*\n` +
    `• 100 points → Photo 1\n` +
    `• 200 points → Photo 2\n` +
    `• 300 points → Photo 3\n\n` +
    `🔗 *Link Rewards:*\n` +
    `• 500 points → Special Link\n` +
    `• 1000 points → VIP Link\n\n` +
    `Select what you want:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "📸 100 pts → Photo", callback_data: "use_100" },
        { text: "📸 200 pts → Photo", callback_data: "use_200" },
      ],
      [
        { text: "📸 300 pts → Photo", callback_data: "use_300" },
      ],
      [
        { text: "🔗 500 pts → Link", callback_data: "use_500" },
        { text: "🔗 1000 pts → VIP Link", callback_data: "use_1000" },
      ],
      [
        { text: "⬅️ Back to Menu", callback_data: "main_menu" },
      ],
    ],
  };

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

// ── /start ──
bot.onText(/\/start/, (msg) => {
  const { id, username, first_name, last_name } = msg.from;
  const fullName = [first_name, last_name].filter(Boolean).join(" ");
  upsertUser(id, username, fullName);
  sendMainMenu(msg.chat.id, first_name);
});

// ── /menu ──
bot.onText(/\/menu/, (msg) => {
  const { id, username, first_name, last_name } = msg.from;
  const fullName = [first_name, last_name].filter(Boolean).join(" ");
  upsertUser(id, username, fullName);
  sendMainMenu(msg.chat.id, first_name);
});

// ── /help ──
bot.onText(/\/help/, (msg) => {
  const isAdm = isAdmin(msg.from.id);
  let text =
    `📋 *Command List:*\n\n` +
    `👤 *User Commands:*\n` +
    `/start — Main menu\n` +
    `/menu — Show menu\n` +
    `/mypoints — Check your points & rank\n` +
    `/leaderboard — View top 10\n` +
    `/dailyclaim — Claim daily +${DAILY_CLAIM_POINTS} points\n` +
    `/use100 — Use 100 pts → Photo\n` +
    `/use200 — Use 200 pts → Photo\n` +
    `/use300 — Use 300 pts → Photo\n` +
    `/use500 — Use 500 pts → Link\n` +
    `/use1000 — Use 1000 pts → VIP Link\n`;

  if (isAdm) {
    text +=
      `\n🔑 *Admin Commands:*\n` +
      `/addpoints <user_id> <amount>\n` +
      `/removepoints <user_id> <amount>\n` +
      `/setpoints <user_id> <amount>\n` +
      `/adduser <user_id> <name>\n` +
      `/stats — View all users\n`;
  }

  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// ── /mypoints ──
bot.onText(/\/mypoints/, (msg) => {
  const { id, username, first_name, last_name } = msg.from;
  upsertUser(id, username, [first_name, last_name].filter(Boolean).join(" "));
  const user = getUser(id);
  const rank = getUserRank(user.points);
  bot.sendMessage(msg.chat.id,
    `👤 *${user.full_name}*\n\n💎 Points: *${user.points}*\n🏅 Rank: *#${rank}*`,
    { parse_mode: "Markdown" }
  );
});

// ── /leaderboard ──
bot.onText(/\/leaderboard/, (msg) => {
  const top10 = db.prepare("SELECT * FROM users ORDER BY points DESC LIMIT 10").all();
  if (top10.length === 0) return bot.sendMessage(msg.chat.id, "❌ No users found yet.");
  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
  let text = `🏆 *Leaderboard — Top 10*\n\n`;
  top10.forEach((user, i) => {
    const name = user.username ? `@${user.username}` : user.full_name;
    text += `${medals[i]} ${name} — *${user.points}* pts\n`;
  });
  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// ── /dailyclaim ──
bot.onText(/\/dailyclaim/, (msg) => {
  const { id, username, first_name, last_name } = msg.from;
  upsertUser(id, username, [first_name, last_name].filter(Boolean).join(" "));
  handleDailyClaim(id, msg.chat.id);
});

function handleDailyClaim(userId, chatId) {
  const user = getUser(userId);
  const today = getTodayDate();

  if (user.last_claim === today) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const hours = Math.ceil((tomorrow - Date.now()) / 3600000);
    return bot.sendMessage(chatId,
      `⏳ *Already Claimed Today!*\n\n` +
      `You already claimed your daily points.\n` +
      `⏰ Come back in *~${hours} hour(s)*!`,
      { parse_mode: "Markdown" }
    );
  }

  db.prepare("UPDATE users SET points = points + ?, last_claim = ? WHERE user_id = ?")
    .run(DAILY_CLAIM_POINTS, today, userId);

  const updated = getUser(userId);
  bot.sendMessage(chatId,
    `✅ *Daily Claim Successful!*\n\n` +
    `🎉 You received *+${DAILY_CLAIM_POINTS} points*!\n` +
    `💎 Total Points: *${updated.points}*\n\n` +
    `Come back tomorrow for more!`,
    { parse_mode: "Markdown" }
  );
}

// ── Use Points (command versions) ──
function handleUsePoints(userId, chatId, requiredPoints) {
  const user = getUser(userId);
  if (!user) return bot.sendMessage(chatId, "❌ User not found. Send /start first.");

  if (user.points < requiredPoints) {
    return bot.sendMessage(chatId,
      `❌ *Not Enough Points!*\n\n` +
      `You need *${requiredPoints}* points but only have *${user.points}*.\n\n` +
      `Earn more via /dailyclaim!`,
      { parse_mode: "Markdown" }
    );
  }

  db.prepare("UPDATE users SET points = points - ? WHERE user_id = ?").run(requiredPoints, userId);
  const updated = getUser(userId);

  // Check photo rewards
  const photoReward = PHOTO_REWARDS.find(r => r.points === requiredPoints);
  if (photoReward) {
    bot.sendPhoto(chatId, photoReward.photo, {
      caption:
        `${photoReward.caption}\n\n` +
        `💎 Points Used: *${requiredPoints}*\n` +
        `💰 Remaining: *${updated.points}* pts`,
      parse_mode: "Markdown",
    });
    return;
  }

  // Check link rewards
  const linkReward = LINK_REWARDS.find(r => r.points === requiredPoints);
  if (linkReward) {
    bot.sendMessage(chatId,
      `${linkReward.text}\n\n` +
      `🔗 Your Link: ${linkReward.link}\n\n` +
      `💎 Points Used: *${requiredPoints}*\n` +
      `💰 Remaining: *${updated.points}* pts`,
      { parse_mode: "Markdown" }
    );
    return;
  }
}

bot.onText(/\/use100/, (msg) => {
  const { id, username, first_name, last_name } = msg.from;
  upsertUser(id, username, [first_name, last_name].filter(Boolean).join(" "));
  handleUsePoints(id, msg.chat.id, 100);
});

bot.onText(/\/use200/, (msg) => {
  const { id, username, first_name, last_name } = msg.from;
  upsertUser(id, username, [first_name, last_name].filter(Boolean).join(" "));
  handleUsePoints(id, msg.chat.id, 200);
});

bot.onText(/\/use300/, (msg) => {
  const { id, username, first_name, last_name } = msg.from;
  upsertUser(id, username, [first_name, last_name].filter(Boolean).join(" "));
  handleUsePoints(id, msg.chat.id, 300);
});

bot.onText(/\/use500/, (msg) => {
  const { id, username, first_name, last_name } = msg.from;
  upsertUser(id, username, [first_name, last_name].filter(Boolean).join(" "));
  handleUsePoints(id, msg.chat.id, 500);
});

bot.onText(/\/use1000/, (msg) => {
  const { id, username, first_name, last_name } = msg.from;
  upsertUser(id, username, [first_name, last_name].filter(Boolean).join(" "));
  handleUsePoints(id, msg.chat.id, 1000);
});

// ── Admin Commands ──
bot.onText(/\/addpoints (.+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You are not an admin!");
  const args = match[1].trim().split(/\s+/);
  if (args.length < 2) return bot.sendMessage(msg.chat.id, "⚠️ Usage: /addpoints <user_id> <amount>");
  const userId = parseInt(args[0]);
  const amount = parseInt(args[1]);
  if (isNaN(userId) || isNaN(amount) || amount <= 0) return bot.sendMessage(msg.chat.id, "❌ Invalid User ID or amount.");
  const user = getUser(userId);
  if (!user) return bot.sendMessage(msg.chat.id, `❌ User ID \`${userId}\` not found.`, { parse_mode: "Markdown" });
  db.prepare("UPDATE users SET points = points + ? WHERE user_id = ?").run(amount, userId);
  const updated = getUser(userId);
  bot.sendMessage(msg.chat.id,
    `✅ Added *+${amount}* pts to *${user.full_name}*!\n💎 Total: *${updated.points}*`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/removepoints (.+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You are not an admin!");
  const args = match[1].trim().split(/\s+/);
  if (args.length < 2) return bot.sendMessage(msg.chat.id, "⚠️ Usage: /removepoints <user_id> <amount>");
  const userId = parseInt(args[0]);
  const amount = parseInt(args[1]);
  if (isNaN(userId) || isNaN(amount) || amount <= 0) return bot.sendMessage(msg.chat.id, "❌ Invalid input.");
  const user = getUser(userId);
  if (!user) return bot.sendMessage(msg.chat.id, `❌ User ID \`${userId}\` not found.`, { parse_mode: "Markdown" });
  const newPoints = Math.max(0, user.points - amount);
  db.prepare("UPDATE users SET points = ? WHERE user_id = ?").run(newPoints, userId);
  bot.sendMessage(msg.chat.id,
    `✅ Removed *-${amount}* pts from *${user.full_name}*!\n💎 Total: *${newPoints}*`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/setpoints (.+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You are not an admin!");
  const args = match[1].trim().split(/\s+/);
  if (args.length < 2) return bot.sendMessage(msg.chat.id, "⚠️ Usage: /setpoints <user_id> <amount>");
  const userId = parseInt(args[0]);
  const amount = parseInt(args[1]);
  if (isNaN(userId) || isNaN(amount) || amount < 0) return bot.sendMessage(msg.chat.id, "❌ Invalid input.");
  const user = getUser(userId);
  if (!user) return bot.sendMessage(msg.chat.id, `❌ User ID \`${userId}\` not found.`, { parse_mode: "Markdown" });
  db.prepare("UPDATE users SET points = ? WHERE user_id = ?").run(amount, userId);
  bot.sendMessage(msg.chat.id,
    `✅ Set *${user.full_name}*'s points to *${amount}*!`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/adduser (.+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You are not an admin!");
  const args = match[1].trim().split(/\s+/);
  if (args.length < 2) return bot.sendMessage(msg.chat.id, "⚠️ Usage: /adduser <user_id> <name>");
  const userId = parseInt(args[0]);
  const name = args.slice(1).join(" ");
  if (isNaN(userId)) return bot.sendMessage(msg.chat.id, "❌ Invalid User ID.");
  const existing = getUser(userId);
  if (existing) return bot.sendMessage(msg.chat.id, `⚠️ User ID \`${userId}\` already exists.`, { parse_mode: "Markdown" });
  db.prepare("INSERT INTO users (user_id, full_name, points) VALUES (?, ?, 0)").run(userId, name);
  bot.sendMessage(msg.chat.id,
    `✅ *${name}* (ID: \`${userId}\`) added!`,
    { parse_mode: "Markdown" }
  );
});

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

// ── Callback Query Handler (Inline Buttons) ──
bot.on("callback_query", (query) => {
  const { id: queryId, from, message } = query;
  const chatId = message.chat.id;
  const userId = from.id;
  const data = query.data;

  const { username, first_name, last_name } = from;
  upsertUser(userId, username, [first_name, last_name].filter(Boolean).join(" "));

  bot.answerCallbackQuery(queryId);

  if (data === "main_menu") {
    sendMainMenu(chatId, first_name);
  } else if (data === "mypoints") {
    const user = getUser(userId);
    const rank = getUserRank(user.points);
    bot.sendMessage(chatId,
      `👤 *${user.full_name}*\n\n💎 Points: *${user.points}*\n🏅 Rank: *#${rank}*`,
      { parse_mode: "Markdown" }
    );
  } else if (data === "leaderboard") {
    const top10 = db.prepare("SELECT * FROM users ORDER BY points DESC LIMIT 10").all();
    if (top10.length === 0) return bot.sendMessage(chatId, "❌ No users found yet.");
    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    let text = `🏆 *Leaderboard — Top 10*\n\n`;
    top10.forEach((user, i) => {
      const name = user.username ? `@${user.username}` : user.full_name;
      text += `${medals[i]} ${name} — *${user.points}* pts\n`;
    });
    bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  } else if (data === "dailyclaim") {
    handleDailyClaim(userId, chatId);
  } else if (data === "usepoints_menu") {
    sendUsePointsMenu(chatId);
  } else if (data === "use_100") {
    handleUsePoints(userId, chatId, 100);
  } else if (data === "use_200") {
    handleUsePoints(userId, chatId, 200);
  } else if (data === "use_300") {
    handleUsePoints(userId, chatId, 300);
  } else if (data === "use_500") {
    handleUsePoints(userId, chatId, 500);
  } else if (data === "use_1000") {
    handleUsePoints(userId, chatId, 1000);
  } else if (data === "help") {
    let text =
      `📋 *Command List:*\n\n` +
      `/start — Main menu\n` +
      `/menu — Show menu\n` +
      `/mypoints — Your points & rank\n` +
      `/leaderboard — Top 10\n` +
      `/dailyclaim — Daily +${DAILY_CLAIM_POINTS} pts\n` +
      `/use100 — 100 pts → Photo\n` +
      `/use200 — 200 pts → Photo\n` +
      `/use300 — 300 pts → Photo\n` +
      `/use500 — 500 pts → Link\n` +
      `/use1000 — 1000 pts → VIP Link\n`;
    bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  }
});

console.log("🤖 Bot is running!");
