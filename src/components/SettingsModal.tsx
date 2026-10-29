import React, { useState } from "react";
import { AppSettings, UserProfile } from "../types";
import {
  X,
  Volume2,
  Mic,
  Heart,
  Sliders,
  Sparkles,
  Shield,
  Smartphone,
  Check,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { audioPlayer } from "../utils/audioPlayer";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  profile: UserProfile;
  onUpdateProfile: (newProfile: Partial<UserProfile>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  profile,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<"voice" | "behavior" | "persona">("voice");
  const availableVoices = audioPlayer.getAvailableVoices();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#12131f] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Maya Preferences</h2>
              <p className="text-xs text-slate-400">Customize voice, behavior & companion vibe</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-white/[0.01] px-5 pt-2 gap-4">
          <button
            onClick={() => setActiveTab("voice")}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "voice"
                ? "border-rose-400 text-rose-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voice & Audio</span>
          </button>
          <button
            onClick={() => setActiveTab("behavior")}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "behavior"
                ? "border-rose-400 text-rose-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Listening Mode</span>
          </button>
          <button
            onClick={() => setActiveTab("persona")}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "persona"
                ? "border-rose-400 text-rose-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Persona & You</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: Voice & Audio */}
          {activeTab === "voice" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Voice Generation Engine
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => onUpdateSettings({ voiceEngine: "geminiLive" })}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      settings.voiceEngine === "geminiLive"
                        ? "bg-rose-500/20 border-rose-400 text-white shadow-md ring-1 ring-rose-400/50"
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-semibold text-rose-300">Gemini Live (Aoede)</span>
                      {settings.voiceEngine === "geminiLive" && (
                        <Check className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </div>
                    <span className="text-[11px] opacity-80 leading-tight">
                      Real Gemini WebSocket audio with Aoede neural female voice (Zero device TTS)
                    </span>
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ voiceEngine: "gemini" })}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      settings.voiceEngine === "gemini"
                        ? "bg-rose-500/20 border-rose-400 text-white shadow-md"
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-semibold text-rose-300">Gemini Kore</span>
                      {settings.voiceEngine === "gemini" && (
                        <Check className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </div>
                    <span className="text-[11px] opacity-75 leading-tight">
                      High-fidelity Kore female voice via Gemini neural TTS
                    </span>
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ voiceEngine: "browser" })}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      settings.voiceEngine === "browser"
                        ? "bg-rose-500/20 border-rose-400 text-white shadow-md"
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-semibold text-rose-300">Device Offline TTS</span>
                      {settings.voiceEngine === "browser" && (
                        <Check className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </div>
                    <span className="text-[11px] opacity-75 leading-tight">
                      Local device synthesizer for offline use
                    </span>
                  </button>
                </div>
              </div>

              {/* Browser voice selector if browser engine */}
              {settings.voiceEngine === "browser" && availableVoices.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Preferred Browser Voice
                  </label>
                  <select
                    value={settings.preferredVoiceName}
                    onChange={(e) => onUpdateSettings({ preferredVoiceName: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-400"
                  >
                    <option value="" className="bg-[#12131f]">
                      Automatic Best Female Voice
                    </option>
                    {availableVoices.map((v) => (
                      <option key={v.name} value={v.name} className="bg-[#12131f]">
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Pitch and Speed sliders */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Voice Speed: {settings.speechRate.toFixed(2)}x</span>
                    <span className="text-slate-500 text-[11px]">Normal: 1.0x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={settings.speechRate}
                    onChange={(e) => onUpdateSettings({ speechRate: parseFloat(e.target.value) })}
                    className="w-full accent-rose-400 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Voice Pitch: {settings.speechPitch.toFixed(2)}</span>
                    <span className="text-slate-500 text-[11px]">Warm & Sweet: 1.15</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.4"
                    step="0.05"
                    value={settings.speechPitch}
                    onChange={(e) => onUpdateSettings({ speechPitch: parseFloat(e.target.value) })}
                    className="w-full accent-rose-400 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Sound effects earcons */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <div>
                  <span className="text-xs font-medium text-slate-200 block">
                    Synthesized Chimes & Earcons
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Play gentle harp chimes when Maya awakens or sleeps
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEffects}
                  onChange={(e) => onUpdateSettings({ soundEffects: e.target.checked })}
                  className="w-4 h-4 accent-rose-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Listening & Behavior */}
          {activeTab === "behavior" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Listening Trigger Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onUpdateSettings({ listeningMode: "always" })}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      settings.listeningMode === "always"
                        ? "bg-rose-500/15 border-rose-400/60 text-white shadow-sm"
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-semibold text-rose-300">Continuous (Hands-free)</span>
                      {settings.listeningMode === "always" && (
                        <Check className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </div>
                    <span className="text-[11px] opacity-75 leading-tight">
                      Maya continuously listens to all natural speech without wake phrase
                    </span>
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ listeningMode: "wakeWord" })}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      settings.listeningMode === "wakeWord"
                        ? "bg-rose-500/15 border-rose-400/60 text-white shadow-sm"
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-semibold text-rose-300">Wake Word</span>
                      {settings.listeningMode === "wakeWord" && (
                        <Check className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </div>
                    <span className="text-[11px] opacity-75 leading-tight">
                      Speaks only when you say &ldquo;Hey Maya&rdquo; or &ldquo;Maya&rdquo;
                    </span>
                  </button>
                </div>
              </div>

              {/* Background mode toggle */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-medium text-slate-200">Background Keep-Alive</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.backgroundKeepAlive}
                    onChange={(e) => onUpdateSettings({ backgroundKeepAlive: e.target.checked })}
                    className="w-4 h-4 accent-rose-400 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Keeps the microphone and voice loop active when tab is minimized or screen is locked.
                </p>
              </div>

              {/* Theme Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Material 3 Theme Palette
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "dark", label: "Midnight", color: "bg-[#0b0c10]" },
                    { id: "amoled", label: "OLED Black", color: "bg-black" },
                    { id: "light", label: "Warm Glow", color: "bg-slate-100 text-slate-900" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onUpdateSettings({ theme: t.id as any })}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-center gap-1.5 font-medium transition-all ${
                        settings.theme === t.id
                          ? "border-rose-400 bg-rose-500/20 text-rose-200"
                          : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
                      }`}
                    >
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Persona & User */}
          {activeTab === "persona" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Your Name / Nickname
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex, sweetheart, darling"
                  value={profile.nickname || profile.name}
                  onChange={(e) => onUpdateProfile({ nickname: e.target.value, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Companion Personality Vibe
                </label>
                <select
                  value={profile.vibe}
                  onChange={(e) => onUpdateProfile({ vibe: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-400"
                >
                  <option value="Sweet, loving, warm, and comforting (GF companion style)" className="bg-[#12131f]">
                    💖 Sweet & Loving Companion (Warm, caring, gentle)
                  </option>
                  <option value="Playful, witty, charming with subtle teasing and laughs" className="bg-[#12131f]">
                    ✨ Playful & Witty (Bubbly, charming, teasing)
                  </option>
                  <option value="Thoughtful, deeply empathetic, calm, and grounded" className="bg-[#12131f]">
                    🌸 Calm & Empathetic (Deep listening, soothing)
                  </option>
                  <option value="Supportive cheerleader and motivational partner" className="bg-[#12131f]">
                    🔥 Motivating & Uplifting (Encouraging, inspiring)
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  How are you feeling right now?
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    "Relaxed & happy",
                    "A bit tired",
                    "Stressed / busy",
                    "Excited!",
                    "Lonely / quiet",
                    "Curious",
                  ].map((mood) => (
                    <button
                      key={mood}
                      onClick={() => onUpdateProfile({ mood })}
                      className={`p-2 rounded-xl text-[11px] border transition-all ${
                        profile.mood === mood
                          ? "bg-rose-500/20 border-rose-400/80 text-rose-200 font-semibold"
                          : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              {/* Memory facts */}
              {profile.memories && profile.memories.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-300">
                      Learned Facts About You
                    </span>
                    <button
                      onClick={() => onUpdateProfile({ memories: [] })}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Clear Memories
                    </button>
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {profile.memories.map((fact, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] p-1.5 px-2.5 rounded-lg bg-white/[0.03] border border-white/5 text-slate-300"
                      >
                        • {fact}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium text-xs shadow-md hover:opacity-95 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
