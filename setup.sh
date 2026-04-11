#!/data/data/com.termux/files/usr/bin/bash

# ╔══════════════════════════════════════════╗
# ║   Point Bot - Termux Auto Setup Script           ║
# ╚══════════════════════════════════════════╝

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      🤖 Point Bot - Termux Setup         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Update packages ──
echo -e "${YELLOW}[1/6] Packages update করা হচ্ছে...${NC}"
pkg update -y && pkg upgrade -y
echo -e "${GREEN}✅ Update সম্পন্ন${NC}"
echo ""

# ── Step 2: Install required tools ──
echo -e "${YELLOW}[2/6] Required tools install করা হচ্ছে...${NC}"
pkg install -y nodejs git python make clang
echo -e "${GREEN}✅ Tools install সম্পন্ন${NC}"
echo ""

# ── Step 3: Clone repository ──
echo -e "${YELLOW}[3/6] GitHub থেকে Bot download হচ্ছে...${NC}"
REPO_DIR="$HOME/-Point-bot-telegram"

if [ -d "$REPO_DIR" ]; then
  echo -e "${YELLOW}⚠️  Folder আগে থেকে আছে। Update করা হচ্ছে...${NC}"
  cd "$REPO_DIR"
  git pull
else
  git clone https://github.com/ritesh1111p/-Point-bot-telegram.git "$REPO_DIR"
  cd "$REPO_DIR"
fi
echo -e "${GREEN}✅ Download সম্পন্ন${NC}"
echo ""

# ── Step 4: Copy new bot.js if exists ──
if [ -f "$HOME/bot.js" ]; then
  cp "$HOME/bot.js" "$REPO_DIR/bot.js"
  echo -e "${GREEN}✅ Updated bot.js copied${NC}"
fi

# ── Step 5: Install npm dependencies ──
echo -e "${YELLOW}[4/6] npm packages install হচ্ছে (একটু সময় লাগবে)...${NC}"
npm install --build-from-source 2>/dev/null || npm install
echo -e "${GREEN}✅ npm install সম্পন্ন${NC}"
echo ""

# ── Step 6: Install pm2 for background running ──
echo -e "${YELLOW}[5/6] PM2 install হচ্ছে (background runner)...${NC}"
npm install -g pm2
echo -e "${GREEN}✅ PM2 install সম্পন্ন${NC}"
echo ""

# ── Step 7: Start bot with pm2 ──
echo -e "${YELLOW}[6/6] Bot background এ start হচ্ছে...${NC}"
pm2 delete point-bot 2>/dev/null
pm2 start bot.js --name "point-bot"
pm2 save
echo -e "${GREEN}✅ Bot background এ চালু হয়েছে!${NC}"
echo ""

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           ✅ Setup সম্পন্ন!              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🤖 Bot এখন background এ চলছে!${NC}"
echo ""
echo -e "${YELLOW}📋 কাজের Commands:${NC}"
echo -e "  ${CYAN}pm2 status${NC}         — Bot চলছে কিনা দেখো"
echo -e "  ${CYAN}pm2 logs point-bot${NC} — Bot এর logs দেখো"
echo -e "  ${CYAN}pm2 stop point-bot${NC} — Bot বন্ধ করো"
echo -e "  ${CYAN}pm2 restart point-bot${NC} — Bot restart করো"
echo ""
echo -e "${YELLOW}⚡ Termux বন্ধ করলেও Bot চলতে থাকবে!${NC}"
echo ""
