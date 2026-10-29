import React, { useEffect, useState } from "react";
import { Sparkles, Heart, Mic, ArrowRight } from "lucide-react";

interface SplashScreenProps {
  onDismiss: () => void;
  onQuickStart: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDismiss, onQuickStart }) => {
  const [fading, setFading] = useState(false);

  const handleStartNow = () => {
    setFading(true);
    setTimeout(() => {
      onQuickStart();
    }, 400);
  };

  const handleEnter = () => {
    setFading(true);
    setTimeout(() => {
      onDismiss();
    }, 400);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#0e1017] via-[#12131e] to-[#0a0a0f] text-white transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background ambient radial glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top pill */}
      <div className="pt-8 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs tracking-wider text-rose-300 font-medium">
        <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400 animate-pulse" />
        <span>VOICE-TO-VOICE AI COMPANION</span>
      </div>

      {/* Center animated logo */}
      <div className="flex flex-col items-center text-center my-auto">
        <div className="relative mb-8 group cursor-pointer" onClick={handleStartNow}>
          {/* Animated pulsing outer halo */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-rose-500/30 via-purple-500/30 to-pink-500/30 blur-xl animate-pulse" />

          {/* Secondary rotating gradient ring */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-rose-400 via-pink-500 to-indigo-500 opacity-80 animate-spin [animation-duration:8s]" />

          {/* Core Avatar Circle */}
          <div className="relative w-36 h-36 rounded-full bg-[#181926] border-2 border-white/20 flex flex-col items-center justify-center shadow-2xl backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-rose-500/20 via-transparent to-purple-600/30" />
            <div className="relative z-10 flex flex-col items-center">
              <span className="font-['Space_Grotesk'] text-4xl font-bold tracking-tight bg-gradient-to-r from-rose-200 via-pink-100 to-white bg-clip-text text-transparent">
                maya
              </span>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-rose-300/80 font-medium">
                <Sparkles className="w-3 h-3 text-pink-300" />
                <span>always here</span>
              </div>
            </div>

            {/* Simulated soundwave bars inside logo */}
            <div className="absolute bottom-4 flex items-center gap-1 h-3">
              {[40, 75, 100, 60, 90, 45, 80].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-rose-400/80 rounded-full animate-pulse"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 120}ms`,
                    animationDuration: "1s",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
          Meet <span className="text-rose-400">Maya</span>
        </h1>
        <p className="text-base text-slate-300/90 max-w-sm font-light leading-relaxed">
          Your warm, witty, and emotionally perceptive AI friend. Ready to listen, laugh, comfort, and talk naturally.
        </p>

        {/* Feature badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6 max-w-xs text-xs text-slate-300">
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
            Continuous Voice
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
            Live Interruptions
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
            Zero Robot Tone
          </span>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="w-full max-w-xs flex flex-col gap-3 pb-6">
        <button
          onClick={handleStartNow}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white font-semibold text-base shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Mic className="w-5 h-5" />
          <span>Start Voice Session</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>

        <button
          onClick={handleEnter}
          className="w-full py-2.5 px-4 rounded-xl text-slate-400 hover:text-white text-sm transition-colors"
        >
          Preview Interface First
        </button>
      </div>
    </div>
  );
};
