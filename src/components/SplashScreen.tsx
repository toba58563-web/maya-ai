import React, { useEffect, useState } from "react";
import { Sparkles, Zap, Shield, Smartphone, ArrowRight } from "lucide-react";

interface SplashScreenProps {
  onDismiss: () => void;
  onQuickStart: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDismiss, onQuickStart }) => {
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState("Initializing Neural Core...");

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(50);
      setStatusText("Connecting Audio & Android Bridges...");
    }, 400);

    const t2 = setTimeout(() => {
      setProgress(85);
      setStatusText("Ready with Hindi, Hinglish & English...");
    }, 900);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText("Welcome, Boss!");
    }, 1400);

    const t4 = setTimeout(() => {
      handleEnter();
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const handleEnter = () => {
    setFading(true);
    setTimeout(() => {
      onDismiss();
    }, 450);
  };

  const handleStartNow = () => {
    setFading(true);
    setTimeout(() => {
      onQuickStart();
    }, 450);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#030612] via-[#050b1d] to-[#02040b] text-white transition-opacity duration-500 overflow-hidden select-none ${
        fading ? "opacity-0 pointer-events-none scale-105" : "opacity-100 scale-100"
      }`}
    >
      {/* Background Ambient Glowing Nebulae */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-gradient-to-tr from-cyan-500/25 via-purple-600/20 to-pink-500/25 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] bg-blue-600/15 rounded-full blur-[90px] pointer-events-none" />

      {/* Cyber Grid Lines */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Top Header Tag */}
      <div className="pt-6 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-lg text-[11px] tracking-wider text-cyan-300 font-medium">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin [animation-duration:8s]" />
        <span className="font-semibold tracking-widest uppercase">Next-Gen Voice & Phone AI</span>
      </div>

      {/* Center Cinematic RGB Core Emblem */}
      <div className="flex flex-col items-center text-center my-auto relative z-10">
        <div className="relative mb-6">
          {/* Outer Pulsing Chromatic Halo */}
          <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-pink-500/30 blur-2xl animate-pulse" />

          {/* Rotating RGB Neon Rings */}
          <div
            className="absolute -inset-2 rounded-full p-[2px] animate-spin [animation-duration:10s]"
            style={{
              background:
                "conic-gradient(from 0deg, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #f43f5e, #10b981, #06b6d4)",
            }}
          >
            <div className="w-full h-full rounded-full bg-[#030612]" />
          </div>

          <div
            className="absolute -inset-4 rounded-full p-[1.5px] opacity-60 animate-spin [animation-duration:7s] [animation-direction:reverse]"
            style={{
              background:
                "conic-gradient(from 180deg, #ec4899, #8b5cf6, #06b6d4, #10b981, #f59e0b, #ec4899)",
            }}
          >
            <div className="w-full h-full rounded-full bg-[#030612]" />
          </div>

          {/* Inner Premium Holographic Core */}
          <div className="relative w-32 h-32 rounded-full bg-gradient-to-b from-[#09152b] via-[#050b1a] to-[#02050e] border-2 border-cyan-400/60 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.6)] backdrop-blur-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,_rgba(255,255,255,0.25),_transparent_70%)]" />

            {/* Glowing "M" Monogram */}
            <span className="font-['Space_Grotesk'] text-5xl font-black tracking-tight bg-gradient-to-tr from-cyan-300 via-white to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(6,182,212,0.9)]">
              M
            </span>

            {/* Live Waveform Indicator Bar */}
            <div className="absolute bottom-3.5 flex items-center gap-1">
              {[25, 60, 95, 45, 80, 40, 70].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-cyan-400 to-pink-400 rounded-full animate-pulse"
                  style={{
                    height: `${h * 0.15}px`,
                    animationDelay: `${i * 100}ms`,
                    animationDuration: "800ms",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Brand Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 flex items-center justify-center gap-2">
          <span>Maya</span>
          <span className="bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">
            AI
          </span>
          <span className="text-2xl">👑</span>
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 max-w-xs font-normal leading-relaxed">
          Your warm, intelligent companion & automated Android phone assistant.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-[10px] text-slate-300 font-medium">
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            Neural Voice
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-emerald-400" />
            Phone Control
          </span>
          <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center gap-1">
            <Shield className="w-3 h-3 text-purple-400" />
            Keystore Secure
          </span>
        </div>

        {/* Progress Bar & Loader Status */}
        <div className="w-64 mt-6">
          <div className="flex items-center justify-between text-[11px] mb-1.5 text-slate-400">
            <span>{statusText}</span>
            <span className="font-mono text-cyan-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden p-[1px]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 transition-all duration-300 shadow-[0_0_10px_#06b6d4]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Direct Entry Action */}
      <div className="w-full max-w-xs flex flex-col gap-2.5 pb-6 relative z-10">
        <button
          onClick={handleEnter}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 group"
        >
          <span>ENTER MAYA AI</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={handleStartNow}
          className="text-xs text-slate-400 hover:text-cyan-300 py-1 transition-colors text-center"
        >
          Direct Voice Activation
        </button>
      </div>
    </div>
  );
};
