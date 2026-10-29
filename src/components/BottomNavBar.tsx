import React from "react";
import { NavTab } from "../types";
import { Home, MessageSquare, History, Settings, Heart } from "lucide-react";

interface BottomNavBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onHeartClick: () => void;
  isCalling?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  onHeartClick,
  isCalling = false,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-4 pb-3 pt-1 pointer-events-auto">
      {/* Curved glass container */}
      <div className="relative w-full h-[68px] rounded-[32px] bg-[#090f1f]/95 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center justify-between px-3">
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

        {/* CENTER FLOATING HEART BUTTON */}
        <div className="relative -top-5 flex flex-col items-center justify-center px-1">
          <button
            onClick={onHeartClick}
            className={`w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-fuchsia-600 flex items-center justify-center text-white shadow-[0_0_25px_rgba(244,63,94,0.7)] border-2 border-white/30 hover:scale-110 active:scale-95 transition-all group ${
              isCalling ? "animate-pulse ring-4 ring-pink-500/40" : ""
            }`}
            title="Start Zara Live Voice"
          >
            <Heart className="w-7 h-7 fill-white text-white drop-shadow group-hover:scale-110 transition-transform" />
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
