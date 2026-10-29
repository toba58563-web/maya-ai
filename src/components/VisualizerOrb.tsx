import React, { useEffect, useRef } from "react";
import { AssistantState, AssistantEmotion } from "../types";
import { Mic, MicOff, Sparkles, Volume2, Loader2, Heart } from "lucide-react";

interface VisualizerOrbProps {
  state: AssistantState;
  emotion: AssistantEmotion;
  analyser: AnalyserNode | null;
  onToggle: () => void;
}

export const VisualizerOrb: React.FC<VisualizerOrbProps> = ({
  state,
  emotion,
  analyser,
  onToggle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Status-dependent styling & colors
  const stateThemes = {
    offline: {
      primaryColor: "rgba(100, 116, 139, 0.4)",
      glowColor: "rgba(71, 85, 105, 0.2)",
      label: "Offline",
      sublabel: "Tap to awaken Maya",
      badgeBg: "bg-slate-800/80 text-slate-300 border-slate-700/60",
    },
    listening: {
      primaryColor: "rgba(16, 185, 129, 0.8)",
      glowColor: "rgba(6, 182, 212, 0.45)",
      label: "Listening to you...",
      sublabel: "Speak naturally, I'm all ears",
      badgeBg: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40",
    },
    thinking: {
      primaryColor: "rgba(168, 85, 247, 0.85)",
      glowColor: "rgba(236, 72, 153, 0.5)",
      label: "Maya is thinking...",
      sublabel: "Crafting a thoughtful reply",
      badgeBg: "bg-purple-950/80 text-purple-300 border-purple-500/40",
    },
    speaking: {
      primaryColor: "rgba(244, 63, 94, 0.9)",
      glowColor: "rgba(251, 113, 133, 0.6)",
      label: "Maya is speaking",
      sublabel: "Say anything to interrupt",
      badgeBg: "bg-rose-950/80 text-rose-300 border-rose-500/40",
    },
  };

  const currentTheme = stateThemes[state];

  // Emotion labels
  const emotionIcons: Record<AssistantEmotion, { emoji: string; text: string }> = {
    warm: { emoji: "💖", text: "Warm & Caring" },
    laugh: { emoji: "😄", text: "Playful Chuckle" },
    playful: { emoji: "✨", text: "Playful" },
    comforting: { emoji: "🌸", text: "Soothing" },
    excited: { emoji: "🎉", text: "Excited" },
    thoughtful: { emoji: "💭", text: "Thoughtful" },
  };

  const emotionInfo = emotionIcons[emotion] || emotionIcons.warm;

  // Real-time canvas wave drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;
    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 32);

    const render = () => {
      phase += 0.035;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      let audioVolume = 0;
      if (analyser && (state === "listening" || state === "speaking")) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        audioVolume = sum / (dataArray.length * 255);
      }

      // Base radius with state dynamics
      const baseRadius = 78 + (state === "speaking" ? audioVolume * 45 : state === "listening" ? audioVolume * 25 : 0);

      // 1. Draw outer ambient gradient glow
      const outerGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.4,
        centerX,
        centerY,
        baseRadius * 2.1
      );

      if (state === "speaking") {
        outerGlow.addColorStop(0, "rgba(244, 63, 94, 0.4)");
        outerGlow.addColorStop(0.5, "rgba(236, 72, 153, 0.2)");
        outerGlow.addColorStop(1, "rgba(244, 63, 94, 0)");
      } else if (state === "listening") {
        outerGlow.addColorStop(0, "rgba(16, 185, 129, 0.4)");
        outerGlow.addColorStop(0.5, "rgba(6, 182, 212, 0.2)");
        outerGlow.addColorStop(1, "rgba(16, 185, 129, 0)");
      } else if (state === "thinking") {
        outerGlow.addColorStop(0, "rgba(168, 85, 247, 0.4)");
        outerGlow.addColorStop(0.5, "rgba(217, 70, 239, 0.2)");
        outerGlow.addColorStop(1, "rgba(168, 85, 247, 0)");
      } else {
        outerGlow.addColorStop(0, "rgba(99, 102, 241, 0.15)");
        outerGlow.addColorStop(1, "rgba(99, 102, 241, 0)");
      }

      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 2.1, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw organic harmonic wave layers
      const layers = state === "offline" ? 1 : 3;
      for (let l = 0; l < layers; l++) {
        ctx.beginPath();
        const points = 60;
        const layerPhase = phase * (l === 0 ? 1 : l === 1 ? -1.3 : 1.6);
        const waveScale = state === "speaking" ? 12 + audioVolume * 30 : state === "listening" ? 8 + audioVolume * 22 : state === "thinking" ? 9 : 2.5;

        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const harmonic = Math.sin(angle * (4 + l) + layerPhase) * Math.cos(angle * 3 - layerPhase);
          const r = baseRadius + harmonic * waveScale;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        const strokeAlpha = 0.35 + l * 0.2;
        if (state === "speaking") {
          ctx.strokeStyle = `rgba(251, 113, 133, ${strokeAlpha})`;
        } else if (state === "listening") {
          ctx.strokeStyle = `rgba(52, 211, 153, ${strokeAlpha})`;
        } else if (state === "thinking") {
          ctx.strokeStyle = `rgba(192, 132, 252, ${strokeAlpha})`;
        } else {
          ctx.strokeStyle = `rgba(148, 163, 184, 0.25)`;
        }
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 3. Central luminous inner core
      const coreGrad = ctx.createRadialGradient(
        centerX - baseRadius * 0.2,
        centerY - baseRadius * 0.25,
        10,
        centerX,
        centerY,
        baseRadius * 0.95
      );

      if (state === "speaking") {
        coreGrad.addColorStop(0, "#ffe4e6");
        coreGrad.addColorStop(0.3, "#f43f5e");
        coreGrad.addColorStop(0.85, "#be123c");
        coreGrad.addColorStop(1, "#881337");
      } else if (state === "listening") {
        coreGrad.addColorStop(0, "#ccfbf1");
        coreGrad.addColorStop(0.3, "#10b981");
        coreGrad.addColorStop(0.85, "#047857");
        coreGrad.addColorStop(1, "#064e3b");
      } else if (state === "thinking") {
        coreGrad.addColorStop(0, "#fae8ff");
        coreGrad.addColorStop(0.3, "#a855f7");
        coreGrad.addColorStop(0.85, "#7e22ce");
        coreGrad.addColorStop(1, "#3b0764");
      } else {
        coreGrad.addColorStop(0, "#334155");
        coreGrad.addColorStop(0.6, "#1e293b");
        coreGrad.addColorStop(1, "#0f172a");
      }

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.92, 0, Math.PI * 2);
      ctx.fill();

      // Subtle specular highlight on top
      const highlight = ctx.createRadialGradient(
        centerX,
        centerY - baseRadius * 0.45,
        2,
        centerX,
        centerY - baseRadius * 0.45,
        baseRadius * 0.6
      );
      highlight.addColorStop(0, "rgba(255, 255, 255, 0.4)");
      highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = highlight;
      ctx.beginPath();
      ctx.arc(centerX, centerY - baseRadius * 0.45, baseRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state, analyser]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-6">
      {/* Visualizer Canvas Container */}
      <div
        className="relative w-72 h-72 sm:w-84 sm:h-84 flex items-center justify-center cursor-pointer group"
        onClick={onToggle}
        title={state === "offline" ? "Click to start Maya" : "Click to pause / interrupt"}
      >
        <canvas
          ref={canvasRef}
          width={360}
          height={360}
          className="w-full h-full transform transition-transform duration-300 group-hover:scale-105"
        />

        {/* Center overlay icon indicator */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {state === "offline" && (
            <div className="flex flex-col items-center text-slate-400">
              <MicOff className="w-8 h-8 opacity-75 mb-1 text-slate-400 group-hover:text-rose-400 transition-colors" />
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400 group-hover:text-rose-300 transition-colors">
                Start
              </span>
            </div>
          )}

          {state === "listening" && (
            <div className="flex flex-col items-center text-white drop-shadow-md animate-pulse">
              <Mic className="w-8 h-8 text-emerald-200 mb-1" />
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-medium tracking-wide uppercase text-emerald-200">
                  Listening
                </span>
              </div>
            </div>
          )}

          {state === "thinking" && (
            <div className="flex flex-col items-center text-white drop-shadow-md">
              <Loader2 className="w-8 h-8 text-purple-200 animate-spin mb-1" />
              <span className="text-[11px] font-medium tracking-wide uppercase text-purple-200">
                Thinking
              </span>
            </div>
          )}

          {state === "speaking" && (
            <div className="flex flex-col items-center text-white drop-shadow-md">
              <Volume2 className="w-8 h-8 text-rose-100 mb-1 animate-bounce [animation-duration:1.2s]" />
              <span className="text-[11px] font-medium tracking-wide uppercase text-rose-100">
                Speaking
              </span>
            </div>
          )}
        </div>

        {/* Emotion Floating Pill when active */}
        {state !== "offline" && (
          <div className="absolute top-2 right-4 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
            <span>{emotionInfo.emoji}</span>
            <span className="font-medium text-[11px]">{emotionInfo.text}</span>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="text-center mt-2">
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium backdrop-blur-md shadow-sm transition-all duration-300 ${currentTheme.badgeBg}`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              state === "listening"
                ? "bg-emerald-400 animate-ping"
                : state === "speaking"
                ? "bg-rose-400 animate-pulse"
                : state === "thinking"
                ? "bg-purple-400 animate-spin"
                : "bg-slate-500"
            }`}
          />
          <span>{currentTheme.label}</span>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 font-light">
          {currentTheme.sublabel}
        </p>
      </div>
    </div>
  );
};
