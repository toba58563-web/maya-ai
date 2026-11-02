import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Clipboard,
  ChevronDown,
  ChevronRight,
  Mic,
  Shield,
  Settings as SettingsIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Bell,
  Layers,
  Smartphone,
  BatteryCharging,
  MapPin,
  Camera,
  FolderArchive,
  Users,
  Phone,
  MessageSquare,
  Radio,
  Sparkles,
  Check,
  RefreshCw,
  Trash2,
  Send,
} from "lucide-react";
import { AppSettings, UserProfile } from "../types";
import { MayaPhoneControlBridge, MayaPermissionsMap } from "../utils/mayaPhoneControl";
import { ApiKeyManager, ApiKeyVerificationState } from "../utils/apiKeyManager";

interface SettingsScreenProps {
  settings: AppSettings;
  profile: UserProfile;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onUpdateProfile: (newProfile: Partial<UserProfile>) => void;
  onOpenApiKeyModal: () => void;
  onOpenPermissionsModal: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  profile,
  onUpdateSettings,
  onUpdateProfile,
  onBack,
}) => {
  // Navigation between Settings and Permissions screen
  const [currentView, setCurrentView] = useState<"settings" | "permissions">("settings");

  // Form states
  const [apiKey, setApiKey] = useState(settings.customApiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    settings.selectedModel || "models/gemini-2.5-flash-native-audio-preview-09-2025"
  );
  const [voice, setVoice] = useState(settings.preferredVoiceName || "Aoede");
  const [personality, setPersonality] = useState<
    "Girlfriend Mode" | "Assistant Mode" | "Professional Mode"
  >(settings.personality || "Girlfriend Mode");
  const [userName, setUserName] = useState(profile.name || "");
  const [wakeWordEnabled, setWakeWordEnabled] = useState(
    Boolean(settings.wakeWordEnabled)
  );

  // Dropdown open states
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const [isPersonalityDropdownOpen, setIsPersonalityDropdownOpen] = useState(false);

  // Real API key verification state
  const [keyState, setKeyState] = useState<ApiKeyVerificationState>(() =>
    ApiKeyManager.getCurrentStatus(settings.customApiKey || "")
  );
  const [isTestingKey, setIsTestingKey] = useState(false);

  // Toast / feedback state
  const [savedToast, setSavedToast] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // True Android Permissions state for all 13 permissions
  const [permStates, setPermStates] = useState<MayaPermissionsMap>({
    microphone: false,
    notifications: false,
    overlay: false,
    accessibility: false,
    battery: false,
    location: false,
    camera: false,
    storage: false,
    contacts: false,
    phone: false,
    sms: false,
    notificationAccess: false,
    defaultAssistant: false,
  });

  const isNative = MayaPhoneControlBridge.isNative();

  // Query actual Android permission states
  const refreshPermissions = async () => {
    try {
      const perms = await MayaPhoneControlBridge.checkAllPermissions();
      setPermStates(perms);
    } catch (e) {
      console.warn("Permissions check error:", e);
    }
  };

  useEffect(() => {
    refreshPermissions();
  }, [currentView]);

  // Keep keyState in sync with apiKey input
  useEffect(() => {
    setKeyState(ApiKeyManager.getCurrentStatus(apiKey));
  }, [apiKey]);

  // Count granted permissions
  const grantedCount = Object.values(permStates).filter(Boolean).length;

  // Real Test API Key connection
  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setKeyState({
        status: "missing",
        errorMessage: "Please enter an API key first.",
      });
      return;
    }

    setIsTestingKey(true);
    try {
      const result = await ApiKeyManager.testKey(apiKey.trim());
      setKeyState(result);
      if (result.status === "connected") {
        onUpdateSettings({ customApiKey: apiKey.trim() });
        MayaPhoneControlBridge.saveSecureKey(apiKey.trim());
      }
    } finally {
      setIsTestingKey(false);
    }
  };

  // Clear API Key
  const handleClearApiKey = () => {
    setApiKey("");
    ApiKeyManager.clear();
    setKeyState({ status: "missing" });
    onUpdateSettings({ customApiKey: "" });
    MayaPhoneControlBridge.clearApiKey();
  };

  // Handle Save
  const handleSave = () => {
    onUpdateSettings({
      customApiKey: apiKey.trim(),
      selectedModel,
      preferredVoiceName: voice,
      personality,
      wakeWordEnabled,
      userName: userName.trim() || "Boss",
      addressStyle: userName.trim() || "Boss",
    });

    onUpdateProfile({
      name: userName.trim() || "Boss",
    });

    if (apiKey.trim()) {
      MayaPhoneControlBridge.saveSecureKey(apiKey.trim());
    }

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  // Paste from clipboard
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setApiKey(text.trim());
          setCopiedToast(true);
          setTimeout(() => setCopiedToast(false), 2000);
        }
      }
    } catch (err) {
      console.warn("Clipboard paste unavailable:", err);
    }
  };

  // Voices list from video
  const VOICE_OPTIONS = [
    "Aoede",
    "Charon",
    "Kore",
    "Fenrir",
    "Puck",
    "Leda",
    "Orus",
    "Zephyr",
  ];

  // AI Models list
  const MODEL_OPTIONS = [
    {
      id: "models/gemini-2.5-flash-native-audio-preview-09-2025",
      label: "models/gemini-2.5-flash-native-audio-preview-09-2025",
    },
    {
      id: "gemini-3.8-live",
      label: "gemini-3.8-live (Low-latency Realtime Audio)",
    },
    {
      id: "gemini-3.8-flash",
      label: "gemini-3.8-flash (Recommended Fast Neural AI)",
    },
    {
      id: "gemini-4-argon",
      label: "gemini-4-argon (Advanced Reasoning & Deep Logic)",
    },
  ];

  const getPersonalityDescription = (mode: string) => {
    switch (mode) {
      case "Girlfriend Mode":
        return "Warm Hinglish • Emotional but natural • Short spoken replies";
      case "Assistant Mode":
        return "Helpful & reliable • Multimodal • Android phone control";
      case "Professional Mode":
        return "Formal & analytical • High precision • Direct & concise";
      default:
        return "Warm Hinglish • Emotional but natural • Short spoken replies";
    }
  };

  // Request actual Android system permission
  const handleRequestSystemPermission = async (permName: string) => {
    await MayaPhoneControlBridge.requestSystemPermission(permName);
    setTimeout(refreshPermissions, 1200);
  };

  // =========================================================================
  // VIEW 2: PERMISSIONS SCREEN (From video 00:13 - 00:19)
  // =========================================================================
  if (currentView === "permissions") {
    const PERMISSION_ITEMS = [
      {
        id: "microphone",
        name: "Microphone",
        status: permStates.microphone,
        desc: "Required to hear your voice commands.",
        code: "android.permission.RECORD_AUDIO",
        icon: Mic,
      },
      {
        id: "notifications",
        name: "Notifications",
        status: permStates.notifications,
        desc: "Required to keep the assistant running in background.",
        code: "android.permission.POST_NOTIFICATIONS",
        icon: Bell,
      },
      {
        id: "overlay",
        name: "Overlay / Display Over Apps",
        status: permStates.overlay,
        desc: "Required to show the assistant UI / floating orb over other apps.",
        code: "android.permission.SYSTEM_ALERT_WINDOW",
        icon: Layers,
      },
      {
        id: "accessibility",
        name: "Accessibility Service",
        status: permStates.accessibility,
        desc: "Required to automate tasks and interact with screen.",
        code: "ACCESSIBILITY_SERVICE",
        icon: Smartphone,
      },
      {
        id: "battery",
        name: "Battery Optimization",
        status: permStates.battery,
        desc: "Required to prevent the system from killing background service.",
        code: "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
        icon: BatteryCharging,
      },
      {
        id: "location",
        name: "Location",
        status: permStates.location,
        desc: "Required for weather and location-based queries.",
        code: "android.permission.ACCESS_FINE_LOCATION",
        icon: MapPin,
      },
      {
        id: "camera",
        name: "Camera",
        status: permStates.camera,
        desc: "Required for visual capabilities and scanning.",
        code: "android.permission.CAMERA",
        icon: Camera,
      },
      {
        id: "storage",
        name: "Storage / Media",
        status: permStates.storage,
        desc: "Required to save memories and files.",
        code: "android.permission.READ_MEDIA_AUDIO",
        icon: FolderArchive,
      },
      {
        id: "contacts",
        name: "Contacts",
        status: permStates.contacts,
        desc: "Required to find contact names when calling or messaging.",
        code: "android.permission.READ_CONTACTS",
        icon: Users,
      },
      {
        id: "phone",
        name: "Phone",
        status: permStates.phone,
        desc: "Required to initiate phone calls directly via voice.",
        code: "android.permission.CALL_PHONE",
        icon: Phone,
      },
      {
        id: "sms",
        name: "SMS (Send & Read)",
        status: permStates.sms,
        desc: "Required to send and read text messages via voice.",
        code: "android.permission.SEND_SMS",
        icon: MessageSquare,
      },
      {
        id: "notificationAccess",
        name: "Notification Access",
        status: permStates.notificationAccess,
        desc: "Required to read incoming WhatsApp and social messages aloud.",
        code: "NOTIFICATION_LISTENER_SERVICE",
        icon: Radio,
      },
      {
        id: "defaultAssistant",
        name: "Default Digital Assistant",
        status: permStates.defaultAssistant,
        desc: "Set MAYA as your phone's default voice assistant app.",
        code: "VOICE_INTERACTION_SERVICE",
        icon: Sparkles,
      },
    ];

    return (
      <div className="w-full flex-1 flex flex-col px-4 pt-4 pb-28 overflow-y-auto max-w-md mx-auto text-slate-100 select-none animate-in fade-in duration-200">
        {/* PERMISSIONS TOP BAR */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
          <button
            onClick={() => setCurrentView("settings")}
            className="p-2 -ml-2 text-slate-300 hover:text-white transition-colors"
            title="Back to Settings"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
          </button>
          <h1 className="text-base font-black tracking-widest uppercase text-white">
            PERMISSIONS
          </h1>
          <button
            onClick={refreshPermissions}
            className="p-2 -mr-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            title="Refresh permissions status"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>

        {/* SYSTEM ACCESS STATUS SUMMARY CARD */}
        <div className="p-4 rounded-2xl bg-[#0c1626] border border-cyan-500/30 flex items-center justify-between mb-4 shadow-[0_4px_20px_rgba(6,182,212,0.1)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                System Access Status
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {grantedCount} of 13 permissions granted
              </p>
            </div>
          </div>
          <button
            onClick={() => MayaPhoneControlBridge.openAccessibilitySettings()}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
          >
            Settings
          </button>
        </div>

        {/* 13 DETAILED PERMISSIONS LIST */}
        <div className="space-y-3">
          {PERMISSION_ITEMS.map((item) => {
            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-[#0c1626] border border-white/10 flex items-center justify-between gap-3 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-white">{item.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.status
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.status ? "bg-emerald-400" : "bg-rose-400"
                        }`}
                      />
                      {item.status ? "Granted" : "Not Granted"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">{item.desc}</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1 tracking-tight truncate">
                    {item.code}
                  </p>
                </div>

                {/* Grant / Configure Gear Button */}
                <button
                  onClick={() => handleRequestSystemPermission(item.id)}
                  className="w-10 h-10 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 hover:text-cyan-200 transition-all shrink-0 active:scale-95 shadow-sm cursor-pointer"
                  title={`Configure ${item.name}`}
                >
                  <SettingsIcon className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: SETTINGS SCREEN (Exact match with user video 00:00 - 00:12)
  // =========================================================================
  return (
    <div className="w-full flex-1 flex flex-col px-4 pt-4 pb-28 overflow-y-auto max-w-md mx-auto text-slate-100 select-none animate-in fade-in duration-200">
      {/* TOP BAR: Back Arrow + SETTINGS + Save */}
      <div className="flex items-center justify-between mb-5 pb-2 border-b border-white/5">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-slate-300 hover:text-white transition-colors"
          title="Back to Home"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
        </button>
        <h1 className="text-base font-black tracking-widest uppercase text-white">
          SETTINGS
        </h1>
        <button
          onClick={handleSave}
          className="text-sm font-bold text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-xl hover:bg-cyan-500/10 transition-colors cursor-pointer"
        >
          Save
        </button>
      </div>

      {/* TOAST FEEDBACK NOTIFICATION */}
      {savedToast && (
        <div className="mb-4 p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center gap-2 text-xs font-semibold text-cyan-200 animate-in fade-in">
          <Check className="w-4 h-4 text-cyan-400" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      <div className="space-y-4">
        {/* 1. GEMINI API KEY */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-300">
              Gemini API Key
            </label>
            {/* Real Connection Status Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                keyState.status === "connected"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : keyState.status === "unverified"
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                  : "bg-rose-500/20 text-rose-400 border-rose-500/40"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  keyState.status === "connected"
                    ? "bg-emerald-400"
                    : keyState.status === "unverified"
                    ? "bg-amber-400"
                    : "bg-rose-400"
                }`}
              />
              {keyState.status === "connected"
                ? "Connected"
                : keyState.status === "unverified"
                ? "Not Verified"
                : keyState.status === "failed"
                ? "Connection Failed"
                : "API Key Missing"}
            </span>
          </div>

          <div className="relative rounded-xl bg-[#0c1626] border border-white/10 hover:border-cyan-500/40 transition-colors flex items-center justify-between px-3.5 py-3">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your personal Gemini API Key"
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none pr-8 tracking-wider font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="text-slate-400 hover:text-white p-1 transition-colors"
              title={showKey ? "Hide API Key" : "Show API Key"}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Error Message if connection failed */}
          {keyState.status === "failed" && keyState.errorMessage && (
            <div className="mt-1.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 leading-tight">
              ⚠️ {keyState.errorMessage}
            </div>
          )}

          {/* Action Row: Paste from clipboard, Test Connection, Clear Key */}
          <div className="flex items-center justify-between mt-2 px-0.5 gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste from clipboard</span>
              </button>
              {copiedToast && (
                <span className="text-[11px] text-emerald-400 font-semibold animate-pulse">
                  Pasted!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingKey || !apiKey.trim()}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-[11px] font-bold text-cyan-300 transition-all flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isTestingKey ? "animate-spin" : ""}`} />
                <span>{isTestingKey ? "Testing..." : "Test Connection"}</span>
              </button>
              {apiKey.trim() && (
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors"
                  title="Clear API Key"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. AI MODEL */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            AI Model
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="w-full rounded-xl bg-[#0c1626] border border-white/10 hover:border-cyan-500/40 transition-colors px-3.5 py-3 flex items-center justify-between text-left text-sm text-white"
            >
              <span className="truncate pr-2 font-mono text-xs">{selectedModel}</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                  isModelDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isModelDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl bg-[#08101d] border border-cyan-500/30 shadow-2xl py-1.5 z-30 max-h-52 overflow-y-auto">
                {MODEL_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedModel(m.id);
                      setIsModelDropdownOpen(false);
                      onUpdateSettings({ selectedModel: m.id });
                    }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors ${
                      selectedModel === m.id
                        ? "bg-cyan-500/20 text-cyan-300 font-bold"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate font-mono">{m.label}</span>
                    {selectedModel === m.id && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. VOICE */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            Voice Model
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
              className="w-full rounded-xl bg-[#0c1626] border border-white/10 hover:border-cyan-500/40 transition-colors px-3.5 py-3 flex items-center justify-between text-left text-sm text-white"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-cyan-300">{voice}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                  {voice === "Aoede" || voice === "Kore" || voice === "Leda" || voice === "Zephyr" ? "(Female)" : "(Male)"}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                  isVoiceDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isVoiceDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl bg-[#08101d] border border-cyan-500/30 shadow-2xl py-1.5 z-30 max-h-56 overflow-y-auto">
                {VOICE_OPTIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setVoice(v);
                      setIsVoiceDropdownOpen(false);
                      onUpdateSettings({ preferredVoiceName: v });
                    }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors ${
                      voice === v
                        ? "bg-cyan-500/20 text-cyan-300 font-bold"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{v}</span>
                      <span className="text-[10px] text-slate-500">
                        {v === "Aoede" || v === "Kore" || v === "Leda" || v === "Zephyr" ? "Female" : "Male"}
                      </span>
                    </div>
                    {voice === v && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. PERSONALITY */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            Personality Mode
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPersonalityDropdownOpen(!isPersonalityDropdownOpen)}
              className="w-full rounded-xl bg-[#0c1626] border border-white/10 hover:border-cyan-500/40 transition-colors px-3.5 py-3 flex items-center justify-between text-left text-sm text-white"
            >
              <span className="font-semibold text-pink-300">{personality}</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                  isPersonalityDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isPersonalityDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl bg-[#08101d] border border-cyan-500/30 shadow-2xl py-1.5 z-30">
                {(
                  [
                    "Girlfriend Mode",
                    "Assistant Mode",
                    "Professional Mode",
                  ] as const
                ).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPersonality(p);
                      setIsPersonalityDropdownOpen(false);
                      onUpdateSettings({ personality: p });
                    }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors ${
                      personality === p
                        ? "bg-pink-500/20 text-pink-300 font-bold"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                      <span>{p}</span>
                    </div>
                    {personality === p && <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Dynamic personality sub-caption */}
          <p className="text-[11px] text-slate-400 mt-1.5 px-0.5 leading-snug">
            {getPersonalityDescription(personality)}
          </p>
        </div>

        {/* 5. USER NAME */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            User Name
          </label>
          <div className="rounded-xl bg-[#0c1626] border border-white/10 hover:border-cyan-500/40 transition-colors px-3.5 py-3">
            <input
              type="text"
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
                onUpdateProfile({ name: e.target.value });
              }}
              placeholder="e.g. Tony Stark, Sir, Boss (optional)"
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* 6. HANDS-FREE WAKE WORD */}
        <div className="pt-2">
          <h3 className="text-xs font-bold text-cyan-400 tracking-wider uppercase mb-2">
            HANDS-FREE WAKE WORD
          </h3>
          <div className="rounded-2xl bg-[#0c1626] border border-white/10 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">
                  Wake Word: Hey MAYA
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-tight">
                  Listen in background and launch floating orb on top of any app
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={() => {
                const next = !wakeWordEnabled;
                setWakeWordEnabled(next);
                onUpdateSettings({ wakeWordEnabled: next });
              }}
              className={`w-12 h-6.5 rounded-full p-1 transition-colors flex items-center shrink-0 cursor-pointer ${
                wakeWordEnabled ? "bg-cyan-500 justify-end" : "bg-slate-700 justify-start"
              }`}
            >
              <div className="w-4.5 h-4.5 rounded-full bg-white shadow-md transition-all" />
            </button>
          </div>
        </div>

        {/* 7. PERMISSIONS & SYSTEM */}
        <div className="pt-2">
          <h3 className="text-xs font-bold text-cyan-400 tracking-wider uppercase mb-2">
            PERMISSIONS & SYSTEM
          </h3>
          <button
            type="button"
            onClick={() => setCurrentView("permissions")}
            className="w-full rounded-2xl bg-[#0c1626] border border-white/10 hover:border-cyan-500/40 p-4 flex items-center justify-between gap-3 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                  Manage Permissions
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-tight">
                  Configure voice, accessibility & overlay access
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
};
