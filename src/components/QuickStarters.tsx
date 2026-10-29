import React from "react";
import { Sparkles, Smile, Coffee, Heart, Lightbulb, Compass } from "lucide-react";

interface QuickStartersProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

export const QuickStarters: React.FC<QuickStartersProps> = ({
  onSelectPrompt,
  disabled = false,
}) => {
  const suggestions = [
    { text: "Hey Maya, how are you today?", icon: Heart },
    { text: "I had kind of a rough day...", icon: Coffee },
    { text: "Make me smile or laugh!", icon: Smile },
    { text: "Tell me a cozy story", icon: Sparkles },
    { text: "Give me some sweet motivation", icon: Lightbulb },
    { text: "What's on your mind right now?", icon: Compass },
  ];

  return (
    <div className="w-full max-w-xl mx-auto px-4 mt-2">
      <div className="flex items-center gap-1.5 overflow-x-auto py-2 no-scrollbar scroll-smooth">
        {suggestions.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => onSelectPrompt(item.text)}
              disabled={disabled}
              className="shrink-0 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] active:bg-rose-500/20 border border-white/10 hover:border-rose-400/40 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:pointer-events-none"
            >
              <Icon className="w-3.5 h-3.5 text-rose-300" />
              <span>{item.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
