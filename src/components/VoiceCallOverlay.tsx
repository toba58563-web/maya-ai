import React from "react";
import { PhoneOff, Mic, MicOff, Volume2, X, Sparkles } from "lucide-react";
import { AssistantState, AssistantEmotion } from "../types";
import { VisualizerOrb } from "./VisualizerOrb";
import { SubtitlesBar } from "./SubtitlesBar";
import { ZaraAvatar } from "./ZaraAvatar";

interface VoiceCallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  state: AssistantState;
  emotion: AssistantEmotion;
  analyser: AnalyserNode | null;
  userSpeech: string;
  assistantSpeech: string;
  isInterim: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onEndCall: () => void;
  onOrbClick: () => void;
}

export const VoiceCallOverlay: React.FC<VoiceCallOverlayProps> = ({
  isOpen,
  onClose,
  state,
  emotion,
  analyser,
  userSpeech,
  assistantSpeech,
  isInterim,
  isMuted,
  onToggleMute,
  onInterrupt,
  onEndCall,
  onOrbClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#040714]/95 backdrop-blur-2xl text-slate-100 p-6 animate-in fade-in duration-300 max-w-md mx-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-gradient-to-tr from-cyan-500/20 via-pink-500/15 to-purple-600/20 rounded-full blur-[110px] pointer-events-none" />

      {/* TOP HEADER */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ZaraAvatar size="sm" isOnline={true} />
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Zara AI Call</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h2>
            <div className="text-[11px] text-cyan-300 flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Aoede Voice • Google Cloud Live</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Minimize call"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* CENTER VISUALIZER & SUBTITLES */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-auto">
        <VisualizerOrb
          state={state}
          emotion={emotion}
          analyser={analyser}
          onToggle={onOrbClick}
        />

        <div className="w-full mt-6">
          <SubtitlesBar
            state={state}
            userSpeech={userSpeech}
            assistantSpeech={assistantSpeech}
            isInterim={isInterim}
          />
        </div>
      </div>

      {/* BOTTOM CALL CONTROLS */}
      <div className="relative z-10 flex items-center justify-center gap-5 pb-4">
        {/* Mute Button */}
        <button
          onClick={onToggleMute}
          className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${
            isMuted
              ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
              : "bg-white/[0.06] border-white/15 text-slate-200 hover:bg-white/[0.12]"
          }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* End Call Button */}
        <button
          onClick={onEndCall}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)] active:scale-95 transition-all"
          title="End Call"
        >
          <PhoneOff className="w-7 h-7" />
        </button>

        {/* Interrupt Button */}
        <button
          onClick={onInterrupt}
          disabled={state !== "speaking"}
          className="w-14 h-14 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-200 flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none"
          title="Interrupt Zara"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
