import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Square, RotateCw, Thermometer, Zap, Loader2 } from "lucide-react";
import StarField from "@/components/StarField";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";

const CircularProgress = ({ value, size = 80, label }: { value: number; size?: number; label: string }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={5} />
        <motion.circle 
          cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#grad)" strokeWidth={5}
          strokeLinecap="round" strokeDasharray={circ} 
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(263, 70%, 58%)" />
            <stop offset="100%" stopColor="hsl(187, 94%, 43%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-lg font-bold text-foreground">{value}%</span>
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  );
};

const DashboardScreen = () => {
  const [metrics, setMetrics] = useState({ ram: 0, cpu: 0, temp: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [botStatuses, setBotStatuses] = useState({ telegram: "offline", whatsapp: "offline" });
  
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/metrics");
        const data = await res.json();
        setMetrics(data);
      } catch (e) {
        console.error("Failed to fetch metrics");
      }
    };
    fetchMetrics();
    const metricsInterval = setInterval(fetchMetrics, 2000);

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/server/status");
        const data = await res.json();
        setIsRunning(data.isRunning);
      } catch (e) {
        console.error("Failed to fetch status");
      }
    };
    fetchStatus();
    const statusInterval = setInterval(fetchStatus, 2000);

    const fetchBots = async () => {
      try {
        const [tgRes, waRes] = await Promise.all([
          fetch("/api/bots/telegram/status"),
          fetch("/api/bots/whatsapp/status")
        ]);
        const tgData = await tgRes.json();
        const waData = await waRes.json();
        setBotStatuses({ telegram: tgData.status, whatsapp: waData.status });
      } catch (e) {
        console.error("Failed to fetch bots");
      }
    };
    fetchBots();
    const botInterval = setInterval(fetchBots, 5000);

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats/requests");
        const data = await res.json();
        setRequestCount(data.count);
      } catch (e) {
        console.error("Failed to fetch stats");
      }
    };
    fetchStats();
    const statsInterval = setInterval(fetchStats, 10000);

    return () => {
      clearInterval(metricsInterval);
      clearInterval(statusInterval);
      clearInterval(botInterval);
      clearInterval(statsInterval);
    };
  }, []);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await fetch("/api/server/start", { method: "POST" });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      await fetch("/api/server/stop", { method: "POST" });
    } finally {
      setIsStopping(false);
    }
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await fetch("/api/server/restart", { method: "POST" });
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <MobileFrame>
      <StarField />
      <div className="relative z-10 min-h-screen px-5 pt-14 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-xs text-muted-foreground mb-1">Good evening</p>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        </motion.div>

        {/* Active Model Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card-purple p-5 mb-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-success status-live' : 'bg-muted-foreground'}`} />
              <span className={`text-xs font-medium ${isRunning ? 'text-success' : 'text-muted-foreground'}`}>
                {isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
              <Zap size={12} className="text-primary" />
              <span className="text-[10px] font-semibold text-primary">Active</span>
            </div>
          </div>
          <h3 className="text-xl font-bold gradient-text mb-1">Qwen2.5 3B</h3>
          <p className="text-xs text-muted-foreground mb-4">localhost:8080 · {requestCount} requests today</p>
          
          <div className="flex justify-around">
            <div className="relative">
              <CircularProgress value={metrics.ram} label="RAM" />
            </div>
            <div className="relative">
              <CircularProgress value={metrics.cpu} label="CPU" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-[80px] h-[80px] flex items-center justify-center">
                <div className="flex items-center gap-1.5">
                  <Thermometer size={20} className="text-warning" />
                  <span className="text-lg font-bold text-warning">{metrics.temp}°</span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Temp</span>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3 mb-5"
        >
          <button onClick={handleStart} disabled={isStarting || isRestarting} className="glass-card p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
            {isStarting ? <Loader2 size={20} className="text-success animate-spin" /> : <Play size={20} className="text-success" />}
            <span className="text-xs font-medium text-foreground">Start</span>
          </button>
          <button onClick={handleStop} disabled={isStopping || isRestarting} className="glass-card p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
            {isStopping ? <Loader2 size={20} className="text-destructive animate-spin" /> : <Square size={20} className="text-destructive" />}
            <span className="text-xs font-medium text-foreground">Stop</span>
          </button>
          <button onClick={handleRestart} disabled={isRestarting || isStarting || isStopping} className="glass-card p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
            {isRestarting ? <Loader2 size={20} className="text-info animate-spin" /> : <RotateCw size={20} className="text-info" />}
            <span className="text-xs font-medium text-foreground">Restart</span>
          </button>
        </motion.div>

        {/* Connected Bots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-sm font-semibold text-foreground mb-3">Connected Bots</h2>
          <div className="space-y-2">
            {[
              { name: "Telegram", status: botStatuses.telegram, icon: "🤖" },
              { name: "WhatsApp", status: botStatuses.whatsapp, icon: "💬" },
              { name: "Discord", status: "offline", icon: "🎮" },
            ].map(bot => (
              <div key={bot.name} className="glass-card p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{bot.icon}</span>
                  <span className="text-sm font-medium text-foreground">{bot.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${bot.status === 'live' ? 'bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${bot.status === 'live' ? 'text-success' : 'text-muted-foreground'}`}>
                    {bot.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </MobileFrame>
  );
};

export default DashboardScreen;
