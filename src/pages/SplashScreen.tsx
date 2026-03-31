import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import StarField from "@/components/StarField";
import MobileFrame from "@/components/MobileFrame";

const SplashScreen = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => navigate("/onboarding"), 400);
          return 100;
        }
        return p + 2;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <MobileFrame>
      <StarField />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mb-8"
        >
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Orbit rings */}
            <div className="absolute inset-0 orbit-ring">
              <div className="w-full h-full rounded-full border border-primary/30" 
                style={{ transform: "rotateX(60deg)" }} />
            </div>
            <div className="absolute inset-[-8px] orbit-ring-reverse">
              <div className="w-full h-full rounded-full border border-secondary/30" 
                style={{ transform: "rotateX(60deg) rotateY(30deg)" }} />
            </div>
            {/* Q letter */}
            <span className="text-5xl font-black gradient-text select-none">Q</span>
            {/* Glow */}
            <div className="absolute inset-0 rounded-full opacity-30"
              style={{ background: "radial-gradient(circle, hsla(263,70%,58%,0.4), transparent 70%)" }} />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-3xl font-bold gradient-text mb-3"
        >
          QuasarMobile
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="text-muted-foreground text-sm font-medium tracking-wide mb-16"
        >
          Your phone. Your AI.
        </motion.p>

        {/* Loading bar */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "60%" }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="h-1 rounded-full bg-muted overflow-hidden"
        >
          <div
            className="h-full rounded-full transition-all duration-100 ease-linear"
            style={{
              width: `${progress}%`,
              background: "var(--gradient-purple-cyan)",
            }}
          />
        </motion.div>
      </div>
    </MobileFrame>
  );
};

export default SplashScreen;
