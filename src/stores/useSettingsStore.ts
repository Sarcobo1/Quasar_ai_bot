import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  language: string;
  autoStart: boolean;
  cloudflareUrl: string;
  modelPath: string;
  activeModel: string;
  setLanguage: (lang: string) => void;
  setAutoStart: (val: boolean) => void;
  setCloudflareUrl: (url: string) => void;
  setModelPath: (path: string) => void;
  setActiveModel: (name: string) => void;
  updateFromBackend: (data: Partial<SettingsState>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "en",
      autoStart: false,
      cloudflareUrl: "",
      modelPath: "./models/Qwen2.5-3B.gguf",
      activeModel: "Qwen2.5 3B",
      
      setLanguage: (lang) => set({ language: lang }),
      setAutoStart: (val) => set({ autoStart: val }),
      setCloudflareUrl: (url) => set({ cloudflareUrl: url }),
      setModelPath: (path) => set({ modelPath: path }),
      setActiveModel: (name) => set({ activeModel: name }),
      
      updateFromBackend: (data) => set((state) => ({ ...state, ...data })),
    }),
    {
      name: "quasarmobile-settings",
    }
  )
);
