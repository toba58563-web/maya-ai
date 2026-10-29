import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Info,
  Cpu,
  Key,
  Layers,
  Wifi,
  Trash2,
  Mic,
  Lock,
  Globe,
  User,
  Heart,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  Eye,
} from "lucide-react";
import { AppSettings, UserProfile } from "../types";
import { ZaraAvatar } from "./ZaraAvatar";
import { MayaPhoneControlBridge } from "../utils/mayaPhoneControl";

interface SettingsScreenProps {
  settings: AppSettings;
  profile: UserProfile;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onUpdateProfile: (newProfile: Partial<UserProfile>) => void;
  onOpenApiKeyModal: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  profile,
  onUpdateSettings,
  onUpdateProfile,
  onOpenApiKeyModal,
  onBack,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [tempAddressName, setTempAddressName] = useState(profile.name || "Boss");

  // Android Native Permission states
  const [isAccessibilityOn, setIsAccessibilityOn] = useState(false);
  const [isOverlayAllowed, setIsOverlayAllowed] = useState(false);
  const [isFloatingOrbActive, setIsFloatingOrbActive] = useState(false);
  const isNative = MayaPhoneControlBridge.isNative();

  useEffect(() => {
    if (isNative) {
      checkNativePermissions();
    }
  }, [isNative]);

  const checkNativePermissions = async () => {
    const acc = await MayaPhoneControlBridge.isAccessibilityEnabled();
    setIsAccessibilityOn(acc);
    const ov = await MayaPhoneControlBridge.isOverlayPermissionGranted();
    setIsOverlayAllowed(ov);
  };

  const hasKey = Boolean(settings.customApiKey?.trim());

  const handleTestConnection = async () => {
    const keyToTest = settings.customApiKey?.trim();
    if (!keyToTest) {
      onOpenApiKeyModal();
      return;
    }

    setIsTesting(true);
    setTestStatus(null);

    try {
      // Direct request to Google Cloud Gemini API
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(
        keyToTest
      )}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
        }),
      });

      if (res.ok) {
        setTestStatus("✅ Gemini API connected successfully! Real-time ready.");
      } else {
        const errData = await res.json().catch(() => ({}));
        setTestStatus(
          "❌ Connection failed: " +
            (errData.error?.message || "Invalid API key or quota exceeded")
        );
      }
    } catch (e: any) {
      // Fallback test via server proxy
      try {
        const sRes = await fetch("/api/test-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: keyToTest }),
        });
        const sData = await sRes.json();
        if (sRes.ok && sData.success) {
          setTestStatus("✅ Gemini API connected successfully!");
        } else {
          setTestStatus("❌ Test failed: " + (sData.error || "Invalid key"));
        }
      } catch (err: any) {
        setTestStatus("❌ Connection error: " + (err.message || e.message));
      }
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestStatus(null), 6000);
    }
  };

  const handleClearApiKey = () => {
    if (window.confirm("Are you sure you want to remove your stored Gemini API key?")) {
      onUpdateSettings({ customApiKey: "" });
      MayaPhoneControlBridge.saveSecureKey("");
      setTestStatus("ℹ️ API key removed from device storage.");
      setTimeout(() => setTestStatus(null), 3000);
    }
  };

  const handleToggleFloatingOrb = async () => {
    if (!isOverlayAllowed) {
      await MayaPhoneControlBridge.requestOverlayPermission();
      checkNativePermissions();
      return;
    }
    const next = !isFloatingOrbActive;
    const success = await MayaPhoneControlBridge.setFloatingOrb(next);
    if (success || !isNative) {
      setIsFloatingOrbActive(next);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col px-5 pt-4 pb-28 overflow-y-auto max-w-md mx-auto text-slate-100">
      {/* HEADER WITH BACK ARROW */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Settings</h1>
          <p className="text-xs text-slate-400">Customize your Maya AI experience</p>
        </div>
      </div>

      {/* Test Status Banner */}
      {testStatus && (
        <div className="mb-4 p-3 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 text-xs text-cyan-200 animate-in fade-in">
          {testStatus}
        </div>
      )}

      {/* PROFILE CARD */}
      <div className="p-4 rounded-3xl bg-[#0c1324] border border-white/10 mb-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3.5">
          <ZaraAvatar size="md" isOnline={true} />
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Maya AI</h2>
            <span className="text-xs text-slate-400">Android APK Edition • v1.0.0</span>
          </div>
        </div>
        <button
          onClick={() =>
            alert(
              "Maya AI Assistant & Phone Controller\nFeatures:\n• Android Accessibility Service (Taps, Scroll, Type)\n• Floating Assistant Orb (Display over apps)\n• Background Audio Processing\n• Real-Time Google Cloud Gemini API"
            )
          }
          className="p-2 text-slate-400 hover:text-white"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-5">
        {/* ANDROID PHONE CONTROL & ACCESSIBILITY SECTION */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Android Phone Control
            </span>
          </div>

          <div className="rounded-3xl bg-[#0c1324] border border-white/10 overflow-hidden divide-y divide-white/5">
            {/* 1. Accessibility Service */}
            <button
              onClick={() => MayaPhoneControlBridge.openAccessibilitySettings()}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Accessibility Service</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold border ${
                        isAccessibilityOn || !isNative
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {isAccessibilityOn || !isNative ? "Active" : "Tap to Enable"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Required for auto-tap, scroll, and typing
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* 2. Floating Assistant Orb (Display over other apps) */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Floating Assistant Orb</span>
                    {!isOverlayAllowed && isNative && (
                      <span className="text-[10px] text-amber-400 font-normal">
                        (Needs Permission)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Show draggable Maya orb over other apps
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleFloatingOrb}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  isFloatingOrbActive ? "bg-cyan-500 justify-end" : "bg-slate-700 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: AI CONFIGURATION */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              AI Configuration
            </span>
          </div>

          <div className="rounded-3xl bg-[#0c1324] border border-white/10 overflow-hidden divide-y divide-white/5">
            {/* 1. Gemini API Key */}
            <button
              onClick={onOpenApiKeyModal}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Gemini API Key</span>
                    {hasKey && (
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
                        Connected
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {hasKey ? "Key saved in Android Keystore" : "Enter your personal Gemini API key"}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* 2. Model Selection */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Model Selection</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Gemini 3.1 Flash / Live (Aoede Voice)
                  </div>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                Multimodal
              </span>
            </div>

            {/* 3. Test API Connection */}
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  {isTesting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wifi className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Test API Connection</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Performs actual request to Gemini cloud
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* 4. Clear API Key */}
            {hasKey && (
              <button
                onClick={handleClearApiKey}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-red-500/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-red-300 group-hover:text-red-200">
                      Clear API Key
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Remove key from device Keystore
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>
        </div>

        {/* SECTION 3: VOICE & SPEECH */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Mic className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Voice
            </span>
          </div>

          <div className="rounded-3xl bg-[#0c1324] border border-white/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Voice & Speech</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Aoede Neural Female Voice (Real-Time)
                </div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
              Ready
            </span>
          </div>
        </div>

        {/* SECTION 4: ASSISTANT & PERSONALIZATION */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <User className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Assistant
            </span>
          </div>

          <div className="rounded-3xl bg-[#0c1324] border border-white/10 overflow-hidden divide-y divide-white/5">
            {/* Call me Boss */}
            <button
              onClick={() => setShowAddressModal(true)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Call me {profile.name || "Boss"} ❤️
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Change how Maya addresses you
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* Language */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Understood Languages</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Hindi, Hinglish, English
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>

            {/* Background Mode Toggle */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Background Service</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Keep Maya active in foreground notification
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ backgroundKeepAlive: !settings.backgroundKeepAlive })
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.backgroundKeepAlive ? "bg-cyan-500 justify-end" : "bg-slate-700 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Address Customization Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#0c1324] border border-pink-500/30 p-5 text-white">
            <h3 className="text-base font-bold mb-1">What should Maya call you?</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your preferred nickname (e.g. Boss, Dost, Prince)
            </p>
            <input
              type="text"
              value={tempAddressName}
              onChange={(e) => setTempAddressName(e.target.value)}
              placeholder="e.g. Boss"
              className="w-full py-2.5 px-3 rounded-2xl bg-black/40 border border-white/20 text-sm focus:outline-none focus:border-pink-400 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAddressModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdateProfile({ name: tempAddressName.trim() || "Boss" });
                  setShowAddressModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-xs font-semibold text-white shadow-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
