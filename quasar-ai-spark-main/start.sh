#!/data/data/com.termux/files/usr/bin/bash

# Configuration
PORT=3001
APP_DIR="$HOME/quasarmobile"

# Colors for Termux (makes output readable)
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}      🚀 QUASAR AI SPARK - TERMUX 🚀      ${NC}"
echo -e "${BLUE}================================================${NC}"

# 1. Dependency Check
echo -e "\n${YELLOW}[1/4] Checking Dependencies...${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is missing! Installing via pkg...${NC}"
    pkg update -y && pkg install nodejs -y
else
    echo -e "${GREEN}✓ Node.js installed ($(node -v))${NC}"
fi

# Check for Cloudflared (crucial for Telegram Webhook)
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}Cloudflared is missing! Please install it for webhooks:${NC}"
    echo -e "${YELLOW}pkg install cloudflared${NC}"
    # Continuing script anyway since it might run locally without tele bots
else
    echo -e "${GREEN}✓ Cloudflared installed${NC}"
fi

# Ensure npm dependencies exist
if [ ! -d "$APP_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installing npm packages (this may take a minute)...${NC}"
    cd "$APP_DIR" && npm install
else
    echo -e "${GREEN}✓ NPM packages installed${NC}"
fi

# 2. Build Frontend for Production (Saves mobile memory!)
echo -e "\n${YELLOW}[2/4] Verifying Frontend Build...${NC}"
cd "$APP_DIR"
if [ ! -d "$APP_DIR/dist" ]; then
    echo -e "${YELLOW}Building Quasar Frontend for mobile optimization...${NC}"
    npm run build
else
    echo -e "${GREEN}✓ Production Frontend already built!${NC}"
    echo -e "   (Run 'npm run build' manually if you update the UI code)"
fi

# 3. Start Backend & Static File Server
echo -e "\n${YELLOW}[3/4] Starting Quasar Backend...${NC}"
# Cleanup old zombie instances safely
pkill -f "node server.cjs" 2>/dev/null || true

# Run server in the background and pipe output
node server.cjs > server.log 2>&1 &
SERVER_PID=$!
echo -e "${GREEN}✓ Core engine running on port $PORT (PID: $SERVER_PID)${NC}"

# 4. Start Cloudflare Tunnel
echo -e "\n${YELLOW}[4/4] Initiating Secure Tunnel...${NC}"
if command -v cloudflared &> /dev/null; then
    pkill -f "cloudflared tunnel" 2>/dev/null || true
    
    # Start tunnel in background pointing to our unified backend:
    echo -e "Waiting for Cloudflare to allocate a URL..."
    cloudflared tunnel --url http://127.0.0.1:$PORT > tunnel.log 2>&1 &
    
    # Give Cloudflare a few seconds to spin up, extract URL
    sleep 5
    TUNNEL_URL=$(grep -oEo "https://[a-zA-Z0-9-]+\.trycloudflare\.com" tunnel.log | head -1)
    
    if [ -n "$TUNNEL_URL" ]; then
        echo -e "${GREEN}✅ Tunnel Live At: ${TUNNEL_URL}${NC}"
        
        # Automatically update config.json with new Cloudflare URL
        node -e "const fs=require('fs'); try { const p='$APP_DIR/data/config.json'; let c={}; if(fs.existsSync(p)){ c=JSON.parse(fs.readFileSync(p,'utf-8')); } c.cloudflareUrl='$TUNNEL_URL'; fs.writeFileSync(p,JSON.stringify(c,null,2)); } catch(e){}"
        
        echo -e "${GREEN}✅ config.json Auto-Updated with Webhook URL!${NC}"
    else
        echo -e "${RED}Failed to automatically extract URL. Check tunnel.log${NC}"
    fi
else
    echo -e "${RED}Skipping Tunnel. 'cloudflared' not found.${NC}"
fi

# Finish Status
echo -e "\n${BLUE}================================================${NC}"
echo -e "${GREEN}✨ Quasar AI Spark is READY on your Z Flip! ✨${NC}"
echo -e "📱 Access locally at: ${GREEN}http://localhost:$PORT${NC}"
echo -e "📝 View backend logs: ${YELLOW}tail -f server.log${NC}"
echo -e "🛑 Stop all services: ${RED}pkill -f node && pkill -f cloudflared${NC}"
echo -e "${BLUE}================================================${NC}"
