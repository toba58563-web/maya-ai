import React, { useEffect, useRef } from "react";
import { AssistantState, AssistantEmotion } from "../types";
import { Sparkles, Mic, Volume2, Loader2, Zap } from "lucide-react";

interface RGBVisualizerOrbProps {
  state: AssistantState;
  emotion?: AssistantEmotion;
  analyser?: AnalyserNode | null;
  onToggle: () => void;
  size?: "sm" | "md" | "lg";
  activeActionText?: string;
}

export const RGBVisualizerOrb: React.FC<RGBVisualizerOrbProps> = ({
  state,
  emotion = "warm",
  analyser,
  onToggle,
  size = "md",
  activeActionText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Audio frequency visualizer on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const bufferLength = analyser?.frequencyBinCount || 32;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let avgVol = 0;
      if (analyser && state === "speaking") {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        avgVol = sum / bufferLength / 255;
      } else if (state === "listening") {
        // Organic breathing wave
        avgVol = 0.2 + 0.15 * Math.sin(Date.now() / 250);
      } else if (state === "thinking") {
        avgVol = 0.35 + 0.2 * Math.sin(Date.now() / 150);
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 46 + avgVol * 18;

      // Draw flowing outer RGB chromatic wave ripples
      const numWaves = 3;
      for (let w = 0; w < numWaves; w++) {
        const waveRadius = baseRadius + w * (6 + avgVol * 8);
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);

        if (state === "speaking") {
          gradient.addColorStop(0, "rgba(244, 63, 94, 0.4)");
          gradient.addColorStop(0.5, "rgba(168, 85, 247, 0.45)");
          gradient.addColorStop(1, "rgba(6, 182, 212, 0.4)");
        } else if (state === "listening") {
          gradient.addColorStop(0, "rgba(6, 182, 212, 0.5)");
          gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.45)");
          gradient.addColorStop(1, "rgba(16, 185, 129, 0.4)");
        } else if (state === "thinking") {
          gradient.addColorStop(0, "rgba(168, 85, 247, 0.6)");
          gradient.addColorStop(1, "rgba(236, 72, 153, 0.4)");
        } else {
          gradient.addColorStop(0, "rgba(6, 182, 212, 0.2)");
          gradient.addColorStop(1, "rgba(147, 51, 234, 0.15)");
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.max(10, waveRadius), 0, Math.PI * 2);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2 + w;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [analyser, state]);

  const isLive = state !== "offline";

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Dynamic Background RGB Lighting Glow */}
      <div
        className={`absolute -inset-6 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          state === "speaking"
            ? "bg-gradient-to-r from-pink-500/35 via-rose-500/30 to-fuchsia-600/35 scale-125"
            : state === "listening"
            ? "bg-gradient-to-r from-cyan-500/35 via-blue-500/30 to-emerald-500/35 scale-110"
            : state === "thinking"
            ? "bg-gradient-to-r from-purple-600/40 via-violet-500/30 to-indigo-500/40 animate-pulse"
            : "bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-pink-500/15"
        }`}
      />

      {/* Main Interactive Orb Body */}
      <div
        onClick={onToggle}
        className="relative w-40 h-40 flex items-center justify-center cursor-pointer group active:scale-95 transition-transform"
        title={isLive ? "Tap to Stop Maya" : "Tap to Start Maya"}
      >
        {/* Canvas Visualizer for Audio Wave */}
        <canvas
          ref={canvasRef}
          width={180}
          height={180}
          className="absolute inset-0 pointer-events-none -m-2.5 z-0"
        />

        {/* Outer Chroma RGB Rotating Ring 1 */}
        <div
          className={`absolute inset-0 rounded-full p-[2px] transition-all duration-500 ${
            isLive ? "animate-spin [animation-duration:9s]" : ""
          }`}
          style={{
            background:
              "conic-gradient(from 0deg, #06b6d4, #3b82f6, #a855f7, #ec4899, #f43f5e, #10b981, #06b6d4)",
          }}
        >
          <div className="w-full h-full rounded-full bg-[#050814]" />
        </div>

        {/* Reverse Rotating RGB Ring 2 */}
        <div
          className={`absolute inset-2 rounded-full p-[1.5px] opacity-75 ${
            isLive ? "animate-spin [animation-duration:6s] [animation-direction:reverse]" : ""
          }`}
          style={{
            background:
              "conic-gradient(from 180deg, #ec4899, #8b5cf6, #06b6d4, #10b981, #f59e0b, #ec4899)",
          }}
        >
          <div className="w-full h-full rounded-full bg-[#050814]" />
        </div>

        {/* Core Sphere */}
        <div
          className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-500 overflow-hidden ${
            state === "speaking"
              ? "bg-gradient-to-tr from-[#2d0b28] via-[#1a0826] to-[#0a1833] border-2 border-pink-400/80 shadow-[0_0_35px_rgba(244,63,94,0.65)]"
              : state === "listening"
              ? "bg-gradient-to-tr from-[#052233] via-[#071a33] to-[#040817] border-2 border-cyan-400/80 shadow-[0_0_35px_rgba(6,182,212,0.65)]"
              : state === "thinking"
              ? "bg-gradient-to-tr from-[#1b0a2e] via-[#100826] to-[#040817] border-2 border-purple-400/80 shadow-[0_0_35px_rgba(168,85,247,0.65)]"
              : "bg-gradient-to-tr from-[#071326] via-[#091024] to-[#040814] border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)] group-hover:border-cyan-400 group-hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
          }`}
        >
          {/* Internal Shimmering Light */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,_var(--tw-gradient-stops))] from-white/30 via-transparent to-black/60 pointer-events-none" />

          {/* Monogram or Active Icon */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            {state === "speaking" ? (
              <div className="flex items-center gap-1">
                {[14, 26, 38, 20, 32].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-gradient-to-t from-pink-400 to-rose-300 rounded-full animate-pulse"
                    style={{
                      height: `${h}px`,
                      animationDelay: `${i * 120}ms`,
                      animationDuration: "600ms",
                    }}
                  />
                ))}
              </div>
            ) : state === "listening" ? (
              <div className="flex flex-col items-center">
                <Mic className="w-8 h-8 text-cyan-300 animate-pulse drop-shadow-[0_0_10px_#06b6d4]" />
                <span className="text-[9px] uppercase tracking-widest text-cyan-300 font-bold mt-1">
                  Listening
                </span>
              </div>
            ) : state === "thinking" ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-purple-300 animate-spin drop-shadow-[0_0_10px_#a855f7]" />
                <span className="text-[9px] uppercase tracking-widest text-purple-300 font-bold mt-1">
                  Thinking
                </span>
              </div>
            ) : (
              <span className="font-['Space_Grotesk'] text-4xl font-extrabold bg-gradient-to-tr from-cyan-300 via-white to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] group-hover:scale-110 transition-transform">
                M
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status Pill Badge */}
      <div className="mt-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/50 border border-white/10 backdrop-blur-md shadow-lg">
        {state === "speaking" ? (
          <>
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
            <span className="text-xs font-semibold text-pink-300 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> Maya Speaking (Aoede Voice)
            </span>
          </>
        ) : state === "listening" ? (
          <>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shadow-[0_0_8px_#06b6d4]" />
            <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" /> Listening in Hindi / English...
            </span>
          </>
        ) : state === "thinking" ? (
          <>
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_#a855f7]" />
            <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Processing Request...
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-cyan-400" /> Maya Ready • Tap Start Below
            </span>
          </>
        )}
      </div>

      {/* Dynamic Action / Transcription Highlight */}
      {activeActionText && (
        <div className="mt-2 text-[11px] text-cyan-300 font-medium px-3 py-1 rounded-xl bg-cyan-950/60 border border-cyan-500/30 animate-pulse flex items-center gap-1.5 max-w-xs text-center">
          <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="truncate">{activeActionText}</span>
        </div>
      )}
    </div>
  );
};
