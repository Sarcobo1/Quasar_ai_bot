import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, Power, Cloud, ChevronRight, Info, Save, Loader2, Check, FolderOpen, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import StarField from "@/components/StarField";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";
import { useSettingsStore } from "@/stores/useSettingsStore";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "uz", label: "O'zbekcha" },
  { code: "ru", label: "Русский" },
];

const SettingsScreen = () => {
  const { 
    language, setLanguage, 
    autoStart, setAutoStart, 
    cloudflareUrl, setCloudflareUrl, 
    modelPath, setModelPath, 
    activeModel, updateFromBackend 
  } = useSettingsStore();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [modelError, setModelError] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        updateFromBackend({
          language: data.language || "en",
          autoStart: data.autoStart || false,
          cloudflareUrl: data.cloudflareUrl || "",
          modelPath: data.modelPath || "./models/Qwen2.5-3B.gguf",
          activeModel: data.activeModel || "Qwen2.5 3B"
        });
      } catch (e) { console.error("Failed to load settings from backend"); }
      finally { setLoading(false); }
    };
    fetchSettings();
  }, [updateFromBackend]);

  const validateUrl = (url: string) => {
    if (!url) return true; // Empty is fine, just means disabled
    const regex = /^https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com\/?$/i;
    // Also allow custom https domains
    const customRegex = /^https:\/\/[a-zA-Z0-9-.]+\.[a-zA-Z]{2,}\/?$/i;
    return regex.test(url) || customRegex.test(url);
  };

  const handleSave = async () => {
    setUrlError("");
    setModelError("");

    if (!validateUrl(cloudflareUrl)) {
      setUrlError("Invalid URL. Must be a secure https:// domain.");
      return;
    }

    setSaving(true);
    
    // Check if model file exists
    try {
      if (modelPath) {
        const res = await fetch(`/api/models/verify?path=${encodeURIComponent(modelPath)}`);
        const data = await res.json();
        if (!data.exists) {
          setModelError("File does not exist at path!");
          setSaving(false);
          return;
        }
      }
    } catch (e) {
       console.error("Failed to verify model");
    }

    try {
      await fetch("/api/settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, autoStart, cloudflareUrl, modelPath }),
      });
      toast.success("Settings saved successfully!");
    } catch (e) { 
      toast.error("Failed to save settings to backend.");
      console.error("Save failed"); 
    }
    finally { setSaving(false); }
  };

  const currentLangLabel = LANGUAGES.find(l => l.code === language)?.label || "English";

  const ToggleSwitch = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-colors relative ${value ? "bg-primary" : "bg-muted"}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${value ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );

  if (loading) {
    return (
      <MobileFrame>
        <StarField />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
        <BottomNav />
      </MobileFrame>
    );
  }

  return (
    <MobileFrame>
      <StarField />
      <div className="relative z-10 min-h-screen px-5 pt-14 pb-28">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
          <p className="text-xs text-muted-foreground mb-6">Configure your QuasarMobile instance</p>
        </motion.div>

        {/* General */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">General</h2>
          <div className="glass-card overflow-hidden divide-y divide-border/50">
            {/* Language */}
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Globe size={18} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Language</span>
                </div>
                <button onClick={() => setShowLangPicker(!showLangPicker)} className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{currentLangLabel}</span>
                  <ChevronRight size={14} className={`text-muted-foreground transition-transform ${showLangPicker ? "rotate-90" : ""}`} />
                </button>
              </div>
              {showLangPicker && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
                  <div className="flex gap-2 pt-2">
                    {LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        onClick={() => { setLanguage(l.code); setShowLangPicker(false); toast("Language updated: " + l.label); }}
                        className={`flex-1 text-xs py-2 rounded-lg transition-colors font-medium ${
                          language === l.code
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "glass-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Auto-start */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Power size={18} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Launch on Boot</span>
              </div>
              <ToggleSwitch value={autoStart} onToggle={() => {
                setAutoStart(!autoStart);
                if (!autoStart) toast("Auto-start enabled check console bridge");
              }} />
            </div>
          </div>
        </motion.div>

        {/* Network */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Network</h2>
          <div className={`glass-card overflow-hidden divide-y divide-border/50 ${urlError ? "border-destructive/50" : ""}`}>
            {/* Cloudflare Tunnel URL */}
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3 mb-2">
                <Cloud size={18} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Cloudflare Tunnel URL</span>
              </div>
              <input
                type="text"
                value={cloudflareUrl}
                onChange={e => { setCloudflareUrl(e.target.value); setUrlError(""); }}
                placeholder="https://your-tunnel.trycloudflare.com"
                className="w-full bg-muted/30 rounded-lg px-3 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30"
              />
              {urlError && <p className="text-[10px] text-destructive mt-1.5 flex items-center gap-1"><AlertCircle size={10} /> {urlError}</p>}
            </div>
          </div>
        </motion.div>

        {/* Model */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Model</h2>
          <div className={`glass-card overflow-hidden divide-y divide-border/50 ${modelError ? "border-destructive/50" : ""}`}>
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3 mb-1">
                <FolderOpen size={18} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Current Active Model</span>
              </div>
              <p className="text-[10px] text-primary font-medium ml-[30px] mb-2">{activeModel || "None"}</p>
              
              <label className="text-[10px] text-muted-foreground ml-[30px] block mb-1">File Path Override (.gguf)</label>
              <input
                type="text"
                value={modelPath}
                onChange={e => { setModelPath(e.target.value); setModelError(""); }}
                placeholder="./models/Qwen2.5-3B.gguf"
                className="w-full bg-muted/30 rounded-lg px-3 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30 ml-[30px] max-w-[calc(100%-30px)]"
              />
              {modelError && <p className="text-[10px] text-destructive mt-1.5 flex items-center gap-1 ml-[30px]"><AlertCircle size={10} /> {modelError}</p>}
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary-gradient w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {saving ? "Saving & Verifying..." : "Save Settings"}
          </button>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-4 flex items-center gap-3 mt-5"
        >
          <Info size={18} className="text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">QuasarMobile v1.0.0</p>
            <p className="text-[10px] text-muted-foreground">Your phone. Your AI.</p>
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </MobileFrame>
  );
};

export default SettingsScreen;
