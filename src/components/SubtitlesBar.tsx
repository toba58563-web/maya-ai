import React from "react";
import { AssistantState } from "../types";
import { User, Sparkles, Volume2 } from "lucide-react";

interface SubtitlesBarProps {
  state: AssistantState;
  userSpeech: string;
  assistantSpeech: string;
  isInterim: boolean;
}

export const SubtitlesBar: React.FC<SubtitlesBarProps> = ({
  state,
  userSpeech,
  assistantSpeech,
  isInterim,
}) => {
  // Determine what to display
  const showUser = state === "listening" && userSpeech.trim().length > 0;
  const showAssistant = state === "speaking" && assistantSpeech.trim().length > 0;
  const showThinking = state === "thinking";

  if (!showUser && !showAssistant && !showThinking && !assistantSpeech) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center text-xs text-slate-500 italic">
        "Say &lsquo;Hey Maya&rsquo;, tell me about your day, or ask me anything..."
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4">
      {/* User Transcript */}
      {showUser && (
        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-emerald-500/30 backdrop-blur-md shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-0.5">
              <span>You</span>
              {isInterim && (
                <span className="text-[10px] lowercase text-emerald-400/60 font-normal">
                  (listening...)
                </span>
              )}
            </div>
            <p className="text-sm text-slate-100 font-medium leading-relaxed">
              {userSpeech}
              {isInterim && <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-400 animate-pulse" />}
            </p>
          </div>
        </div>
      )}

      {/* Thinking Indicator */}
      {showThinking && (
        <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 backdrop-blur-md shadow-lg flex items-center gap-3 animate-in fade-in duration-200">
          <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
          </div>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm text-purple-200 font-medium">Maya is processing...</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}

      {/* Maya Spoken Subtitle */}
      {(showAssistant || (!showUser && !showThinking && assistantSpeech)) && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-pink-950/40 border border-rose-500/30 backdrop-blur-md shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
            <Volume2 className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                Maya
              </span>
              <span className="text-[10px] text-rose-300/60">Voice companion</span>
            </div>
            <p className="text-sm sm:text-base text-rose-50/95 font-normal leading-relaxed">
              {assistantSpeech}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
