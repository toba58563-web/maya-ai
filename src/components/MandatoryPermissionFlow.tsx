import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Mic,
  Bell,
  Accessibility,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Lock,
} from "lucide-react";
import { MayaPhoneControlBridge, MayaPermissionsMap } from "../utils/mayaPhoneControl";

export type MandatoryStep = "microphone" | "notifications" | "accessibility" | "overlay" | "completed";

interface MandatoryPermissionFlowProps {
  onComplete: () => void;
  initialStep?: MandatoryStep;
}

interface StepConfig {
  id: "microphone" | "notifications" | "accessibility" | "overlay";
  stepNumber: number;
  title: string;
  badgeTitle: string;
  subtitle: string;
  whyRequired: string;
  androidDetail: string;
  icon: React.ComponentType<{ className?: string }>;
  actionLabel: string;
  settingsHint: string;
}

const STEPS: StepConfig[] = [
  {
    id: "microphone",
    stepNumber: 1,
    title: "Microphone Access",
    badgeTitle: "Step 1 of 4: Voice Input",
    subtitle: "Required for Maya to hear and understand your voice commands.",
    whyRequired:
      "Maya is a real-time conversational voice assistant. Without microphone access, she cannot hear your questions or voice commands in Hindi, Hinglish, or English.",
    androidDetail: "Android System Permission: android.permission.RECORD_AUDIO",
    icon: Mic,
    actionLabel: "Grant Microphone Access",
    settingsHint: "Tap 'While using the app' or 'Allow' on the Android system popup.",
  },
  {
    id: "notifications",
    stepNumber: 2,
    title: "Notifications Access",
    badgeTitle: "Step 2 of 4: Foreground & Alerts",
    subtitle: "Required for foreground assistant service and real-time alerts.",
    whyRequired:
      "Maya runs a low-latency foreground service so she stays alive in the background, delivers voice feedback, and notifies you when long phone tasks finish.",
    androidDetail: "Android System Permission: android.permission.POST_NOTIFICATIONS",
    icon: Bell,
    actionLabel: "Grant Notification Permission",
    settingsHint: "Tap 'Allow' to allow Maya to show background service and call notifications.",
  },
  {
    id: "accessibility",
    stepNumber: 3,
    title: "Accessibility Service",
    badgeTitle: "Step 3 of 4: Phone Control Core",
    subtitle: "Required for automated app control, typing, scrolling, and skipping ads.",
    whyRequired:
      "Maya uses Android's Accessibility API to open apps, search YouTube songs, automatically skip video ads, scroll screens, and type text without manual touches.",
    androidDetail: "Android Accessibility Service: com.maya.ai.assistant.MayaAccessibilityService",
    icon: Accessibility,
    actionLabel: "Enable in Accessibility Settings",
    settingsHint: "Find 'Maya AI Assistant' in Downloaded Services and toggle the switch to ON.",
  },
  {
    id: "overlay",
    stepNumber: 4,
    title: "Display Over Other Apps",
    badgeTitle: "Step 4 of 4: Floating Assistant",
    subtitle: "Required for the floating RGB assistant orb on your home screen.",
    whyRequired:
      "Display Over Other Apps allows Maya's visual RGB orb to float above any app or game so you can talk to her anytime from anywhere on your phone.",
    androidDetail: "Android System Permission: android.permission.SYSTEM_ALERT_WINDOW",
    icon: Layers,
    actionLabel: "Allow Display Over Other Apps",
    settingsHint: "Find 'Maya AI' in the list and turn 'Allow display over other apps' ON.",
  },
];

export const MandatoryPermissionFlow: React.FC<MandatoryPermissionFlowProps> = ({
  onComplete,
  initialStep = "microphone",
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() => {
    const idx = STEPS.findIndex((s) => s.id === initialStep);
    return idx >= 0 ? idx : 0;
  });

  const [permMap, setPermMap] = useState<MayaPermissionsMap | null>(null);
  const [isWaitingForSettings, setIsWaitingForSettings] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAllComplete, setIsAllComplete] = useState(false);

  const currentStep = STEPS[currentStepIndex];
  const stepId = currentStep?.id;
  const isGranted = Boolean(permMap && stepId && permMap[stepId]);

  // Check all permissions from Android
  const checkPermissions = useCallback(async (): Promise<MayaPermissionsMap> => {
    setIsVerifying(true);
    try {
      const res = await MayaPhoneControlBridge.checkAllPermissions();
      setPermMap(res);
      return res;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkPermissions().then((map) => {
      // Find the first ungranted mandatory permission in sequence
      const firstMissing = STEPS.findIndex((s) => !map[s.id]);
      if (firstMissing === -1) {
        // All 4 are already granted!
        setIsAllComplete(true);
      } else {
        setCurrentStepIndex(firstMissing);
      }
    });
  }, [checkPermissions]);

  // Auto-check whenever user returns from Android Settings or system dialogs
  useEffect(() => {
    const handleResume = () => {
      checkPermissions().then((map) => {
        if (stepId && map[stepId]) {
          setIsWaitingForSettings(false);
        }
      });
    };

    window.addEventListener("focus", handleResume);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) handleResume();
    });

    // Periodic check every 1.5 seconds while waiting for user to return from settings
    const interval = setInterval(() => {
      if (isWaitingForSettings || !isGranted) {
        checkPermissions();
      }
    }, 1600);

    return () => {
      window.removeEventListener("focus", handleResume);
      clearInterval(interval);
    };
  }, [checkPermissions, isWaitingForSettings, isGranted, stepId]);

  // Request the permission for the current step
  const handleRequestPermission = async () => {
    if (!stepId) return;
    setIsRequesting(true);
    setHasPrompted(true);

    try {
      if (stepId === "accessibility") {
        setIsWaitingForSettings(true);
        await MayaPhoneControlBridge.openAccessibilitySettings();
      } else if (stepId === "overlay") {
        setIsWaitingForSettings(true);
        await MayaPhoneControlBridge.requestOverlayPermission();
      } else {
        // microphone or notifications
        setIsWaitingForSettings(true);
        await MayaPhoneControlBridge.requestSystemPermission(stepId);
      }

      // Check immediate status
      setTimeout(() => {
        checkPermissions();
      }, 600);
    } catch (e) {
      console.warn("Permission request error:", e);
    } finally {
      setIsRequesting(false);
    }
  };

  // Open general app settings if permanently denied
  const handleOpenAppSettings = async () => {
    setIsWaitingForSettings(true);
    await MayaPhoneControlBridge.openAppSettings();
  };

  // Move to next mandatory step once current is VERIFIED granted
  const handleContinueNext = () => {
    if (!isGranted) return; // Strict no-bypass check

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStepIndex(nextIndex);
      setIsWaitingForSettings(false);
      setHasPrompted(false);
      // Double check permissions
      checkPermissions();
    } else {
      // All 4 mandatory steps are complete!
      setIsAllComplete(true);
      localStorage.setItem("maya_mandatory_setup_completed", "true");
    }
  };

  // Handle final completion
  const handleFinishSetup = () => {
    localStorage.setItem("maya_mandatory_setup_completed", "true");
    onComplete();
  };

  // Render Step 5: Setup Complete Screen
  if (isAllComplete) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-between p-6 bg-[#030612] text-white select-none animate-in fade-in duration-300">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[380px] h-[380px] bg-gradient-to-tr from-emerald-500/20 via-cyan-500/20 to-purple-500/20 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Header */}
        <div className="pt-4 flex items-center justify-center">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Setup Complete • 4/4 Verified</span>
          </div>
        </div>

        {/* Center Content */}
        <div className="flex flex-col items-center text-center my-auto relative z-10 max-w-sm mx-auto">
          <div className="relative mb-6">
            <div className="absolute -inset-4 rounded-full bg-emerald-500/30 blur-2xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 border border-emerald-400/40">
              <ShieldCheck className="w-12 h-12 stroke-[2.2]" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            All Permissions Verified!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
            Maya AI now has full access to listen to your voice, run the foreground assistant, automate phone tasks, and float above your screen.
          </p>

          {/* 4 Verified Checklist Pills */}
          <div className="w-full space-y-2.5 text-left mb-6">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#091224] border border-emerald-500/30"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <step.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">
                      {step.title}
                    </span>
                    <span className="text-[10px] text-slate-400">Android Verified</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Granted</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enter Home Screen Button */}
        <div className="w-full max-w-xs mx-auto pb-4 relative z-10">
          <button
            onClick={handleFinishSetup}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-extrabold text-sm shadow-xl shadow-emerald-500/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>ENTER MAYA HOME</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Determine current status state
  let statusBadge = {
    label: "Permission Required",
    color: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    dot: "bg-rose-400",
  };

  if (isGranted) {
    statusBadge = {
      label: "Granted • Verified by Android",
      color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
      dot: "bg-emerald-400",
    };
  } else if (isWaitingForSettings) {
    statusBadge = {
      label: "Waiting for Android Settings...",
      color: "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse",
      dot: "bg-amber-400",
    };
  }

  const StepIcon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between p-6 bg-[#030612] text-white select-none overflow-y-auto">
      {/* Background Ambient Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[360px] h-[360px] bg-gradient-to-tr from-cyan-500/20 via-blue-600/15 to-purple-600/20 rounded-full blur-[110px] pointer-events-none" />

      {/* TOP: Step Indicator (1 to 4) */}
      <div className="relative z-10 pt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              {currentStep.badgeTitle}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            {currentStepIndex + 1} / {STEPS.length}
          </span>
        </div>

        {/* 4-Step Progress Track */}
        <div className="grid grid-cols-4 gap-1.5 w-full">
          {STEPS.map((step, idx) => {
            const stepGranted = Boolean(permMap && permMap[step.id]);
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={step.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  stepGranted
                    ? "bg-emerald-400 shadow-[0_0_8px_#10b981]"
                    : isCurrent
                    ? "bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse"
                    : "bg-white/10"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* CENTER: Main Permission Card (Single page per permission) */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto py-6 max-w-sm mx-auto w-full">
        {/* Pulsing Icon Halo */}
        <div className="relative mb-5">
          <div
            className={`absolute -inset-4 rounded-3xl blur-2xl transition-all ${
              isGranted
                ? "bg-emerald-500/35"
                : isWaitingForSettings
                ? "bg-amber-500/25 animate-pulse"
                : "bg-cyan-500/30"
            }`}
          />
          <div
            className={`relative w-24 h-24 rounded-3xl border flex items-center justify-center shadow-2xl transition-all duration-300 ${
              isGranted
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-emerald-500/30"
                : "bg-gradient-to-tr from-[#09152b] via-[#050b1a] to-[#02050e] border-cyan-400/50 text-cyan-300 shadow-cyan-500/30"
            }`}
          >
            {isGranted ? (
              <CheckCircle2 className="w-12 h-12 stroke-[2.2] animate-in zoom-in" />
            ) : (
              <StepIcon className="w-12 h-12 stroke-[2]" />
            )}
          </div>
        </div>

        {/* Title & Subtitle */}
        <h2 className="text-2xl font-black text-white tracking-tight mb-1.5">
          {currentStep.title}
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          {currentStep.subtitle}
        </p>

        {/* Live Android Status Pill */}
        <div className="mb-4">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${statusBadge.color}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
            <span>{statusBadge.label}</span>
          </span>
        </div>

        {/* WHY IS THIS MANDATORY? INFO BOX */}
        <div className="w-full text-left p-4 rounded-2xl bg-[#091224] border border-white/10 text-xs text-slate-300 space-y-2 mb-3">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Mandatory Core Permission</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300">
            {currentStep.whyRequired}
          </p>
          <div className="pt-1.5 border-t border-white/5 text-[10px] text-slate-500 font-mono truncate">
            {currentStep.androidDetail}
          </div>
        </div>

        {/* Instructions Hint */}
        <div className="w-full text-left p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>{currentStep.settingsHint}</span>
        </div>
      </div>

      {/* BOTTOM ACTION BUTTONS (NO SKIP BUTTON!) */}
      <div className="relative z-10 w-full max-w-sm mx-auto space-y-2.5 pb-2">
        {isGranted ? (
          // IF VERIFIED GRANTED -> Show Continue Button
          <button
            onClick={handleContinueNext}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-extrabold text-sm shadow-xl shadow-emerald-500/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer animate-in fade-in"
          >
            <span>
              {currentStepIndex + 1 === STEPS.length
                ? "COMPLETE SETUP"
                : `CONTINUE TO STEP ${currentStepIndex + 2}`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          // IF NOT YET GRANTED -> Action to Grant
          <>
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRequesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Opening Permission...</span>
                </>
              ) : (
                <>
                  <span>{currentStep.actionLabel}</span>
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>

            {/* If user has prompted or is waiting, show Retry / Refresh & App Settings */}
            {(hasPrompted || isWaitingForSettings) && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => checkPermissions()}
                  disabled={isVerifying}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-cyan-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-cyan-400 ${
                      isVerifying ? "animate-spin" : ""
                    }`}
                  />
                  <span>Re-check Status</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAppSettings}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>App Settings</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
