import React from "react";
import { NavTab, AssistantState } from "../types";
import { Home, MessageSquare, History, Settings, Square, Play, Mic } from "lucide-react";

interface BottomNavBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onToggleStartStop: () => void;
  state: AssistantState;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  onToggleStartStop,
  state,
}) => {
  const isRunning = state !== "offline";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-4 pb-3 pt-1 pointer-events-auto select-none">
      {/* Curved glass container */}
      <div className="relative w-full h-[70px] rounded-[32px] bg-[#090f1f]/95 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center justify-between px-3">
        {/* TAB 1: Home */}
        <button
          onClick={() => onSelectTab("home")}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === "home"
              ? "text-blue-400 font-semibold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === "home" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          <span className="text-[11px] mt-1 tracking-tight">Home</span>
        </button>

        {/* TAB 2: Chat */}
        <button
          onClick={() => onSelectTab("chat")}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === "chat"
              ? "text-cyan-400 font-semibold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare
            className={`w-5 h-5 ${activeTab === "chat" ? "stroke-[2.5]" : "stroke-[1.8]"}`}
          />
          <span className="text-[11px] mt-1 tracking-tight">Chat</span>
        </button>

        {/* CENTER FLOATING START / STOP MAYA BUTTON (USER MARKED IN SCREENSHOT) */}
        <div className="relative -top-5 flex flex-col items-center justify-center px-1">
          <button
            onClick={onToggleStartStop}
            className={`relative w-16 h-16 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition-all duration-300 group active:scale-95 ${
              isRunning
                ? "bg-gradient-to-tr from-rose-600 via-red-600 to-pink-600 shadow-[0_0_30px_rgba(225,29,72,0.85)] ring-4 ring-rose-500/40 animate-pulse"
                : "bg-gradient-to-tr from-pink-500 via-rose-500 to-fuchsia-600 shadow-[0_0_25px_rgba(244,63,94,0.7)] hover:scale-105 ring-2 ring-white/30"
            }`}
            title={isRunning ? "Stop Maya" : "Start Maya"}
          >
            {/* Chromatic Rotating Border */}
            <div
              className={`absolute -inset-1 rounded-full p-[2px] opacity-80 ${
                isRunning ? "animate-spin [animation-duration:4s]" : "animate-spin [animation-duration:8s]"
              }`}
              style={{
                background: isRunning
                  ? "conic-gradient(from 0deg, #f43f5e, #fb7185, #ef4444, #f43f5e)"
                  : "conic-gradient(from 0deg, #06b6d4, #a855f7, #ec4899, #06b6d4)",
              }}
            >
              <div className="w-full h-full rounded-full bg-transparent" />
            </div>

            {/* Inner Icon & Label */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              {isRunning ? (
                <>
                  <Square className="w-6 h-6 fill-white text-white drop-shadow" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-rose-100 mt-0.5 leading-none">
                    STOP
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 fill-white text-white ml-0.5 drop-shadow" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-white mt-0.5 leading-none">
                    START
                  </span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* TAB 3: History */}
        <button
          onClick={() => onSelectTab("history")}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === "history"
              ? "text-purple-400 font-semibold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <History
            className={`w-5 h-5 ${activeTab === "history" ? "stroke-[2.5]" : "stroke-[1.8]"}`}
          />
          <span className="text-[11px] mt-1 tracking-tight">History</span>
        </button>

        {/* TAB 4: Settings */}
        <button
          onClick={() => onSelectTab("settings")}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === "settings"
              ? "text-blue-400 font-semibold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Settings
            className={`w-5 h-5 ${activeTab === "settings" ? "stroke-[2.5]" : "stroke-[1.8]"}`}
          />
          <span className="text-[11px] mt-1 tracking-tight">Settings</span>
        </button>
      </div>
    </div>
  );
};
