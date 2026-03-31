import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import OnboardingScreen from "./pages/OnboardingScreen.tsx";
import DashboardScreen from "./pages/DashboardScreen.tsx";
import ModelManagerScreen from "./pages/ModelManagerScreen.tsx";
import BotConnectionScreen from "./pages/BotConnectionScreen.tsx";
import RAGScreen from "./pages/RAGScreen.tsx";
import SettingsScreen from "./pages/SettingsScreen.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/models" element={<ModelManagerScreen />} />
          <Route path="/bots" element={<BotConnectionScreen />} />
          <Route path="/rag" element={<RAGScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
