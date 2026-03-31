import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Wifi, WifiOff, Loader2, Check, Unplug, MessageSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import StarField from "@/components/StarField";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";
import { useSettingsStore } from "@/stores/useSettingsStore";

const BotConnectionScreen = () => {
  const { cloudflareUrl } = useSettingsStore();

  const [tgToken, setTgToken] = useState("");
  const [tgOwnerId, setTgOwnerId] = useState("");
  
  const [tgConnected, setTgConnected] = useState(false);
  const [tgBotName, setTgBotName] = useState("");
  const [tgUsername, setTgUsername] = useState("");
  const [tgError, setTgError] = useState("");
  
  const [tgConnecting, setTgConnecting] = useState(false);
  const [tgDisconnecting, setTgDisconnecting] = useState(false);
  const [tgTesting, setTgTesting] = useState(false);
  
  const [copied, setCopied] = useState(false);
  const [waStatus, setWaStatus] = useState("offline");

  // Load saved config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/bots/telegram/config");
        const data = await res.json();
        setTgToken(data.token || "");
        setTgOwnerId(data.ownerChatId || "");
        setTgConnected(data.connected || false);
        setTgBotName(data.botName || "");
        setTgUsername(data.botUsername || "");
      } catch (e) { console.error("Failed to load telegram config"); }
    };
    fetchConfig();

    // Poll bot statuses
    const pollStatuses = async () => {
      try {
        const [tgRes, waRes] = await Promise.all([
          fetch("/api/bots/telegram/status"),
          fetch("/api/bots/whatsapp/status"),
        ]);
        const tgData = await tgRes.json();
        const waData = await waRes.json();
        
        if (tgData.status === "live") {
           setTgConnected(true);
           setTgError("");
        } else {
           setTgConnected(false);
           setTgError(tgData.error || "");
        }
        
        setWaStatus(waData.status);
      } catch {}
    };
    pollStatuses();
    const interval = setInterval(pollStatuses, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    if (!tgToken.trim()) return;
    if (!cloudflareUrl) {
       toast.error("Please configure the Cloudflare Tunnel URL in Settings first!");
       return;
    }
    
    setTgConnecting(true);
    setTgError("");
    try {
      const res = await fetch("/api/bots/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tgToken, ownerChatId: tgOwnerId }),
      });
      const data = await res.json();
      if (data.success) {
        setTgConnected(true);
        setTgBotName(data.botName || "");
        setTgUsername(data.username || "");
        toast.success(`Connected to @${data.username}`);
      } else {
        toast.error(data.error || "Failed to connect");
      }
    } catch (e) { 
       toast.error("Connection error");
    }
    finally { setTgConnecting(false); }
  };

  const handleDisconnect = async () => {
    setTgDisconnecting(true);
    try {
      await fetch("/api/bots/telegram/disconnect", { method: "POST" });
      setTgConnected(false);
      setTgBotName("");
      setTgUsername("");
      setTgError("");
      toast("Bot disconnected");
    } catch {}
    finally { setTgDisconnecting(false); }
  };
  
  const handleTestBot = async () => {
    if (!tgOwnerId) {
      toast.error("Please enter your Owner Chat ID first");
      return;
    }
    setTgTesting(true);
    try {
      const res = await fetch("/api/bots/telegram/test", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Test message sent successfully! Check Telegram.");
      } else {
        toast.error(data.error || "Failed to send test message");
      }
    } catch (e) {
      toast.error("Network error sending test message");
    } finally {
      setTgTesting(false);
    }
  };

  const handleCopyToken = () => {
    if (tgToken) {
      navigator.clipboard.writeText(tgToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <MobileFrame>
      <StarField />
      <div className="relative z-10 min-h-screen px-5 pt-14 pb-28">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Bot Connections</h1>
          <p className="text-xs text-muted-foreground mb-6">Connect messaging platforms to your AI</p>
        </motion.div>

        {/* Telegram Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card-cyan p-5 mb-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <h3 className="text-base font-semibold text-foreground">Telegram Bot</h3>
                {tgBotName && tgConnected && (
                  <p className="text-[10px] text-muted-foreground">@{tgUsername}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5">
                {tgConnected ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <span className="text-xs font-medium text-success">Live Webhook</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={14} className={tgToken ? "text-destructive" : "text-muted-foreground"} />
                    <span className={`text-xs font-medium ${tgToken ? "text-destructive" : "text-muted-foreground"}`}>Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {tgError && (
             <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2 mb-3 flex items-start gap-1.5">
               <AlertCircle size={12} className="text-destructive mt-0.5 shrink-0" />
               <p className="text-[10px] text-destructive leading-tight">{tgError}</p>
             </div>
          )}

          {/* Token Input */}
          <label className="text-xs text-muted-foreground mb-1.5 block">Bot Token (From @BotFather)</label>
          <div className="flex gap-2 mb-3">
            <div className="flex-1 glass-card px-3 py-2.5 flex items-center">
              <input
                type="text"
                value={tgToken}
                onChange={e => setTgToken(e.target.value)}
                placeholder="123456:ABC-DEF1234ghIkl-..."
                className="bg-transparent text-xs text-foreground font-mono placeholder:text-muted-foreground outline-none w-full"
                disabled={tgConnected}
              />
            </div>
            <button onClick={handleCopyToken} className="glass-card px-3 flex items-center">
              {copied ? <Check size={14} className="text-success" /> : <Copy size={14} className="text-muted-foreground" />}
            </button>
          </div>

          {/* Owner ID Input */}
          <label className="text-xs text-muted-foreground mb-1.5 block">Your Chat ID (For Test Messages)</label>
          <div className="glass-card px-3 py-2.5 mb-4">
            <input
              type="text"
              value={tgOwnerId}
              onChange={e => setTgOwnerId(e.target.value)}
              placeholder="e.g. 123456789"
              className="bg-transparent text-xs text-foreground font-mono placeholder:text-muted-foreground outline-none w-full"
              disabled={tgConnected}
            />
          </div>

          {/* Connect/Disconnect Buttons */}
          {tgConnected ? (
            <div className="flex gap-2">
              <button
                onClick={handleDisconnect}
                disabled={tgDisconnecting || tgTesting}
                className="flex-1 glass-card py-2.5 flex items-center justify-center gap-1.5 hover:border-destructive/30 transition-colors text-destructive disabled:opacity-50"
              >
                {tgDisconnecting ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
                <span className="text-xs font-medium">Disconnect</span>
              </button>
              <button
                onClick={handleTestBot}
                disabled={tgTesting || tgDisconnecting}
                className="flex-1 btn-primary-gradient py-2.5 flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
              >
                {tgTesting ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                Test Bot
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={tgConnecting || !tgToken.trim()}
              className="btn-primary-gradient w-full text-xs py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {tgConnecting ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
              <span>Setup Webhook & Connect</span>
            </button>
          )}
          
          {!cloudflareUrl && !tgConnected && (
             <p className="text-[10px] text-muted-foreground mt-2 text-center">
               Requires Cloudflare URL in Settings to receive webhooks.
             </p>
          )}
        </motion.div>

        {/* WhatsApp Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card p-5 mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <h3 className="text-base font-semibold text-foreground">WhatsApp</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {waStatus === "live" ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  <span className="text-xs font-medium text-success">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} className="text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Offline</span>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Business API integration coming soon</p>
        </motion.div>

        {/* Discord Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card p-5 opacity-60"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎮</span>
              <h3 className="text-base font-semibold text-foreground">Discord</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <WifiOff size={14} className="text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Offline</span>
            </div>
          </div>
          <button className="btn-primary-gradient w-full text-xs py-2.5" disabled>Coming Soon</button>
        </motion.div>
      </div>
      <BottomNav />
    </MobileFrame>
  );
};

export default BotConnectionScreen;
