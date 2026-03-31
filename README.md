# Quasar AI Spark

A live-monitored, private AI management platform designed specifically for **Android Termux environments** (e.g., Samsung Galaxy Z Flip). Quasar acts as a mobile command center, serving an end-to-end full-stack ecosystem (React UI + Node.js backend API) over top of a running `llama-server`.

## 🔥 Key Features
* **Live System Bridge:** Native process polling utilizing the `/proc/` filesystem to monitor your phone's CPU, RAM, and Temperature dynamically in React.
* **1-Click Model Swapping:** Browse, download (.gguf files), verify, and activate new LLM models with automated process restarting via the UI.
* **Integrated Knowledge Base (RAG):** Upload PDFs, TXT, or MD files. Quasar seamlessly embeds document context directly into your LLM inferences locally.
* **Telegram Webhook Bot Native:** Automatically tunnels your pocket AI using `cloudflared` to a Telegram hook.

---

## 📱 Termux Deployment Guide

Quasar AI Spark was built from the ground up to minimize memory impact. The application relies on `dist` compiled pre-rendering, meaning the frontend UI requires exactly zero extra Node environments to run. Everything flows natively through port `3001`!

### Minimum Requirements
- **Device:** Android phone running Termux
- **RAM:** 4GB Minimum (8GB+ Highly Recommended for 3B+ parameter models)
- **Engine:** Built to wrap a pre-installed `llama-server` process locally.
- **Git:** Ensure `git` is installed (`pkg install git`)

### Step-by-Step Installation

The entire environment can be bootstrapped mathematically in three commands.

**Step 1:** Download to your device.
```bash
git clone https://github.com/your-username/quasar-ai-spark.git ~/quasarmobile
```

**Step 2:** Execute the automated installer. This checks Node.js permissions, pre-compiles the UI, triggers `npm install`, and generates your default local configurations.
```bash
cd ~/quasarmobile && bash install.sh
```

**Step 3:** Start the ecosystem.
```bash
bash start.sh
```
*That's it! The Start script boots your central API server silently in the background, checks for Cloudflare tunnels, and logs the secure URL directly to your terminal screen for Telegram webhook linking.*

---

## 🛠 Troubleshooting

**Error: "Address already in use (EADDRINUSE)"**
* **Cause**: Another Node instance or UI server crashed but left a zombie port open.
* **Fix**: Termux is aggressive. To wipe the slate clean, simply run `pkill -f node` and reboot via `./start.sh`.

**Error: "Telegram bot offline / Webhook not pinging"**
* **Cause**: Cloudflare failed to assign a hostname before Node polled it, or `cloudflared` is missing.
* **Fix**: Check `tunnel.log` (`cat tunnel.log`). To fix, manually verify your tunnel using `cloudflared tunnel --url http://127.0.0.1:3001`. Copy the `.trycloudflare.com` output address and explicitly paste it into your local browser's **Quasar Settings Page**. Hitting Save will immediately force a re-link to Telegram!

**Error: "LLM responses are freezing or device is suddenly warm"**
* **Cause**: Your phone has likely hard-capped its RAM limits (4GB devices), causing the OS memory-killer to lock Termux.
* **Fix**: In the Quasar "Models" tab, downgrade to a `<2B parameter` model (e.g. `Llama-3.2-1B`) and swap it. Do not attempt to load `Mistral 7B` on a 4GB RAM phone.
