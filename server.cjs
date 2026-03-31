const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Serve Production Frontend
const DIST_DIR = path.join(__dirname, 'dist');
app.use(express.static(DIST_DIR));

// ─── Paths ───────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const MODELS_DIR = path.join(DATA_DIR, 'models');
const RAG_DIR = path.join(DATA_DIR, 'rag');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

// Ensure directories exist
[DATA_DIR, MODELS_DIR, RAG_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ─── Config persistence ─────────────────────────────────────────────
const DEFAULT_CONFIG = {
  language: 'en',
  autoStart: false,
  cloudflareUrl: '',
  modelPath: './models/Qwen2.5-3B.gguf',
  activeModel: 'Qwen2.5 3B',
  telegram: { token: '', ownerChatId: '', connected: false },
  whatsapp: { connected: false },
};

const loadConfig = () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch (e) { console.error('Config load error', e); }
  return { ...DEFAULT_CONFIG };
};
const saveConfig = (cfg) => {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
};
let config = loadConfig();

// ─── Helpers ─────────────────────────────────────────────────────────
const runCommand = (cmd) => new Promise((resolve, reject) => {
  exec(cmd, (error, stdout) => error ? reject(error) : resolve(stdout.trim()));
});

const isLlamaRunning = async () => {
  try { await runCommand('pgrep llama-server'); return true; } catch { return false; }
};

// ─── State ───────────────────────────────────────────────────────────
let requestCount = 142;
const downloadProgress = {}; // track active downloads: { modelName: progress% }

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD ROUTES (existing)
// ═══════════════════════════════════════════════════════════════════

app.get('/api/metrics', async (req, res) => {
  try {
    let ram = 0, cpu = 0, temp = 38;
    if (os.platform() === 'linux') {
      try {
        const meminfo = await runCommand('cat /proc/meminfo');
        const totalM = meminfo.match(/MemTotal:\s+(\d+)/);
        const availM = meminfo.match(/MemAvailable:\s+(\d+)/);
        if (totalM && availM) { const t = +totalM[1], a = +availM[1]; ram = Math.round(((t - a) / t) * 100); }
        else ram = Math.round((1 - os.freemem() / os.totalmem()) * 100);
        try { const c = await runCommand("top -bn1 | grep 'Cpu(s)' | awk '{print $2 + $4}'"); cpu = parseFloat(c) || 0; }
        catch { cpu = Math.round(os.loadavg()[0] * 10); }
        try { const t = await runCommand('cat /sys/class/thermal/thermal_zone0/temp'); temp = Math.round(+t / 1000); }
        catch { temp = 42; }
      } catch { ram = Math.round((1 - os.freemem() / os.totalmem()) * 100); cpu = Math.round(os.loadavg()[0] * 10); temp = 45; }
    } else {
      ram = Math.round((1 - os.freemem() / os.totalmem()) * 100);
      const cpus = os.cpus(); let u=0,n=0,s=0,i=0,q=0;
      for(let c of cpus){u+=c.times.user;n+=c.times.nice;s+=c.times.sys;i+=c.times.idle;q+=c.times.irq;}
      const tot=u+n+s+i+q; cpu = Math.round(((tot-i)/tot)*100); temp = 40;
    }
    res.json({ ram, cpu, temp });
  } catch { res.status(500).json({ error: 'Failed to fetch metrics' }); }
});

app.get('/api/server/status', async (req, res) => {
  if (os.platform() !== 'linux') return res.json({ isRunning: true });
  res.json({ isRunning: await isLlamaRunning() });
});

app.post('/api/server/start', async (req, res) => {
  const modelPath = req.body.modelPath || config.modelPath;
  if (!modelPath) return res.status(400).json({ success: false, error: 'No modelPath configured in config.json' });
  if (os.platform() !== 'linux') { setTimeout(() => res.json({ success: true, message: 'Mock started' }), 1000); return; }
  try {
    if (await isLlamaRunning()) return res.json({ success: true, message: 'Already running' });
    exec(`llama-server --model "${modelPath}" --port 8080 > /dev/null 2>&1 &`);
    setTimeout(() => res.json({ success: true }), 1000);
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/server/stop', async (req, res) => {
  if (os.platform() !== 'linux') { setTimeout(() => res.json({ success: true }), 1000); return; }
  try { await runCommand('pkill -f llama-server'); } catch {}
  res.json({ success: true });
});

app.post('/api/server/restart', async (req, res) => {
  const modelPath = req.body.modelPath || config.modelPath;
  if (!modelPath) return res.status(400).json({ success: false, error: 'No modelPath configured in config.json' });
  if (os.platform() !== 'linux') { setTimeout(() => res.json({ success: true }), 2000); return; }
  try {
    try { await runCommand('pkill -f llama-server'); } catch {}
    for (let i = 0; i < 4; i++) { if (!(await isLlamaRunning())) break; await new Promise(r => setTimeout(r, 500)); }
    exec(`llama-server --model "${modelPath}" --port 8080 > /dev/null 2>&1 &`);
    setTimeout(() => res.json({ success: true }), 1000);
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/bots/:botName/status', (req, res) => {
  const { botName } = req.params;
  if (botName === 'telegram') res.json({ status: config.telegram.connected ? 'live' : 'offline' });
  else if (botName === 'whatsapp') res.json({ status: config.whatsapp.connected ? 'live' : 'offline' });
  else res.json({ status: 'offline' });
});

app.get('/api/stats/requests', (req, res) => {
  requestCount += Math.floor(Math.random() * 2);
  res.json({ count: requestCount });
});

// ═══════════════════════════════════════════════════════════════════
// MODELS ROUTES
// ═══════════════════════════════════════════════════════════════════

const MODEL_REGISTRY = [
  { name: 'Qwen2.5 3B',   file: 'qwen2.5-3b-q4_k_m.gguf',   size: '2.1 GB', sizeBytes: 2254857830, ram: '4 GB', ramMB: 4096, url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf' },
  { name: 'Llama 3.2 1B',  file: 'llama-3.2-1b-q4_k_m.gguf',  size: '1.3 GB', sizeBytes: 1395864371, ram: '3 GB', ramMB: 3072, url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf' },
  { name: 'Phi-3 Mini',    file: 'phi-3-mini-q4_k_m.gguf',    size: '2.4 GB', sizeBytes: 2576980378, ram: '4 GB', ramMB: 4096, url: '' },
  { name: 'Gemma 2 2B',    file: 'gemma-2-2b-q4_k_m.gguf',    size: '1.8 GB', sizeBytes: 1932735283, ram: '4 GB', ramMB: 4096, url: '' },
  { name: 'Mistral 7B',    file: 'mistral-7b-q4_k_m.gguf',    size: '4.1 GB', sizeBytes: 4402341478, ram: '8 GB', ramMB: 8192, url: '' },
  { name: 'Llama 3.1 8B',  file: 'llama-3.1-8b-q4_k_m.gguf',  size: '4.7 GB', sizeBytes: 5046586573, ram: '10 GB', ramMB: 10240, url: '' },
  { name: 'Qwen2.5 14B',   file: 'qwen2.5-14b-q4_k_m.gguf',   size: '8.2 GB', sizeBytes: 8804682956, ram: '16 GB', ramMB: 16384, url: '' },
];

app.get('/api/models/list', (req, res) => {
  const totalRAM_MB = Math.round(os.totalmem() / (1024 * 1024));
  const models = MODEL_REGISTRY.map(m => {
    const installed = fs.existsSync(path.join(MODELS_DIR, m.file));
    const compatible = m.ramMB <= totalRAM_MB;
    const active = config.activeModel === m.name;
    const downloading = downloadProgress[m.name] !== undefined;
    const progress = downloadProgress[m.name] || 0;
    return { ...m, installed, compatible, active, downloading, progress };
  });
  res.json({ models, totalRAM_MB, activeModel: config.activeModel });
});

// SSE download progress stream
app.get('/api/models/download/progress/:name', (req, res) => {
  const { name } = req.params;
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
  const interval = setInterval(() => {
    const progress = downloadProgress[name];
    if (progress === undefined) { res.write(`data: ${JSON.stringify({ progress: 100, done: true })}\n\n`); clearInterval(interval); res.end(); return; }
    res.write(`data: ${JSON.stringify({ progress })}\n\n`);
    if (progress >= 100) { clearInterval(interval); delete downloadProgress[name]; res.end(); }
  }, 500);
  req.on('close', () => clearInterval(interval));
});

app.post('/api/models/download', (req, res) => {
  const { name } = req.body;
  const model = MODEL_REGISTRY.find(m => m.name === name);
  if (!model) return res.status(404).json({ error: 'Model not found' });
  if (fs.existsSync(path.join(MODELS_DIR, model.file))) return res.json({ success: true, message: 'Already installed' });

  downloadProgress[name] = 0;

  if (os.platform() === 'linux' && model.url) {
    // Real download with wget/curl tracking
    const dest = path.join(MODELS_DIR, model.file);
    const child = exec(`wget -q --show-progress -O "${dest}" "${model.url}" 2>&1`, { maxBuffer: 1024 * 1024 * 10 });
    // Simulate progress tracking via file size polling
    const sizeInterval = setInterval(() => {
      try {
        if (fs.existsSync(dest)) {
          const stat = fs.statSync(dest);
          downloadProgress[name] = Math.min(99, Math.round((stat.size / model.sizeBytes) * 100));
        }
      } catch {}
    }, 1000);
    child.on('close', (code) => {
      clearInterval(sizeInterval);
      downloadProgress[name] = 100;
      setTimeout(() => delete downloadProgress[name], 2000);
    });
  } else {
    // Simulated download for Windows dev
    let p = 0;
    const sim = setInterval(() => {
      p += Math.floor(Math.random() * 8) + 3;
      if (p >= 100) {
        p = 100;
        clearInterval(sim);
        // Create a tiny placeholder file
        fs.writeFileSync(path.join(MODELS_DIR, model.file), `placeholder:${model.name}`);
        setTimeout(() => delete downloadProgress[name], 2000);
      }
      downloadProgress[name] = p;
    }, 400);
  }
  res.json({ success: true, message: 'Download started' });
});

app.delete('/api/models/:name', (req, res) => {
  const { name } = req.params;
  const model = MODEL_REGISTRY.find(m => m.name === name);
  if (!model) return res.status(404).json({ error: 'Model not found' });
  const filePath = path.join(MODELS_DIR, model.file);
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
  if (config.activeModel === name) { config.activeModel = ''; saveConfig(config); }
  res.json({ success: true });
});

app.post('/api/models/activate', async (req, res) => {
  const { name } = req.body;
  const model = MODEL_REGISTRY.find(m => m.name === name);
  if (!model) return res.status(404).json({ error: 'Model not found' });
  config.activeModel = name;
  config.modelPath = path.join(MODELS_DIR, model.file);
  saveConfig(config);

  if (os.platform() === 'linux') {
    try { await runCommand('pkill -f llama-server'); } catch {}
    for (let i = 0; i < 4; i++) { if (!(await isLlamaRunning())) break; await new Promise(r => setTimeout(r, 500)); }
    exec(`llama-server --model "${config.modelPath}" --port 8080 > /dev/null 2>&1 &`);
  }
  setTimeout(() => res.json({ success: true, activeModel: name }), 1000);
});

// ═══════════════════════════════════════════════════════════════════
// BOTS ROUTES
// ═══════════════════════════════════════════════════════════════════

app.post('/api/bots/telegram/connect', async (req, res) => {
  const { token, ownerChatId } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  config.telegram.token = token;
  config.telegram.ownerChatId = ownerChatId || '';
  
  try {
    // 1. Verify token
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) return res.status(400).json({ error: 'Invalid token' });

    config.telegram.connected = true;
    config.telegram.botName = meData.result.first_name;
    config.telegram.botUsername = meData.result.username;

    // 2. Setup webhook if cloudflareUrl is configured globally
    if (config.cloudflareUrl) {
      const webhookUrl = `${config.cloudflareUrl.replace(/\/$/, '')}/api/bots/telegram/webhook`;
      const whRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
      const whData = await whRes.json();
      if (!whData.ok) console.error("Webhook setup failed:", whData);
    }
    
    saveConfig(config);
    return res.json({ success: true, botName: meData.result.first_name, username: meData.result.username });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to connect', details: e.message });
  }
});

app.post('/api/bots/telegram/disconnect', async (req, res) => {
  if (config.telegram.token) {
    try {
      await fetch(`https://api.telegram.org/bot${config.telegram.token}/deleteWebhook`);
    } catch (e) { console.error('Error deleting webhook', e); }
  }
  config.telegram.connected = false;
  config.telegram.token = '';
  config.telegram.ownerChatId = '';
  saveConfig(config);
  res.json({ success: true });
});

app.get('/api/bots/telegram/status', async (req, res) => {
  if (!config.telegram.token || !config.telegram.connected) return res.json({ status: 'offline' });
  try {
    const whRes = await fetch(`https://api.telegram.org/bot${config.telegram.token}/getWebhookInfo`);
    const whData = await whRes.json();
    if (whData.ok && whData.result.url) {
      if (whData.result.last_error_message) {
        return res.json({ status: 'offline', error: whData.result.last_error_message });
      }
      return res.json({ status: 'live' });
    }
    return res.json({ status: 'offline', error: 'Webhook URL is not set in Telegram' });
  } catch (e) {
    return res.json({ status: 'offline', error: e.message });
  }
});

app.post('/api/bots/telegram/test', async (req, res) => {
  if (!config.telegram.token || !config.telegram.ownerChatId) return res.status(400).json({ error: 'Token or Chat ID missing' });
  try {
    const msgRes = await fetch(`https://api.telegram.org/bot${config.telegram.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.telegram.ownerChatId,
        text: 'Hello from QuasarMobile! Connection successful. 🚀'
      })
    });
    const msgData = await msgRes.json();
    if (msgData.ok) res.json({ success: true });
    else res.status(400).json({ error: msgData.description });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/bots/telegram/config', (req, res) => {
  res.json({
    token: config.telegram.token || '',
    ownerChatId: config.telegram.ownerChatId || '',
    connected: config.telegram.connected || false,
    botName: config.telegram.botName || '',
    botUsername: config.telegram.botUsername || '',
  });
});

app.post('/api/bots/telegram/webhook', (req, res) => {
  // CRITICAL: Respond immediately to avoid timeout loop in Telegram
  res.status(200).send('OK');
  
  // Async processing here
  try {
    const update = req.body;
    console.log("[Telegram Webhook] Received update:", update.update_id);
    if (update.message && update.message.text) {
      console.log(`[Telegram Webhook] Message from ${update.message.from.first_name}: ${update.message.text}`);
      // Future integration: send to llama-server here
    }
  } catch (e) { console.error("Webhook processing error", e); }
});

// ═══════════════════════════════════════════════════════════════════
// RAG ROUTES
// ═══════════════════════════════════════════════════════════════════

const ragStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RAG_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const ragUpload = multer({
  storage: ragStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// Metadata file to track active states
const RAG_META_PATH = path.join(DATA_DIR, 'rag_meta.json');
const loadRagMeta = () => {
  try { if (fs.existsSync(RAG_META_PATH)) return JSON.parse(fs.readFileSync(RAG_META_PATH, 'utf-8')); } catch {}
  return {};
};
const saveRagMeta = (meta) => fs.writeFileSync(RAG_META_PATH, JSON.stringify(meta, null, 2));

app.post('/api/rag/upload', ragUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded or invalid file type' });
  const meta = loadRagMeta();
  meta[req.file.filename] = { originalName: req.file.originalname, active: true, uploadedAt: Date.now() };
  saveRagMeta(meta);
  res.json({ success: true, filename: req.file.filename, originalName: req.file.originalname });
});

app.get('/api/rag/files', (req, res) => {
  const meta = loadRagMeta();
  let totalSize = 0;
  const files = [];
  try {
    const entries = fs.readdirSync(RAG_DIR);
    for (const entry of entries) {
      const fullPath = path.join(RAG_DIR, entry);
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;
      totalSize += stat.size;
      const m = meta[entry] || {};
      files.push({
        id: entry,
        name: m.originalName || entry,
        size: stat.size,
        sizeFormatted: stat.size > 1024 * 1024 ? (stat.size / (1024 * 1024)).toFixed(1) + ' MB' : (stat.size / 1024).toFixed(0) + ' KB',
        active: m.active !== false,
        uploadedAt: m.uploadedAt || stat.mtimeMs,
      });
    }
  } catch {}
  const totalFormatted = totalSize > 1024*1024 ? (totalSize/(1024*1024)).toFixed(1)+' MB' : (totalSize/1024).toFixed(0)+' KB';
  res.json({ files, totalSize, totalFormatted, activeCount: files.filter(f => f.active).length });
});

app.post('/api/rag/toggle/:id', (req, res) => {
  const { id } = req.params;
  const meta = loadRagMeta();
  if (meta[id]) { meta[id].active = !meta[id].active; }
  else { meta[id] = { active: false }; }
  saveRagMeta(meta);
  res.json({ success: true, active: meta[id].active });
});

app.delete('/api/rag/:id', (req, res) => {
  const { id } = req.params;
  try {
    const filePath = path.join(RAG_DIR, id);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    const meta = loadRagMeta();
    delete meta[id];
    saveRagMeta(meta);
  } catch {}
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════
// SETTINGS ROUTES
// ═══════════════════════════════════════════════════════════════════

app.get('/api/settings', (req, res) => {
  res.json({
    language: config.language || 'en',
    autoStart: config.autoStart || false,
    cloudflareUrl: config.cloudflareUrl || '',
    modelPath: config.modelPath || '',
    activeModel: config.activeModel || '',
  });
});

app.post('/api/settings/save', (req, res) => {
  const { language, autoStart, cloudflareUrl, modelPath } = req.body;
  if (language !== undefined) config.language = language;
  
  if (autoStart !== undefined) {
    config.autoStart = autoStart;
    console.log(`[System Bridge] Setting Launch on Boot to: ${autoStart}`);
  }
  
  if (cloudflareUrl !== undefined) {
    const oldUrl = config.cloudflareUrl;
    config.cloudflareUrl = cloudflareUrl;
    // Auto-update webhook if URL changed and token exists
    if (oldUrl !== cloudflareUrl && config.telegram.token && config.telegram.connected) {
      const webhookUrl = `${cloudflareUrl.replace(/\/$/, '')}/api/bots/telegram/webhook`;
      fetch(`https://api.telegram.org/bot${config.telegram.token}/setWebhook?url=${webhookUrl}`)
        .catch(e => console.error("Auto-webhook update failed", e));
    }
  }
  if (modelPath !== undefined) config.modelPath = modelPath;
  saveConfig(config);
  res.json({ success: true });
});

app.get('/api/models/verify', (req, res) => {
  const fileToVerify = req.query.path;
  if (!fileToVerify) return res.status(400).json({ error: 'Path required' });
  const exists = fs.existsSync(fileToVerify);
  res.json({ exists });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ═══════════════════════════════════════════════════════════════════
// Frontend Catch-All Routing
// ═══════════════════════════════════════════════════════════════════
app.get('*splat', (req, res) => {
  if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  } else {
    res.status(404).send('Frontend not built. Run "npm run build" first.');
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
