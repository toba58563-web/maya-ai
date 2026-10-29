import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AssistantState,
  AssistantEmotion,
  MessageItem,
  UserProfile,
  AppSettings,
  NavTab,
} from "./types";
import { geminiLive } from "./utils/geminiLiveClient";
import { soundEffects } from "./utils/soundEffects";
import { backgroundKeepAlive } from "./utils/backgroundKeepAlive";
import { HomeScreen } from "./components/HomeScreen";
import { ChatScreen } from "./components/ChatScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { VoiceCallOverlay } from "./components/VoiceCallOverlay";
import { BottomNavBar } from "./components/BottomNavBar";
import { ConversationHistoryDrawer } from "./components/ConversationHistoryDrawer";
import {
  MayaPhoneControlBridge,
  MayaPhoneAction,
} from "./utils/mayaPhoneControl";
import { processMayaCommand } from "./utils/geminiDirectApi";

const INITIAL_PROFILE: UserProfile = {
  name: "Boss",
  nickname: "Boss",
  mood: "Relaxed & happy",
  vibe: "Sweet, supportive, friendly, loving companion style",
  memories: ["Met Maya AI companion"],
};

const INITIAL_SETTINGS: AppSettings = {
  voiceEngine: "geminiLive",
  preferredVoiceName: "Aoede",
  speechRate: 1.0,
  speechPitch: 1.15,
  listeningMode: "always",
  backgroundKeepAlive: true,
  soundEffects: true,
  theme: "dark",
  hapticFeedback: true,
  customApiKey: "",
  selectedModel: "gemini-3.1-flash-live-preview",
  addressStyle: "Boss",
  greetingStyle: "Warm & Caring",
  autoListen: true,
  language: "Hindi, Hinglish, English",
};

const DEFAULT_SAMPLE_MESSAGES: MessageItem[] = [
  {
    id: "sample-1",
    role: "user",
    text: "Hi Maya",
    timestamp: "9:32 AM",
  },
  {
    id: "sample-2",
    role: "assistant",
    text: "Hello, Boss! 👏\nI'm Maya, your companion and Android phone controller.\nWhat would you like me to do today?",
    timestamp: "9:32 AM",
    emotion: "warm",
  },
  {
    id: "sample-3",
    role: "user",
    text: "Can you create a 4K image of a sunset beach?",
    timestamp: "9:33 AM",
  },
  {
    id: "sample-4",
    role: "assistant",
    text: "Sure! Here's a beautiful 4K image of a sunset beach for you, Boss. 🌅",
    timestamp: "9:33 AM",
    emotion: "excited",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "sample-5",
    role: "user",
    text: "Open YouTube and search for lofi music",
    timestamp: "9:34 AM",
  },
  {
    id: "sample-6",
    role: "assistant",
    text: "Opening YouTube now... I'll search for lofi music and play it for you. 🎵",
    timestamp: "9:34 AM",
    emotion: "playful",
    action: {
      type: "youtube",
      label: "Opening YouTube: Lo-Fi Hip Hop Radio",
      url: "https://www.youtube.com/results?search_query=lofi+hip+hop+radio",
    },
  },
];

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);

  // Phone action execution states
  const [activeAction, setActiveAction] = useState<MayaPhoneAction | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    action: MayaPhoneAction;
    message: string;
  } | null>(null);

  // Voice Assistant runtime state
  const [state, setState] = useState<AssistantState>("offline");
  const [emotion, setEmotion] = useState<AssistantEmotion>("warm");
  const [userSpeech, setUserSpeech] = useState<string>("");
  const [assistantSpeech, setAssistantSpeech] = useState<string>("");
  const [isInterim, setIsInterim] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Settings & Profile
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("maya_settings");
      const savedKey = localStorage.getItem("maya_api_key") || "";
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          customApiKey: savedKey || parsed.customApiKey || "",
        };
      }
      return { ...INITIAL_SETTINGS, customApiKey: savedKey };
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem("maya_profile");
      return saved ? { ...INITIAL_PROFILE, ...JSON.parse(saved) } : INITIAL_PROFILE;
    } catch {
      return INITIAL_PROFILE;
    }
  });

  const [messages, setMessages] = useState<MessageItem[]>(() => {
    try {
      const saved = localStorage.getItem("maya_messages");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.length > 0 ? parsed : DEFAULT_SAMPLE_MESSAGES;
      }
      return DEFAULT_SAMPLE_MESSAGES;
    } catch {
      return DEFAULT_SAMPLE_MESSAGES;
    }
  });

  // Keep state refs for async callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Initialize native keystore key if on Android
  useEffect(() => {
    if (MayaPhoneControlBridge.isNative()) {
      MayaPhoneControlBridge.getSecureKey().then((key) => {
        if (key && !settings.customApiKey) {
          setSettings((prev) => ({ ...prev, customApiKey: key }));
        }
      });
    }
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem("maya_settings", JSON.stringify(settings));
    if (settings.customApiKey) {
      localStorage.setItem("maya_api_key", settings.customApiKey);
      MayaPhoneControlBridge.saveSecureKey(settings.customApiKey);
    } else {
      localStorage.removeItem("maya_api_key");
    }
    backgroundKeepAlive.setEnabled(settings.backgroundKeepAlive);
  }, [settings]);

  // Persist profile
  useEffect(() => {
    localStorage.setItem("maya_profile", JSON.stringify(profile));
  }, [profile]);

  // Persist messages
  useEffect(() => {
    localStorage.setItem("maya_messages", JSON.stringify(messages));
  }, [messages]);

  // Setup Gemini Live WebSocket callbacks
  useEffect(() => {
    geminiLive.setCallbacks({
      onStatusChange: (newStatus) => {
        if (newStatus === "speaking") {
          setState("speaking");
          MayaPhoneControlBridge.updateOrbVisual("SPEAKING");
        } else if (newStatus === "listening") {
          setState("listening");
          MayaPhoneControlBridge.updateOrbVisual("LISTENING");
        } else if (newStatus === "connecting") {
          setState("thinking");
          MayaPhoneControlBridge.updateOrbVisual("THINKING");
        } else if (newStatus === "disconnected") {
          setState("offline");
          MayaPhoneControlBridge.updateOrbVisual("IDLE");
        }
      },
      onTranscript: (textChunk) => {
        setAssistantSpeech((prev) => {
          const updated = (prev ? prev + " " + textChunk : textChunk).trim();
          return updated;
        });
      },
      onInterrupted: () => {
        setState("listening");
        MayaPhoneControlBridge.updateOrbVisual("LISTENING");
        if (settingsRef.current.hapticFeedback && "vibrate" in navigator) {
          try {
            navigator.vibrate([15, 30, 15]);
          } catch {}
        }
      },
      onTurnComplete: () => {
        setAssistantSpeech((finalText) => {
          if (finalText.trim()) {
            const assistantMsg: MessageItem = {
              id: "ast-" + Date.now(),
              role: "assistant",
              text: finalText.trim(),
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              emotion: "warm",
            };
            setMessages((prev) => [...prev, assistantMsg]);
          }
          return "";
        });
      },
      onError: (err) => {
        console.warn("Maya Live error:", err);
        MayaPhoneControlBridge.updateOrbVisual("ERROR");
      },
    });
  }, []);

  /**
   * Execute structured phone action on Android
   */
  const executeSingleAction = async (action: MayaPhoneAction) => {
    setActiveAction(action);
    await MayaPhoneControlBridge.updateOrbVisual("EXECUTING");

    try {
      switch (action.type) {
        case "launchApp":
          if (action.packageName) {
            await MayaPhoneControlBridge.launchApp(action.packageName);
          }
          break;
        case "tap":
          if (action.target) {
            await MayaPhoneControlBridge.tap(action.target);
          }
          break;
        case "scroll":
          await MayaPhoneControlBridge.scroll(action.direction || "down");
          break;
        case "typeText":
          if (action.text) {
            await MayaPhoneControlBridge.typeText(action.text, action.target);
          }
          break;
        case "readScreen":
          const content = await MayaPhoneControlBridge.readScreen();
          console.log("Screen content read:", content);
          break;
      }
    } catch (e) {
      console.error("Action execution error:", e);
    } finally {
      setTimeout(() => {
        setActiveAction(null);
        MayaPhoneControlBridge.updateOrbVisual("IDLE");
      }, 1200);
    }
  };

  /**
   * Start Live Voice Call with Maya (Aoede Voice)
   */
  const handleStartCall = useCallback(async () => {
    // Strictly require API key configured in Settings
    if (!settingsRef.current.customApiKey?.trim()) {
      setShowApiKeyModal(true);
      return;
    }

    try {
      if (settingsRef.current.soundEffects) {
        soundEffects.playWakeUp();
      }
      setIsVoiceCallOpen(true);
      setState("thinking");
      setAssistantSpeech("Connecting to Maya AI Live (Aoede Voice)...");
      await MayaPhoneControlBridge.updateOrbVisual("THINKING");

      await geminiLive.connect(settingsRef.current.customApiKey);

      const greetingPrompt = `Say a short, cheerful 1-sentence greeting to ${
        profile.name || "Boss"
      } as Maya in your warm Aoede voice.`;
      geminiLive.sendTextMessage(greetingPrompt);
    } catch (err: any) {
      console.error("Failed to connect to Maya Live:", err);
      setState("offline");
      await MayaPhoneControlBridge.updateOrbVisual("ERROR");
      alert(
        "Microphone access or valid Gemini API key is needed for live call. Please check your settings."
      );
    }
  }, [profile.name]);

  /**
   * End Live Call
   */
  const handleEndCall = useCallback(() => {
    if (settingsRef.current.soundEffects) {
      soundEffects.playSleep();
    }
    geminiLive.disconnect();
    setIsVoiceCallOpen(false);
    setState("offline");
    setUserSpeech("");
    setAssistantSpeech("");
    setIsInterim(false);
    MayaPhoneControlBridge.updateOrbVisual("IDLE");
  }, []);

  /**
   * Handle User Interrupt during speech
   */
  const handleUserInterrupt = useCallback(() => {
    geminiLive.stopPlayback();
    setState("listening");
    MayaPhoneControlBridge.updateOrbVisual("LISTENING");
    if (settingsRef.current.hapticFeedback && "vibrate" in navigator) {
      try {
        navigator.vibrate([15, 30, 15]);
      } catch {}
    }
  }, []);

  /**
   * Send message in Chat screen & process phone commands
   */
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMsg: MessageItem = {
        id: "usr-" + Date.now(),
        role: "user",
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMsg]);

      // Strictly require user's API key from Settings
      if (!settingsRef.current.customApiKey?.trim()) {
        const errorMsg: MessageItem = {
          id: "ast-" + Date.now(),
          role: "assistant",
          text: "Boss, please enter your personal Gemini API key in Settings first. Once entered, Maya will be fully active!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          emotion: "comforting",
        };
        setMessages((prev) => [...prev, errorMsg]);
        setState("listening");
        setShowApiKeyModal(true);
        return;
      }

      setState("thinking");
      await MayaPhoneControlBridge.updateOrbVisual("THINKING");

      try {
        // Process command in Hindi/Hinglish/English
        const plan = await processMayaCommand(
          text,
          settingsRef.current.customApiKey,
          profile.name || "Boss"
        );

        const newEmotion: AssistantEmotion = plan.emotion || "warm";
        setEmotion(newEmotion);

        const assistantMsg: MessageItem = {
          id: "ast-" + Date.now(),
          role: "assistant",
          text: plan.speechReply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          emotion: newEmotion,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setState("listening");

        // Handle structured phone actions
        if (plan.actions && plan.actions.length > 0) {
          const firstAction = plan.actions[0];

          if (firstAction.isSensitive) {
            setPendingConfirmation({
              action: firstAction,
              message:
                plan.confirmationMessage ||
                `Maya needs your confirmation to proceed with: ${firstAction.description || firstAction.type}`,
            });
          } else {
            for (const act of plan.actions) {
              await executeSingleAction(act);
            }
          }
        }
      } catch (err: any) {
        console.error("Chat command error:", err);
        const errorMsg: MessageItem = {
          id: "ast-" + Date.now(),
          role: "assistant",
          text: "I'm right here with you, Boss! If you haven't yet, please verify your Gemini API key in Settings.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          emotion: "comforting",
        };
        setMessages((prev) => [...prev, errorMsg]);
        setState("listening");
      }
    },
    [profile.name]
  );

  const handleConfirmAction = async () => {
    if (pendingConfirmation) {
      const act = pendingConfirmation.action;
      setPendingConfirmation(null);
      await executeSingleAction(act);
    }
  };

  const handleCancelAction = () => {
    setPendingConfirmation(null);
    MayaPhoneControlBridge.stop();
  };

  const handleQuickAction = (prompt: string) => {
    setActiveTab("chat");
    handleSendMessage(prompt);
  };

  return (
    <div className="min-h-screen w-full bg-[#050814] text-slate-100 flex flex-col justify-between relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] select-none">
      {/* Background ambient neon lighting */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* SCREEN CONTAINER */}
      <div className="relative z-10 flex-1 flex flex-col w-full h-full">
        {activeTab === "home" && (
          <HomeScreen
            settings={settings}
            profile={profile}
            onStartMaya={handleStartCall}
            onOpenApiKeyModal={() => setShowApiKeyModal(true)}
            onQuickAction={handleQuickAction}
            onOpenSettings={() => setActiveTab("settings")}
          />
        )}

        {activeTab === "chat" && (
          <ChatScreen
            messages={messages}
            onSendMessage={handleSendMessage}
            onBack={() => setActiveTab("home")}
            onStartCall={handleStartCall}
            state={state}
            activeAction={activeAction}
            pendingConfirmation={pendingConfirmation}
            onConfirmAction={handleConfirmAction}
            onCancelAction={handleCancelAction}
          />
        )}

        {activeTab === "settings" && (
          <SettingsScreen
            settings={settings}
            profile={profile}
            onUpdateSettings={(newSettings) =>
              setSettings((prev) => ({ ...prev, ...newSettings }))
            }
            onUpdateProfile={(newProfile) =>
              setProfile((prev) => ({ ...prev, ...newProfile }))
            }
            onOpenApiKeyModal={() => setShowApiKeyModal(true)}
            onBack={() => setActiveTab("home")}
          />
        )}

        {activeTab === "history" && (
          <div className="flex-1 flex flex-col p-5 max-w-md mx-auto w-full">
            <h2 className="text-xl font-bold text-white mb-2">Conversation History</h2>
            <p className="text-xs text-slate-400 mb-4">Past conversations with Maya</p>
            <div className="flex-1 overflow-y-auto space-y-3 pb-24">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-2xl bg-[#0c1324] border border-white/10 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                    <span className={m.role === "user" ? "text-pink-400" : "text-cyan-400"}>
                      {m.role === "user" ? "You" : "Maya"}
                    </span>
                    <span className="text-slate-500">{m.timestamp}</span>
                  </div>
                  <p className="text-slate-300">{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAVIGATION BAR */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onHeartClick={handleStartCall}
        isCalling={isVoiceCallOpen}
      />

      {/* FULL-SCREEN LIVE VOICE CALL OVERLAY */}
      <VoiceCallOverlay
        isOpen={isVoiceCallOpen}
        onClose={() => setIsVoiceCallOpen(false)}
        state={state}
        emotion={emotion}
        analyser={geminiLive.getAnalyser()}
        userSpeech={userSpeech}
        assistantSpeech={assistantSpeech}
        isInterim={isInterim}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted((prev) => !prev)}
        onInterrupt={handleUserInterrupt}
        onEndCall={handleEndCall}
        onOrbClick={handleUserInterrupt}
      />

      {/* CUSTOM GEMINI API KEY MODAL */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        apiKey={settings.customApiKey}
        onSaveKey={(key) => {
          setSettings((prev) => ({ ...prev, customApiKey: key }));
          MayaPhoneControlBridge.saveSecureKey(key);
        }}
        onClearKey={() => {
          setSettings((prev) => ({ ...prev, customApiKey: "" }));
          MayaPhoneControlBridge.clearApiKey();
        }}
      />

      {/* Conversation History Drawer Modal */}
      <ConversationHistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        messages={messages}
        onClearHistory={() => setMessages([])}
        preferredVoice="Aoede"
      />
    </div>
  );
}
