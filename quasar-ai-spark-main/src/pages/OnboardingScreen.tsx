import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, HardDrive, MemoryStick, CheckCircle2, ArrowRight } from "lucide-react";
import StarField from "@/components/StarField";
import MobileFrame from "@/components/MobileFrame";

const specs = [
  { icon: MemoryStick, label: "RAM", value: "8 GB", progress: 0 },
  { icon: Cpu, label: "CPU", value: "Snapdragon 8 Gen 2", progress: 0 },
  { icon: HardDrive, label: "Storage", value: "128 GB free", progress: 0 },
];

const OnboardingScreen = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(true);
  const [scanProgress, setScanProgress] = useState(0);
  const [specProgress, setSpecProgress] = useState([0, 0, 0]);
  const [found, setFound] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setScanning(false);
          setFound(true);
          return 100;
        }
        const newP = p + 1.5;
        setSpecProgress([
          Math.min(newP * 1.2, 100),
          Math.min(newP * 0.9, 100),
          Math.min(newP * 1.05, 100),
        ]);
        return newP;
      });
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <MobileFrame>
      <StarField />
      <div className="relative z-10 min-h-screen px-6 pt-16 pb-8 flex flex-col">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Device Setup</h1>
          <p className="text-sm text-muted-foreground mb-8">Scanning your hardware capabilities...</p>
        </motion.div>

        {/* Spec Cards */}
        <div className="space-y-3 mb-8">
          {specs.map((spec, i) => (
            <motion.div
              key={spec.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="glass-card p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <spec.icon size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <span className="text-xs text-muted-foreground">{spec.label}</span>
                  <p className="text-sm font-semibold text-foreground">{spec.value}</p>
                </div>
                {specProgress[i] >= 100 && (
                  <CheckCircle2 size={18} className="text-success" />
                )}
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${specProgress[i]}%`,
                    background: "var(--gradient-purple-cyan)",
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Overall progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Overall scan</span>
            <span>{Math.round(scanProgress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${scanProgress}%`,
                background: "var(--gradient-purple-cyan)",
              }}
            />
          </div>
        </div>

        {/* Result Card */}
        <AnimatePresence>
          {found && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="glass-card-purple p-5 mt-auto"
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={20} className="text-success" />
                <span className="text-sm font-semibold text-foreground">We found your perfect model</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold gradient-text">Qwen2.5 3B</h3>
                  <p className="text-xs text-muted-foreground">Optimal for 8GB RAM · 2.1 GB download</p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-semibold bg-success/10 text-success">
                  Recommended
                </div>
              </div>
              <button
                onClick={() => navigate("/dashboard")}
                className="btn-primary-gradient w-full flex items-center justify-center gap-2 text-sm"
              >
                Get Started <ArrowRight size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MobileFrame>
  );
};

export default OnboardingScreen;
