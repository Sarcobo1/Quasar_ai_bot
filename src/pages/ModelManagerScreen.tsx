import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, CheckCircle2, Filter, Search, Trash2, Zap, Loader2, AlertCircle } from "lucide-react";
import StarField from "@/components/StarField";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";

interface Model {
  name: string;
  file: string;
  size: string;
  ram: string;
  ramMB: number;
  installed: boolean;
  compatible: boolean;
  active: boolean;
  downloading: boolean;
  progress: number;
}

const ModelManagerScreen = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [totalRAM, setTotalRAM] = useState(0);
  const [filterCompat, setFilterCompat] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/models/list");
      const data = await res.json();
      setModels(data.models);
      setTotalRAM(data.totalRAM_MB);
    } catch (e) { console.error("Failed to fetch models"); }
  }, []);

  useEffect(() => {
    fetchModels();
    const interval = setInterval(fetchModels, 3000);
    return () => clearInterval(interval);
  }, [fetchModels]);

  const handleDownload = async (name: string) => {
    try {
      await fetch("/api/models/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      // SSE progress subscription
      const evtSrc = new EventSource(`/api/models/download/progress/${encodeURIComponent(name)}`);
      evtSrc.onmessage = (e) => {
        const data = JSON.parse(e.data);
        setModels(prev => prev.map(m => m.name === name ? { ...m, downloading: true, progress: data.progress } : m));
        if (data.done || data.progress >= 100) {
          evtSrc.close();
          setTimeout(fetchModels, 1000);
        }
      };
      evtSrc.onerror = () => { evtSrc.close(); setTimeout(fetchModels, 1000); };
    } catch (e) { console.error("Download error"); }
  };

  const handleDelete = async (name: string) => {
    setDeleting(name);
    try {
      await fetch(`/api/models/${encodeURIComponent(name)}`, { method: "DELETE" });
      await fetchModels();
    } finally { setDeleting(null); }
  };

  const handleActivate = async (name: string) => {
    setActivating(name);
    try {
      await fetch("/api/models/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      await fetchModels();
    } finally { setActivating(null); }
  };

  const filtered = models
    .filter(m => !filterCompat || m.compatible)
    .filter(m => !searchQ || m.name.toLowerCase().includes(searchQ.toLowerCase()));

  return (
    <MobileFrame>
      <StarField />
      <div className="relative z-10 min-h-screen px-5 pt-14 pb-28">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Models</h1>
          <p className="text-xs text-muted-foreground mb-5">
            Browse and manage LLM models · {Math.round(totalRAM / 1024)} GB RAM
          </p>
        </motion.div>

        {/* Search + Filter */}
        <div className="flex gap-2 mb-5">
          <div className="flex-1 glass-card flex items-center gap-2 px-3 py-2.5">
            <Search size={16} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
            />
          </div>
          <button
            onClick={() => setFilterCompat(!filterCompat)}
            className={`glass-card px-3 flex items-center gap-1.5 transition-colors ${filterCompat ? "border-primary/40" : ""}`}
          >
            <Filter size={14} className={filterCompat ? "text-primary" : "text-muted-foreground"} />
            <span className={`text-xs font-medium ${filterCompat ? "text-primary" : "text-muted-foreground"}`}>Fit</span>
          </button>
        </div>

        {/* Model List */}
        <div className="space-y-3">
          {filtered.map((model, i) => (
            <motion.div
              key={model.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`glass-card p-4 ${!model.compatible ? "opacity-50" : ""} ${model.compatible && !model.installed ? "border-l-2 border-l-success/40" : ""}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{model.name}</h3>
                    {model.active && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-[9px] font-bold text-primary">
                        <Zap size={8} /> ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{model.size} · Requires {model.ram} RAM</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {model.installed ? (
                    <>
                      {!model.active && (
                        <button
                          onClick={() => handleActivate(model.name)}
                          disabled={activating === model.name}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          {activating === model.name ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                          Use
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(model.name)}
                        disabled={deleting === model.name || model.active}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-30"
                      >
                        {deleting === model.name ? <Loader2 size={14} className="text-destructive animate-spin" /> : <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />}
                      </button>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10">
                        <CheckCircle2 size={12} className="text-success" />
                        <span className="text-[10px] font-semibold text-success">Installed</span>
                      </div>
                    </>
                  ) : !model.compatible ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                      <AlertCircle size={10} /> Incompatible
                    </span>
                  ) : model.downloading ? (
                    <span className="text-[10px] font-medium text-primary px-2 py-0.5 rounded-full bg-primary/10">
                      {model.progress}%
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDownload(model.name)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Download size={12} /> Get
                    </button>
                  )}
                </div>
              </div>
              {model.downloading && (
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Downloading...</span>
                    <span>{model.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-info"
                      animate={{ width: `${model.progress}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
      <BottomNav />
    </MobileFrame>
  );
};

export default ModelManagerScreen;
