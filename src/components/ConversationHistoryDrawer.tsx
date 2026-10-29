import React from "react";
import { MessageItem } from "../types";
import { X, Trash2, Volume2, User, Heart, Sparkles, MessageCircle } from "lucide-react";
import { audioPlayer } from "../utils/audioPlayer";

interface ConversationHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: MessageItem[];
  onClearHistory: () => void;
  preferredVoice?: string;
}

export const ConversationHistoryDrawer: React.FC<ConversationHistoryDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onClearHistory,
  preferredVoice,
}) => {
  if (!isOpen) return null;

  const handleReplay = async (msg: MessageItem) => {
    if (msg.audioBase64) {
      try {
        await audioPlayer.playPcmBase64(msg.audioBase64);
        return;
      } catch {}
    }
    // Fallback to browser TTS
    audioPlayer.speakBrowserTts(msg.text, { preferredVoiceName: preferredVoice });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-[#11121c] border-l border-white/10 flex flex-col shadow-2xl text-slate-100 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Conversation History</h2>
              <p className="text-xs text-slate-400">
                {messages.length} message{messages.length === 1 ? "" : "s"} in memory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={onClearHistory}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Clear all messages"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Heart className="w-10 h-10 stroke-1 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-400">No conversation yet</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Say hello to Maya or press the glowing Start button to start talking!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isAssistant ? "items-start" : "items-end"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-md transition-all ${
                      isAssistant
                        ? "bg-gradient-to-br from-rose-950/40 to-purple-950/40 border border-rose-500/25 text-rose-50 rounded-tl-sm"
                        : "bg-emerald-950/50 border border-emerald-500/30 text-emerald-50 rounded-tr-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                        {isAssistant ? "Maya" : "You"}
                      </span>
                      <span className="text-[10px] opacity-50">{msg.timestamp}</span>
                    </div>

                    <p className="leading-relaxed">{msg.text}</p>

                    {isAssistant && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                        {msg.emotion && (
                          <span className="text-[10px] text-rose-300/80 font-medium">
                            Tone: {msg.emotion}
                          </span>
                        )}
                        <button
                          onClick={() => handleReplay(msg)}
                          className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-white bg-rose-500/20 px-2 py-0.5 rounded-lg transition-colors ml-auto"
                          title="Replay Maya's voice"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Replay</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-white/[0.01] border-t border-white/5 text-center text-[11px] text-slate-500">
          Maya keeps context in active memory during your ongoing session.
        </div>
      </div>
    </div>
  );
};
