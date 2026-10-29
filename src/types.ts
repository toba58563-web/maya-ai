export type AssistantState = "offline" | "listening" | "thinking" | "speaking";

export type AssistantEmotion =
  | "warm"
  | "laugh"
  | "playful"
  | "comforting"
  | "excited"
  | "thoughtful";

export interface MessageItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  emotion?: AssistantEmotion;
  audioBase64?: string;
  imageUrl?: string;
  action?: {
    type: string;
    label: string;
    url?: string;
  };
}

export interface UserProfile {
  name: string;
  nickname: string;
  mood: string;
  vibe: string;
  memories: string[];
}

export interface AppSettings {
  voiceEngine: "geminiLive" | "gemini" | "browser";
  preferredVoiceName: string;
  speechRate: number;
  speechPitch: number;
  listeningMode: "always" | "wakeWord";
  backgroundKeepAlive: boolean;
  soundEffects: boolean;
  theme: "dark" | "amoled" | "light";
  hapticFeedback: boolean;
  customApiKey: string;
  selectedModel: string;
  addressStyle: string; // e.g. "Boss"
  greetingStyle: string;
  autoListen: boolean;
  language: string;
}

export type NavTab = "home" | "chat" | "history" | "settings";
