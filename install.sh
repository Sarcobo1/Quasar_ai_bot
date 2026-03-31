#!/data/data/com.termux/files/usr/bin/bash

# Termux Installation Script for Quasar AI Spark
# Run this script to completely prepare your environment for mobile LLM hosting.

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}      ⚙️ INSTALLING QUASAR AI SPARK ⚙️      ${NC}"
echo -e "${BLUE}================================================${NC}"

# 1. Directory Checks
APP_DIR="$HOME/quasarmobile"
echo -e "\n${YELLOW}[1/4] Setting up directories...${NC}"
if [ ! -d "$APP_DIR" ]; then
    echo -e "Creating $APP_DIR..."
    mkdir -p "$APP_DIR"
fi

# Ensure data directories exist
mkdir -p "$APP_DIR/data/models"
mkdir -p "$APP_DIR/data/rag"

# Create default config.json if it doesn't exist
CONFIG_FILE="$APP_DIR/data/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "Creating default config.json...${NC}"
cat <<EOF > "$CONFIG_FILE"
{
  "language": "en",
  "autoStart": false,
  "cloudflareUrl": "",
  "modelPath": "",
  "activeModel": "",
  "telegram": {
    "token": "",
    "ownerChatId": "",
    "connected": false
  },
  "whatsapp": {
    "connected": false
  }
}
EOF
fi

# 2. Package Installations
echo -e "\n${YELLOW}[2/4] Installing system dependencies (Node.js & Cloudflared)...${NC}"
pkg update -y
pkg install -y nodejs
pkg install -y cloudflared

echo -e "\n${YELLOW}[3/4] Installing NPM dependencies...${NC}"
cd "$APP_DIR" || { echo -e "${RED}Failed to cd to $APP_DIR. Are you sure you cloned the repository?${NC}"; exit 1; }
npm install

# 3. Permissions Setup
echo -e "\n${YELLOW}[4/4] Setting permissions & compiling frontend...${NC}"
chmod +x start.sh

# Build Vite frontend for production so we don't bleed memory later
if [ ! -d "$APP_DIR/dist" ]; then
    echo -e "Compiling optimized React UI..."
    npm run build
fi

echo -e "\n${BLUE}================================================${NC}"
echo -e "${GREEN}✅ INSTALLATION COMPLETE! ✅${NC}"
echo -e "Your Android Termux environment is fully prepared."
echo -e ""
echo -e "To start your AI server, simply run:"
echo -e "${YELLOW}cd ~/quasarmobile && ./start.sh${NC}"
echo -e "${BLUE}================================================${NC}"
