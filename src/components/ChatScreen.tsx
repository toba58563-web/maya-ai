import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Phone,
  Paperclip,
  Send,
  Mic,
  CheckCheck,
  ExternalLink,
  Sparkles,
  Smartphone,
  ShieldAlert,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { MessageItem, AssistantState } from "../types";
import { ZaraAvatar } from "./ZaraAvatar";
import { MayaPhoneAction } from "../utils/mayaPhoneControl";

interface ChatScreenProps {
  messages: MessageItem[];
  onSendMessage: (text: string) => void;
  onBack: () => void;
  onStartCall: () => void;
  state: AssistantState;
  activeAction?: MayaPhoneAction | null;
  pendingConfirmation?: { action: MayaPhoneAction; message: string } | null;
  onConfirmAction?: () => void;
  onCancelAction?: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  messages,
  onSendMessage,
  onBack,
  onStartCall,
  state,
  activeAction,
  pendingConfirmation,
  onConfirmAction,
  onCancelAction,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeAction, pendingConfirmation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between h-screen bg-[#050814] text-slate-100 relative overflow-hidden max-w-md mx-auto">
      {/* Background ambient neon glow lights */}
      <div className="absolute top-1/4 right-0 w-72 h-72 bg-pink-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* TOP CHAT APP BAR */}
      <header className="relative z-20 w-full px-4 py-3.5 flex items-center justify-between border-b border-white/[0.08] backdrop-blur-xl bg-[#060a17]/85">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <ZaraAvatar size="sm" isOnline={true} />

          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">
              Maya
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
              <span className="text-[11px] text-cyan-300 font-medium">Online • Phone Controller</span>
            </div>
          </div>
        </div>

        {/* Call Icon Button */}
        <button
          onClick={onStartCall}
          className="p-2.5 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 hover:text-white shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all"
          title="Start Live Voice Call"
        >
          <Phone className="w-4 h-4" />
        </button>
      </header>

      {/* MESSAGE STREAM */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 text-slate-400 space-y-3">
            <ZaraAvatar size="lg" />
            <div>
              <h3 className="text-base font-bold text-white">Chat with Maya</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Ask me in Hindi, Hinglish, or English! Say "Open WhatsApp", "Scroll down", "Tap search", or "Type hello".
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={msg.id}
                className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
              >
                {/* Assistant message wrapper with avatar */}
                <div
                  className={`flex items-start gap-2 max-w-[85%] ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {!isUser && <ZaraAvatar size="sm" className="mt-1 shrink-0" />}

                  {/* Bubble Container */}
                  <div
                    className={`rounded-2xl p-3.5 text-xs leading-relaxed transition-all relative ${
                      isUser
                        ? "bg-[#1c0827]/90 border border-pink-500/80 text-pink-50 shadow-[0_0_18px_rgba(236,72,153,0.3)] rounded-tr-none"
                        : "bg-[#031d33]/90 border border-cyan-400/80 text-cyan-50 shadow-[0_0_18px_rgba(6,182,212,0.3)] rounded-tl-none"
                    }`}
                  >
                    {/* Header line inside bubble */}
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span
                        className={`text-[11px] font-bold ${
                          isUser ? "text-pink-300" : "text-cyan-300"
                        }`}
                      >
                        {isUser ? "You" : "Maya"}
                      </span>
                    </div>

                    {/* Text content */}
                    <p className="whitespace-pre-wrap font-normal leading-relaxed text-[12.5px]">
                      {msg.text}
                    </p>

                    {/* Optional Inline Generated Image */}
                    {msg.imageUrl && (
                      <div className="mt-2.5 rounded-xl overflow-hidden border border-white/15 shadow-md">
                        <img
                          src={msg.imageUrl}
                          alt="Generated"
                          className="w-full h-44 object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() => window.open(msg.imageUrl, "_blank")}
                        />
                      </div>
                    )}

                    {/* Optional Action Chip */}
                    {msg.action && (
                      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[11px] text-cyan-300 flex items-center gap-1 font-medium">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>{msg.action.label}</span>
                        </span>
                        {msg.action.url && (
                          <a
                            href={msg.action.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-300 hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Footer Timestamp & Checkmarks */}
                    <div
                      className={`flex items-center gap-1 text-[10px] mt-1.5 opacity-60 justify-end ${
                        isUser ? "text-pink-200" : "text-cyan-200"
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {isUser && <CheckCheck className="w-3 h-3 text-cyan-400" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* ACTIVE PHONE ACTION BANNER */}
        {activeAction && (
          <div className="p-3 rounded-2xl bg-cyan-950/80 border border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Executing Phone Action</span>
                </div>
                <div className="text-[11px] text-cyan-200">
                  {activeAction.description || activeAction.type}
                </div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Active
            </span>
          </div>
        )}

        {/* SENSITIVE ACTION CONFIRMATION MODAL CARD */}
        {pendingConfirmation && (
          <div className="p-4 rounded-3xl bg-amber-950/90 border border-amber-500/50 shadow-xl space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-300">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Permission Confirmation Required
              </h4>
            </div>
            <p className="text-xs text-amber-100 leading-relaxed">
              {pendingConfirmation.message ||
                "Maya needs your confirmation before executing this sensitive phone action."}
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={onCancelAction}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-slate-300 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                onClick={onConfirmAction}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black flex items-center gap-1 shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Run</span>
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* BOTTOM INPUT BAR */}
      <footer className="relative z-20 px-4 pt-2 pb-24 border-t border-white/[0.08] backdrop-blur-xl bg-[#060a17]/90">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#0d172e]/90 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] focus-within:border-cyan-400 transition-all"
        >
          {/* Attachment Paperclip */}
          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type in Hindi, Hinglish, or English..."
            className="flex-1 bg-transparent border-none text-xs text-white placeholder:text-slate-400 focus:outline-none px-1"
          />

          {/* Send or Voice Button */}
          {inputText.trim() ? (
            <button
              type="submit"
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-transform"
            >
              <Send className="w-3.5 h-3.5 -ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartCall}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-pink-500/30 hover:scale-105 active:scale-95 transition-transform"
              title="Voice Input"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </footer>
    </div>
  );
};
