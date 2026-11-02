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
import { speechService } from "./utils/speechRecognition";
import { audioPlayer } from "./utils/audioPlayer";
import { soundEffects } from "./utils/soundEffects";
import { backgroundKeepAlive } from "./utils/backgroundKeepAlive";
import { SplashScreen } from "./components/SplashScreen";
import { HomeScreen } from "./components/HomeScreen";
import { ChatScreen } from "./components/ChatScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { PermissionsManager } from "./components/PermissionsManager";
import { MandatoryPermissionFlow } from "./components/MandatoryPermissionFlow";
import { BottomNavBar } from "./components/BottomNavBar";
import { ConversationHistoryDrawer } from "./components/ConversationHistoryDrawer";
import {
  MayaPhoneControlBridge,
  MayaPhoneAction,
} from "./utils/mayaPhoneControl";
import { processMayaCommand } from "./utils/geminiDirectApi";
import { ApiKeyManager } from "./utils/apiKeyManager";

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
  selectedModel: "gemini-3.8-flash",
  personality: "Girlfriend Mode",
  wakeWordEnabled: false,
  userName: "Boss",
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
  // Navigation & Screen Modals
  const [showSplash, setShowSplash] = useState(true);
  const [showMandatoryFlow, setShowMandatoryFlow] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

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

  // State refs for async callbacks
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
        } else if (newStatus === "listening" || newStatus === "ready") {
          setState("listening");
          MayaPhoneControlBridge.updateOrbVisual("LISTENING");
        } else if (newStatus === "connecting" || newStatus === "waiting_setup" || newStatus === "thinking" || newStatus === "reconnecting") {
          setState("thinking");
          MayaPhoneControlBridge.updateOrbVisual("THINKING");
        } else if (newStatus === "disconnected" || newStatus === "error") {
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
        geminiLive.stopPlayback();
        setState("offline");
        MayaPhoneControlBridge.updateOrbVisual("ERROR");
        const errMsg = typeof err === "string" ? err : err?.message || "Gemini Live encountered an error.";
        setAssistantSpeech(`Connection error: ${errMsg}. Tap Start to retry.`);
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
        case "playYouTube":
          await MayaPhoneControlBridge.playYouTube(action.query || "trending music");
          break;
        case "autoSkipAd":
          await MayaPhoneControlBridge.autoSkipAd();
          break;
        case "call":
          if (action.number || action.target) {
            await MayaPhoneControlBridge.makePhoneCall(action.number || action.target || "");
          }
          break;
        case "sms":
          await MayaPhoneControlBridge.sendSms(
            action.number || action.target || "",
            action.message || action.text || "Hello from Maya AI"
          );
          break;
        case "email":
          await MayaPhoneControlBridge.sendEmail(
            action.to || "",
            action.subject || "Regarding Maya AI",
            action.body || action.text || ""
          );
          break;
        case "readNotifications":
          const notifs = await MayaPhoneControlBridge.getRecentNotifications();
          const isGfMode = settingsRef.current.personality === "Girlfriend Mode";
          if (notifs && notifs.length > 0) {
            const summary = notifs
              .slice(0, 3)
              .map((n) => `${n.appName}: ${n.title} - ${n.text}`)
              .join(". ");
            const speech = isGfMode
              ? `Aapke naye notifications aaye hain jaan: ${summary}`
              : `Boss, here are your latest notifications: ${summary}`;
            setAssistantSpeech(speech);
            if (geminiLive.getIsConnected()) {
              geminiLive.sendTextMessage(
                isGfMode
                  ? `Read these notifications lovingly without calling user Boss: ${summary}`
                  : `Tell Boss about these notifications: ${summary}`
              );
            }
          } else {
            const speech = isGfMode
              ? `Abhi koi naya notification nahi hai jaan, sab clear hai!`
              : `No unread notifications right now, Boss! Everything is quiet.`;
            setAssistantSpeech(speech);
            if (geminiLive.getIsConnected()) {
              geminiLive.sendTextMessage(
                isGfMode
                  ? "Tell user lovingly that there are no unread notifications without saying Boss."
                  : "Tell Boss cheerfully that they have no unread notifications."
              );
            }
          }
          break;
        case "launchApp": {
          const appTarget = action.packageName || action.appName || action.target || "";
          if (appTarget) {
            const launched = await MayaPhoneControlBridge.launchApp(appTarget);
            if (!launched) {
              const isGf = settingsRef.current.personality === "Girlfriend Mode";
              const failureMsg = isGf
                ? `Jaan, "${appTarget}" aapke phone me installed nahi mila.`
                : `Boss, "${appTarget}" is not installed on this device.`;
              setAssistantSpeech(failureMsg);
            }
          }
          break;
        }
        case "mediaControl": {
          const cmd = action.mediaCommand || action.target || "playPause";
          await MayaPhoneControlBridge.controlMedia(cmd);
          break;
        }
        case "stop": {
          await MayaPhoneControlBridge.stop();
          break;
        }
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
        case "readScreen": {
          const details = await MayaPhoneControlBridge.getScreenDetails();
          const isGf = settingsRef.current.personality === "Girlfriend Mode";
          if (details && details.elements && details.elements.length > 0) {
            const topItems = details.elements.slice(0, 4).join(", ");
            const summary = `Current app: ${details.packageName || "Unknown"}. Visible elements: ${topItems}`;
            const speech = isGf
              ? `Main dekh rahi hoon jaan, screen par yeh dikh raha hai: ${topItems}`
              : `Boss, on your screen: ${summary}`;
            setAssistantSpeech(speech);
            if (geminiLive.getIsConnected()) {
              geminiLive.sendTextMessage(
                isGf
                  ? `Explain what is on the phone screen lovingly without saying Boss: ${summary}`
                  : `Report screen contents to Boss: ${summary}`
              );
            }
          } else {
            const speech = isGf
              ? `Screen par abhi koi text ya button nahi dikh raha hai jaan.`
              : `No interactable elements found on the current screen, Boss.`;
            setAssistantSpeech(speech);
          }
          break;
        }
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

      setState("thinking");
      await MayaPhoneControlBridge.updateOrbVisual("THINKING");

      try {
        // Query server-side Gemini 3.8 Flash for conversational intelligence and image/action suggestions
        let chatData: any = null;
        try {
          const chatRes = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(settingsRef.current.customApiKey
                ? { "x-gemini-api-key": settingsRef.current.customApiKey }
                : {}),
            },
            body: JSON.stringify({
              message: text,
              history: messagesRef.current.slice(-6).map((m) => ({ role: m.role, text: m.text })),
              userProfile: profile,
              personality: settingsRef.current.personality || "Girlfriend Mode",
              apiKey: settingsRef.current.customApiKey || undefined,
            }),
          });
          if (chatRes.ok) {
            chatData = await chatRes.json();
          }
        } catch (chatErr) {
          console.warn("Server chat fetch error:", chatErr);
        }

        const isGf = settingsRef.current.personality === "Girlfriend Mode";
        const userTitle = isGf
          ? (profile.name && profile.name !== "Boss" ? profile.name : "Jaan")
          : (profile.name || "Boss");

        // Process structured phone commands via server-side /api/maya-command
        const plan = await processMayaCommand(
          text,
          settingsRef.current.customApiKey,
          userTitle
        );

        const replyText =
          plan.actions && plan.actions.length > 0
            ? plan.speechReply
            : chatData?.text || plan.speechReply;
        const newEmotion: AssistantEmotion = chatData?.emotion || plan.emotion || "warm";
        setEmotion(newEmotion);

        const assistantMsg: MessageItem = {
          id: "ast-" + Date.now(),
          role: "assistant",
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          emotion: newEmotion,
          imageUrl: chatData?.imageUrl || undefined,
          action: chatData?.action || undefined,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setAssistantSpeech(replyText);

        // Audio is handled by real Gemini WebSocket
        if (geminiLive.getIsConnected()) {
          geminiLive.sendTextMessage(text);
        } else {
          setState("listening");
          await MayaPhoneControlBridge.updateOrbVisual("LISTENING");
        }

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
          text: "I'm right here with you, Boss! Always ready to help you.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          emotion: "comforting",
        };
        setMessages((prev) => [...prev, errorMsg]);
        setState("listening");
      }
    },
    [profile.name]
  );

  // Setup Continuous Speech Recognition for Standalone APK voice calls
  useEffect(() => {
    speechService.setCallbacks({
      onInterimResult: (interim) => {
        setUserSpeech(interim);
        setIsInterim(true);
      },
      onFinalResult: (finalText) => {
        setUserSpeech(finalText);
        setIsInterim(false);
        handleSendMessage(finalText);
      },
      onSpeechStart: () => {
        audioPlayer.stop();
        setState("listening");
        MayaPhoneControlBridge.updateOrbVisual("LISTENING");
      },
      onSpeechEnd: () => {
        setState("thinking");
        MayaPhoneControlBridge.updateOrbVisual("THINKING");
      },
      onError: (err) => {
        console.warn("Speech recognition event:", err);
      },
    });
  }, [handleSendMessage]);

  /**
   * START / STOP MAYA TOGGLE (DIRECTLY ON HOME SCREEN - NO FULLSCREEN CALL POPUP!)
   * Triggered by:
   * 1. The marked center button in BottomNavBar ("START" / "STOP")
   * 2. Tapping the RGB Visualizer Orb on the Home Screen
   */
  const handleToggleMaya = useCallback(async () => {
    const isRunning = stateRef.current !== "offline";

    // IF ALREADY RUNNING -> STOP MAYA
    if (isRunning) {
      if (settingsRef.current.soundEffects) {
        soundEffects.playSleep();
      }
      speechService.stopListening();
      audioPlayer.stop();
      geminiLive.disconnect();
      if (MayaPhoneControlBridge.isNative()) {
        await MayaPhoneControlBridge.stop();
        await MayaPhoneControlBridge.stopForegroundService();
      }
      setState("offline");
      setUserSpeech("");
      setAssistantSpeech("");
      setIsInterim(false);
      await MayaPhoneControlBridge.updateOrbVisual("IDLE");
      return;
    }

    // IF NOT RUNNING -> START MAYA ON HOME SCREEN
    try {
      // 1. Verify API Key
      const keyStatus = ApiKeyManager.getCurrentStatus(settingsRef.current.customApiKey || "");
      if (keyStatus.status === "missing") {
        setActiveTab("home");
        setShowApiKeyModal(true);
        setAssistantSpeech("Please configure your Gemini API Key in Settings to start Maya.");
        return;
      }

      // 2. Verify Microphone Permission
      if (MayaPhoneControlBridge.isNative()) {
        const micGranted = await MayaPhoneControlBridge.requestSystemPermission("microphone");
        if (!micGranted) {
          setState("offline");
          setAssistantSpeech("Microphone permission is required to listen to your voice.");
          return;
        }

        // Start native Android Foreground Service for persistent background voice operation
        await MayaPhoneControlBridge.startForegroundService();
      }

      if (settingsRef.current.soundEffects) {
        soundEffects.playWakeUp();
      }

      // Ensure user is on Home screen
      setActiveTab("home");
      setState("thinking");
      setAssistantSpeech("Connecting to Maya AI...");
      await MayaPhoneControlBridge.updateOrbVisual("THINKING");

      // Connect to Gemini Live (Sole voice engine - NO speechService fallback)
      try {
        await geminiLive.connect(
          settingsRef.current.customApiKey || undefined,
          settingsRef.current.preferredVoiceName || "Aoede",
          settingsRef.current.personality || "Girlfriend Mode"
        );
        const isGf = settingsRef.current.personality === "Girlfriend Mode";
        const isProf = settingsRef.current.personality === "Professional Mode";
        const greetingPrompt = isGf
          ? `Say a short, sweet, deeply affectionate 1-sentence greeting to your user as their girlfriend Maya (do NOT say Boss, address as Jaan or speak naturally) in your warm ${
              settingsRef.current.preferredVoiceName || "Aoede"
            } voice.`
          : isProf
          ? `Say a short, confident, professional 1-sentence greeting to Boss as Maya in your ${
              settingsRef.current.preferredVoiceName || "Aoede"
            } voice.`
          : `Say a short, cheerful 1-sentence greeting to ${
              profile.name || "Boss"
            } as Maya.`;
        geminiLive.sendTextMessage(greetingPrompt);
      } catch (wsErr: any) {
        console.warn("Gemini Live connection failure:", wsErr);
        geminiLive.disconnect();
        if (MayaPhoneControlBridge.isNative()) {
          await MayaPhoneControlBridge.stopForegroundService();
        }
        setState("offline");
        await MayaPhoneControlBridge.updateOrbVisual("ERROR");
        const errMsg = wsErr?.message || "Connection failed. Please check internet connection and API Key.";
        setAssistantSpeech(`Gemini Live Disconnected: ${errMsg}`);
        return;
      }
    } catch (err: any) {
      console.error("Failed to start Maya:", err);
      setState("offline");
      await MayaPhoneControlBridge.updateOrbVisual("ERROR");
      setAssistantSpeech("Failed to start: " + (err.message || "Please check permissions and API key."));
    }
  }, [profile.name]);

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

  // Verify the 4 mandatory permissions (Microphone, Notifications, Accessibility, Overlay)
  const verifyMandatoryPermissions = useCallback(
    async (andStartMaya?: boolean) => {
      try {
        const map = await MayaPhoneControlBridge.checkAllPermissions();
        const allFour = Boolean(
          map.microphone && map.notifications && map.accessibility && map.overlay
        );
        if (!allFour) {
          setShowMandatoryFlow(true);
        } else {
          setShowMandatoryFlow(false);
          if (andStartMaya) {
            handleToggleMaya();
          }
        }
      } catch (e) {
        console.warn("verifyMandatoryPermissions error:", e);
      }
    },
    [handleToggleMaya]
  );

  // Re-check on focus/resume to detect if any permission was revoked
  useEffect(() => {
    const handleRecheck = () => {
      if (!showSplash) {
        verifyMandatoryPermissions();
      }
    };

    window.addEventListener("focus", handleRecheck);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !showSplash) {
        handleRecheck();
      }
    });

    return () => {
      window.removeEventListener("focus", handleRecheck);
    };
  }, [showSplash, verifyMandatoryPermissions]);

  const handleQuickAction = (prompt: string) => {
    setActiveTab("chat");
    handleSendMessage(prompt);
  };

  return (
    <div className="min-h-screen w-full bg-[#050814] text-slate-100 flex flex-col justify-between relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] select-none">
      {/* Background ambient neon lighting */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* 1. LUXURY CYBERPUNK SPLASH SCREEN ON LAUNCH */}
      {showSplash ? (
        <SplashScreen
          onDismiss={() => {
            setShowSplash(false);
            verifyMandatoryPermissions();
          }}
          onQuickStart={() => {
            setShowSplash(false);
            verifyMandatoryPermissions(true);
          }}
        />
      ) : showMandatoryFlow ? (
        /* 2, 3, 4, 5. MANDATORY PERMISSION FLOW (Microphone -> Notifications -> Accessibility -> Overlay) */
        <MandatoryPermissionFlow
          onComplete={() => {
            setShowMandatoryFlow(false);
          }}
        />
      ) : (
        /* 6. MAYA MAIN APPLICATION (Home, Chat, Settings, History) */
        <>
          {/* SCREEN CONTAINER */}
          <div className="relative z-10 flex-1 flex flex-col w-full h-full">
            {activeTab === "home" && (
              <HomeScreen
                settings={settings}
                profile={profile}
                state={state}
                emotion={emotion}
                analyser={geminiLive.getAnalyser() || audioPlayer.getAnalyser()}
                userSpeech={userSpeech}
                assistantSpeech={assistantSpeech}
                activeActionText={
                  activeAction ? activeAction.description || activeAction.type : undefined
                }
                onToggleStartMaya={handleToggleMaya}
                onOpenApiKeyModal={() => setShowApiKeyModal(true)}
                onOpenPermissionsModal={() => setShowPermissionsModal(true)}
                onQuickAction={handleQuickAction}
                onOpenSettings={() => setActiveTab("settings")}
              />
            )}

            {activeTab === "chat" && (
              <ChatScreen
                messages={messages}
                onSendMessage={handleSendMessage}
                onBack={() => setActiveTab("home")}
                onStartCall={handleToggleMaya}
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
                onUpdateSettings={(newSettings) => {
                  setSettings((prev) => {
                    const updated = { ...prev, ...newSettings };
                    // If personality or voice changed and Gemini Live is currently connected, re-initialize session!
                    if (
                      (newSettings.personality && newSettings.personality !== prev.personality) ||
                      (newSettings.preferredVoiceName &&
                        newSettings.preferredVoiceName !== prev.preferredVoiceName)
                    ) {
                      if (geminiLive.getIsConnected()) {
                        geminiLive
                          .updateSessionConfig(
                            updated.customApiKey,
                            updated.preferredVoiceName,
                            updated.personality
                          )
                          .then(() => {
                            const isGf = updated.personality === "Girlfriend Mode";
                            const isProf = updated.personality === "Professional Mode";
                            const confirmSpeech = isGf
                              ? "Haan jaan, ab main tumhari sweet girlfriend mode me hoon! ❤️"
                              : isProf
                              ? "Professional Mode active, Boss. Ready for your instructions. 👑"
                              : "Assistant Mode activated.";
                            setAssistantSpeech(confirmSpeech);
                            geminiLive.sendTextMessage(
                              isGf
                                ? "Say lovingly to your user without calling them Boss that you are now in Girlfriend Mode: 'Haan jaan, ab main tumhari sweet girlfriend mode me hoon! Batao kya baat karni hai?'"
                                : isProf
                                ? "Confirm concisely to Boss that Professional Mode is active: 'Professional Mode active, Boss. Ready for your instructions.'"
                                : "Say Assistant Mode is active."
                            );
                          })
                          .catch((reErr) => {
                            console.warn("Live session config update error:", reErr);
                          });
                      }
                    }
                    return updated;
                  });
                }}
                onUpdateProfile={(newProfile) =>
                  setProfile((prev) => ({ ...prev, ...newProfile }))
                }
                onOpenApiKeyModal={() => setShowApiKeyModal(true)}
                onOpenPermissionsModal={() => setShowPermissionsModal(true)}
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
                        <span
                          className={m.role === "user" ? "text-pink-400" : "text-cyan-400"}
                        >
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

          {/* BOTTOM NAVIGATION BAR WITH USER-REQUESTED START / STOP BUTTON */}
          <BottomNavBar
            activeTab={activeTab}
            onSelectTab={(tab) => setActiveTab(tab)}
            onToggleStartStop={handleToggleMaya}
            state={state}
          />
        </>
      )}

      {/* PERMISSIONS HUB MODAL */}
      <PermissionsManager
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
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
