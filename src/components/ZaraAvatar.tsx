import React from "react";

interface ZaraAvatarProps {
  size?: "sm" | "md" | "lg" | "xl";
  isOnline?: boolean;
  className?: string;
}

export const ZaraAvatar: React.FC<ZaraAvatarProps> = ({
  size = "md",
  isOnline = true,
  className = "",
}) => {
  const sizeMap = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-16 h-16 text-xl",
    xl: "w-24 h-24 text-3xl",
  };

  const indicatorSize = {
    sm: "w-2.5 h-2.5 -bottom-0.5 -right-0.5",
    md: "w-3 h-3 bottom-0 right-0",
    lg: "w-4 h-4 bottom-0.5 right-0.5",
    xl: "w-5 h-5 bottom-1 right-1",
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* Outer Neon Glow Ring */}
      <div
        className={`${sizeMap[size]} rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 via-pink-500 to-purple-600 shadow-[0_0_15px_rgba(6,182,212,0.4)]`}
      >
        {/* Inner Cyber Avatar Face */}
        <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-b from-[#0b1730] to-[#040814] flex items-center justify-center relative">
          {/* Subtle cybernetic pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/30 via-purple-500/10 to-transparent" />
          
          {/* Stylish Avatar Illustration */}
          <svg viewBox="0 0 100 100" className="w-full h-full object-cover">
            <defs>
              <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e1b4b" />
                <stop offset="50%" stopColor="#2e1065" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>

            {/* Back Hair */}
            <path d="M 20,45 C 15,65 25,95 30,100 L 70,100 C 75,95 85,65 80,45 C 75,20 25,20 20,45 Z" fill="url(#hairGrad)" />

            {/* Head & Neck */}
            <path d="M 42,70 L 42,88 L 58,88 L 58,70 Z" fill="#fed7aa" opacity="0.9" />
            <ellipse cx="50" cy="52" rx="22" ry="25" fill="#fef3c7" />

            {/* Face details */}
            {/* Blushing cheeks */}
            <circle cx="36" cy="58" r="4.5" fill="#f43f5e" opacity="0.3" filter="blur(1px)" />
            <circle cx="64" cy="58" r="4.5" fill="#f43f5e" opacity="0.3" filter="blur(1px)" />

            {/* Eyes */}
            <ellipse cx="38" cy="50" rx="3.5" ry="4.5" fill="#0f172a" />
            <ellipse cx="62" cy="50" rx="3.5" ry="4.5" fill="#0f172a" />
            {/* Eye glints */}
            <circle cx="37" cy="48" r="1.5" fill="#06b6d4" />
            <circle cx="61" cy="48" r="1.5" fill="#06b6d4" />
            <circle cx="39" cy="51" r="0.8" fill="#ffffff" />
            <circle cx="63" cy="51" r="0.8" fill="#ffffff" />

            {/* Sweet smile */}
            <path d="M 45,62 Q 50,66 55,62" stroke="#e11d48" strokeWidth="1.6" fill="none" strokeLinecap="round" />

            {/* Stylish Front Hair Bangs */}
            <path
              d="M 26,45 C 28,30 40,24 50,24 C 60,24 72,30 74,45 C 70,38 60,34 50,34 C 40,34 30,38 26,45 Z"
              fill="url(#hairGrad)"
            />
            {/* Cyber Neon Hair Highlight */}
            <path
              d="M 28,42 C 32,32 42,28 48,28"
              stroke="url(#neonGlow)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Online indicator */}
      {isOnline && (
        <span
          className={`absolute ${indicatorSize[size]} bg-emerald-400 border-2 border-[#060913] rounded-full shadow-[0_0_8px_#34d399]`}
        />
      )}
    </div>
  );
};
