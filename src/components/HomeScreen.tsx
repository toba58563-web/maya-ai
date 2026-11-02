import React, { useState, useEffect } from "react";
import {
  Menu,
  ShoppingBag,
  CloudSun,
  Sun,
  CloudRain,
  Cloud,
  Moon,
  ShieldCheck,
  Key,
  CheckCircle2,
  Sparkles,
  Phone,
  Image as ImageIcon,
  Code2,
  FileText,
  AlertCircle,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import { AppSettings, UserProfile, AssistantState, AssistantEmotion } from "../types";
import { MayaPhoneControlBridge, MayaPermissionsMap } from "../utils/mayaPhoneControl";
import { RGBVisualizerOrb } from "./RGBVisualizerOrb";
import { fetchLiveLocationWeather, WeatherData } from "../utils/weatherService";
import { ApiKeyManager, ApiKeyVerificationState } from "../utils/apiKeyManager";

interface HomeScreenProps {
  settings: AppSettings;
  profile: UserProfile;
  state: AssistantState;
  emotion?: AssistantEmotion;
  analyser?: AnalyserNode | null;
  userSpeech?: string;
  assistantSpeech?: string;
  activeActionText?: string;
  onToggleStartMaya: () => void;
  onOpenApiKeyModal: () => void;
  onOpenPermissionsModal: () => void;
  onQuickAction: (actionPrompt: string) => void;
  onOpenSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  settings,
  profile,
  state,
  emotion = "warm",
  analyser,
  userSpeech = "",
  assistantSpeech = "",
  activeActionText,
  onToggleStartMaya,
  onOpenApiKeyModal,
  onOpenPermissionsModal,
  onQuickAction,
  onOpenSettings,
}) => {
  // Real API Key verification state
  const [keyState, setKeyState] = useState<ApiKeyVerificationState>(() =>
    ApiKeyManager.getCurrentStatus(settings.customApiKey || "")
  );

  // Real Android permissions map
  const [permissionsMap, setPermissionsMap] = useState<MayaPermissionsMap | null>(null);

  const isNative = MayaPhoneControlBridge.isNative();

  useEffect(() => {
    setKeyState(ApiKeyManager.getCurrentStatus(settings.customApiKey || ""));
  }, [settings.customApiKey]);

  useEffect(() => {
    MayaPhoneControlBridge.checkAllPermissions().then(setPermissionsMap);
  }, []);

  const grantedCount = permissionsMap
    ? Object.values(permissionsMap).filter(Boolean).length
    : 0;
  const isPermissionsAllGood = grantedCount >= 4; // Core permissions

  // Dynamic Location Weather State
  const [weather, setWeather] = useState<WeatherData>({
    city: "Detecting Location...",
    temperature: 28,
    condition: "Checking weather...",
    icon: "cloud-sun",
    isDay: true,
    loading: true,
  });

  const loadWeather = async () => {
    try {
      const data = await fetchLiveLocationWeather();
      setWeather(data);
    } catch {
      setWeather({
        city: "Local",
        temperature: 29,
        condition: "Mostly Clear",
        icon: "sun",
        isDay: true,
        loading: false,
      });
    }
  };

  useEffect(() => {
    loadWeather();
  }, []);

  useEffect(() => {
    if (isNative) {
      MayaPhoneControlBridge.checkAllPermissions().then(setPermissionsMap);
    }
  }, [isNative]);

  const isGirlfriend = settings.personality === "Girlfriend Mode";
  const isProfessional = settings.personality === "Professional Mode";

  const displayName = isGirlfriend
    ? (profile?.name && profile.name !== "Boss" ? profile.name : profile?.nickname || "Jaan")
    : (profile?.name || settings.userName || "Boss");

  const greetingTitle = isGirlfriend
    ? `Hello, ${displayName}`
    : `Hello, ${displayName}`;

  const greetingSubtitle = isGirlfriend
    ? "Bas tumhara intezaar kar rahi thi. Batao, aaj ka din kaisa raha?"
    : isProfessional
    ? "All systems operational and ready. Standing by for your instructions, Boss."
    : "I'm Maya, your AI companion and phone assistant. How can I help you today?";

  const greetingEmoji = isGirlfriend ? "❤️" : isProfessional ? "👑" : "✨";

  const renderWeatherIcon = () => {
    if (weather.loading) {
      return <RefreshCw className="w-4 h-4 text-sky-400 animate-spin" />;
    }
    if (weather.icon === "sun") {
      return <Sun className="w-5 h-5 text-amber-400 animate-pulse" />;
    }
    if (weather.icon === "cloud-rain") {
      return <CloudRain className="w-5 h-5 text-blue-400" />;
    }
    if (weather.icon === "cloud") {
      return <Cloud className="w-5 h-5 text-slate-300" />;
    }
    if (!weather.isDay) {
      return <Moon className="w-5 h-5 text-indigo-300" />;
    }
    return <CloudSun className="w-5 h-5 text-sky-400" />;
  };

  const isLive = state !== "offline";

  return (
    <div className="w-full flex-1 flex flex-col justify-between px-5 pt-4 pb-28 overflow-y-auto max-w-md mx-auto select-none">
      {/* TOP HEADER SECTION */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* DYNAMIC REAL-LOCATION WEATHER WIDGET */}
          <button
            onClick={loadWeather}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 backdrop-blur-md transition-all text-right group cursor-pointer"
            title="Tap to refresh live location weather"
          >
            {renderWeatherIcon()}
            <div className="text-right">
              <div className="text-[10px] text-slate-400 flex items-center gap-0.5 justify-end group-hover:text-cyan-300 transition-colors">
                <span>📍 {weather.city}</span>
              </div>
              <div className="text-xs font-bold text-white leading-tight">
                {weather.loading ? "..." : `${weather.temperature}°C`}{" "}
                <span className="text-[10px] font-normal text-slate-300">
                  {weather.condition}
                </span>
              </div>
            </div>
            <div className="p-1 rounded-lg text-slate-400 hover:text-white ml-0.5">
              <ShoppingBag className="w-3.5 h-3.5 opacity-60" />
            </div>
          </button>
        </div>

        {/* GREETING TITLE */}
        <div className="mb-5">
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            {greetingTitle} <span className="text-2xl">{greetingEmoji}</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-normal">
            {greetingSubtitle}
          </p>
        </div>

        {/* DUAL STATUS CARDS (System / Permissions & API Key) */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* System & Permissions Card -> Opens Permissions Hub */}
          <button
            onClick={onOpenPermissionsModal}
            className="p-3.5 rounded-2xl bg-[#0f172a]/80 hover:bg-[#131f38] border border-white/10 text-left backdrop-blur-md flex flex-col justify-between shadow-sm transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                  isPermissionsAllGood
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                    : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              {isPermissionsAllGood ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Permissions</span>
                <span
                  className={`text-[10px] font-semibold ${
                    isPermissionsAllGood ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {isPermissionsAllGood ? "All Good" : `${grantedCount}/13 Active`}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 leading-tight block mt-0.5 group-hover:text-cyan-300 transition-colors">
                {grantedCount} of 13 Granted
              </span>
            </div>
          </button>

          {/* API Key Card -> Opens API Key Modal with TRUTHFUL Status */}
          <button
            onClick={onOpenApiKeyModal}
            className={`p-3.5 rounded-2xl border backdrop-blur-md text-left flex flex-col justify-between transition-all group cursor-pointer ${
              keyState.status === "connected"
                ? "bg-[#0c1e3a]/80 border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                : keyState.status === "unverified"
                ? "bg-[#2a1e10]/80 border-amber-500/40 hover:border-amber-400"
                : "bg-[#251016]/80 border-rose-500/40 hover:border-rose-400"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                  keyState.status === "connected"
                    ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300"
                    : keyState.status === "unverified"
                    ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                    : "bg-rose-500/20 border border-rose-500/40 text-rose-300"
                }`}
              >
                <Key className="w-5 h-5" />
              </div>
              {keyState.status === "connected" ? (
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              ) : keyState.status === "unverified" ? (
                <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 animate-pulse" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>API Key</span>
                <span
                  className={`text-[10px] font-semibold ${
                    keyState.status === "connected"
                      ? "text-cyan-400"
                      : keyState.status === "unverified"
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {keyState.status === "connected"
                    ? "Connected"
                    : keyState.status === "unverified"
                    ? "Not Verified"
                    : keyState.status === "failed"
                    ? "Connection Failed"
                    : "API Key Missing"}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 leading-tight block mt-0.5 group-hover:text-cyan-300 transition-colors">
                {keyState.status === "connected"
                  ? "Gemini Ready"
                  : keyState.status === "unverified"
                  ? "Test in Settings"
                  : keyState.status === "failed"
                  ? "Check key in Settings"
                  : "Tap to set key"}
              </span>
            </div>
          </button>
        </div>

        {/* HERO CARD: MAYA AI CORE WITH RGB VISUALIZER ORB (STAYS ON HOME SCREEN!) */}
        <div className="relative rounded-3xl p-5 bg-gradient-to-b from-[#060b18] via-[#091326] to-[#040814] border border-cyan-500/30 shadow-[0_12px_45px_rgba(6,182,212,0.2)] text-center overflow-hidden mb-6">
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* DYNAMIC CHROMATIC RGB VISUALIZER ORB */}
          <div className="py-2">
            <RGBVisualizerOrb
              state={state}
              emotion={emotion}
              analyser={analyser}
              onToggle={onToggleStartMaya}
              activeActionText={activeActionText}
            />
          </div>

          <h2 className="text-lg font-bold text-white tracking-tight mt-1">Maya AI Core</h2>
          <div className="flex items-center justify-center gap-1.5 mt-0.5 mb-3">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Voice &amp; Background Active
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                Your intelligent companion and phone controller
              </span>
            )}
          </div>

          {/* LIVE DIALOGUE & CAPTIONS CAPSULE (DIRECTLY ON HOME SCREEN - NO FULLSCREEN CALL POPUP!) */}
          {isLive ? (
            <div className="w-full mt-2 p-3 rounded-2xl bg-black/60 border border-cyan-500/30 text-left space-y-1.5 shadow-inner">
              {userSpeech && (
                <div className="text-xs text-pink-300 flex items-start gap-1.5">
                  <span className="font-bold shrink-0">You:</span>
                  <span className="italic">{userSpeech}</span>
                </div>
              )}
              {assistantSpeech ? (
                <div className="text-xs text-cyan-200 flex items-start gap-1.5">
                  <span className="font-bold text-cyan-400 shrink-0">Maya:</span>
                  <span className="leading-relaxed">{assistantSpeech}</span>
                </div>
              ) : (
                <div className="text-[11px] text-cyan-400/80 animate-pulse flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Listening to your voice... Speak in Hindi, Hinglish, or English</span>
                </div>
              )}
            </div>
          ) : assistantSpeech ? (
            <div className="w-full mt-2 p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-left space-y-2 shadow-inner">
              <div className="text-xs text-rose-200 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{assistantSpeech}</span>
              </div>
              <button
                onClick={onToggleStartMaya}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Gemini Live Connection</span>
              </button>
            </div>
          ) : (
            <div className="w-full mt-2 py-2 px-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center text-[11px] text-slate-400">
              💡 Tap the <strong className="text-rose-400">START</strong> button below or tap the Orb to begin speaking!
            </div>
          )}
        </div>

        {/* QUICK ACTIONS SECTION */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Quick Actions</span>
            </h3>
            <button
              onClick={() => onQuickAction("Hi Maya, what phone commands can you do?")}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              See All
            </button>
          </div>

          {/* 4 Action Tiles Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* 1. Phone Control */}
            <button
              onClick={() => onQuickAction("Maya, open WhatsApp")}
              className="p-3.5 rounded-2xl bg-[#0f172a]/70 hover:bg-[#152238] border border-white/10 hover:border-emerald-500/40 text-left transition-all group shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2.5 group-hover:scale-110 transition-transform">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                Phone Control
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                Open apps, scroll, type
              </div>
            </button>

            {/* 2. Image Generator */}
            <button
              onClick={() => onQuickAction("Can you create a 4K image of a sunset beach?")}
              className="p-3.5 rounded-2xl bg-[#0f172a]/70 hover:bg-[#152238] border border-white/10 hover:border-purple-500/40 text-left transition-all group shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-2.5 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                Image Generator
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                Create 4K images
              </div>
            </button>

            {/* 3. Code Assistant */}
            <button
              onClick={() => onQuickAction("Write clean Kotlin code for Android Accessibility Service")}
              className="p-3.5 rounded-2xl bg-[#0f172a]/70 hover:bg-[#152238] border border-white/10 hover:border-blue-500/40 text-left transition-all group shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2.5 group-hover:scale-110 transition-transform">
                <Code2 className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                Code Assistant
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                Build & run with Termux
              </div>
            </button>

            {/* 4. Create PRD */}
            <button
              onClick={() => onQuickAction("Help me write a detailed Product Requirement Document (PRD)")}
              className="p-3.5 rounded-2xl bg-[#0f172a]/70 hover:bg-[#152238] border border-white/10 hover:border-amber-500/40 text-left transition-all group shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2.5 group-hover:scale-110 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                Create PRD
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                Detailed project planning
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
