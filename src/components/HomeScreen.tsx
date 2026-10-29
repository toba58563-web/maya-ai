import React, { useState, useEffect } from "react";
import {
  Menu,
  ShoppingBag,
  CloudSun,
  ShieldCheck,
  Key,
  CheckCircle2,
  Sparkles,
  Phone,
  Image as ImageIcon,
  Code2,
  FileText,
  Play,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import { AppSettings, UserProfile } from "../types";
import { MayaPhoneControlBridge } from "../utils/mayaPhoneControl";

interface HomeScreenProps {
  settings: AppSettings;
  profile: UserProfile;
  onStartMaya: () => void;
  onOpenApiKeyModal: () => void;
  onQuickAction: (actionPrompt: string) => void;
  onOpenSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  settings,
  profile,
  onStartMaya,
  onOpenApiKeyModal,
  onQuickAction,
  onOpenSettings,
}) => {
  const isKeyConfigured = Boolean(settings.customApiKey?.trim());
  const userName = profile.name || "Boss";
  const isNative = MayaPhoneControlBridge.isNative();

  const [accessibilityOk, setAccessibilityOk] = useState(false);
  const [overlayOk, setOverlayOk] = useState(false);

  useEffect(() => {
    if (isNative) {
      MayaPhoneControlBridge.isAccessibilityEnabled().then(setAccessibilityOk);
      MayaPhoneControlBridge.isOverlayPermissionGranted().then(setOverlayOk);
    }
  }, [isNative]);

  return (
    <div className="w-full flex-1 flex flex-col justify-between px-5 pt-4 pb-24 overflow-y-auto max-w-md mx-auto">
      {/* TOP HEADER SECTION */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Weather Widget (Top Right) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <CloudSun className="w-5 h-5 text-sky-400" />
            <div className="text-right">
              <div className="text-[10px] text-slate-400 flex items-center gap-0.5 justify-end">
                <span>📍 Kolkata</span>
              </div>
              <div className="text-xs font-bold text-white leading-tight">
                31°C <span className="text-[10px] font-normal text-slate-300">Mostly Cloudy</span>
              </div>
            </div>
            <button className="p-1 rounded-lg text-slate-400 hover:text-white ml-1">
              <ShoppingBag className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* GREETING TITLE */}
        <div className="mb-5">
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Hello, {userName} <span className="text-2xl">👑</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-normal">
            I'm Maya, your AI companion and phone assistant. How can I help you today?
          </p>
        </div>

        {/* DUAL STATUS CARDS (System & API Key) */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* System / Permissions Card */}
          <button
            onClick={onOpenSettings}
            className="p-3.5 rounded-2xl bg-[#0f172a]/80 hover:bg-[#131f38] border border-white/10 text-left backdrop-blur-md flex flex-col justify-between shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              {accessibilityOk || !isNative ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>System</span>
                <span className="text-[10px] font-normal text-emerald-400">
                  {accessibilityOk || !isNative ? "All Good" : "Setup Perms"}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                {isNative ? "Accessibility & Overlay" : "Device & Permissions"}
              </span>
            </div>
          </button>

          {/* API Key Card */}
          <button
            onClick={onOpenApiKeyModal}
            className={`p-3.5 rounded-2xl border backdrop-blur-md text-left flex flex-col justify-between transition-all group ${
              isKeyConfigured
                ? "bg-[#0c1e3a]/80 border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                : "bg-[#2a1b10]/80 border-amber-500/40 hover:border-amber-400"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isKeyConfigured
                    ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300"
                    : "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                }`}
              >
                <Key className="w-5 h-5" />
              </div>
              {isKeyConfigured ? (
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>API Key</span>
                <span
                  className={`text-[10px] font-semibold ${
                    isKeyConfigured ? "text-cyan-400" : "text-amber-400"
                  }`}
                >
                  {isKeyConfigured ? "Connected" : "Configure"}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 leading-tight block mt-0.5 group-hover:text-cyan-300 transition-colors">
                {isKeyConfigured ? "Gemini Ready" : "Tap to set key"}
              </span>
            </div>
          </button>
        </div>

        {/* HERO CARD: MAYA AI CORE */}
        <div className="relative rounded-3xl p-6 bg-gradient-to-b from-[#060b18] via-[#091326] to-[#040814] border border-cyan-500/30 shadow-[0_12px_45px_rgba(6,182,212,0.2)] text-center overflow-hidden mb-6">
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Glowing Animated Core with "M" Logo */}
          <div className="relative mx-auto w-32 h-32 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-500 to-pink-500 opacity-60 blur-md animate-pulse" />
            <div className="absolute inset-1 rounded-full border border-cyan-400/60 animate-spin [animation-duration:12s]" />
            <div className="absolute inset-3 rounded-full border border-pink-400/40 animate-spin [animation-duration:8s] [animation-direction:reverse]" />

            <div className="relative w-24 h-24 rounded-full bg-gradient-to-b from-[#0b1730] to-[#030611] border-2 border-cyan-300/80 shadow-[0_0_25px_rgba(6,182,212,0.6)] flex items-center justify-center">
              <span className="font-['Space_Grotesk'] text-4xl font-extrabold bg-gradient-to-tr from-cyan-300 via-white to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]">
                M
              </span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">Maya AI Core</h2>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Your intelligent companion and phone controller
          </p>

          {/* LARGE PLAY BUTTON: START MAYA */}
          <button
            onClick={onStartMaya}
            className="w-full max-w-xs mx-auto py-3.5 px-6 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600 hover:from-pink-400 hover:to-fuchsia-500 text-white font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(244,63,94,0.5)] hover:shadow-[0_0_35px_rgba(244,63,94,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>START MAYA</span>
          </button>
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
