import React, { useState, useEffect } from "react";
import {
  Shield,
  Smartphone,
  Layers,
  Mic,
  Bell,
  BatteryCharging,
  MapPin,
  Camera,
  FolderArchive,
  Users,
  Phone,
  MessageSquare,
  Radio,
  Sparkles,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { MayaPhoneControlBridge } from "../utils/mayaPhoneControl";

interface PermissionsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PermissionsManager: React.FC<PermissionsManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const [permStates, setPermStates] = useState({
    microphone: true,
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

  const refreshPermissions = async () => {
    try {
      const acc = await MayaPhoneControlBridge.isAccessibilityEnabled();
      const ov = await MayaPhoneControlBridge.isOverlayPermissionGranted();

      let mic = true;
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const micStatus = await navigator.permissions.query({ name: "microphone" as any });
          mic = micStatus.state === "granted";
        } catch {}
      }

      let notif = false;
      if ("Notification" in window) {
        notif = Notification.permission === "granted";
      }

      let loc = false;
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const locStatus = await navigator.permissions.query({ name: "geolocation" as any });
          loc = locStatus.state === "granted";
        } catch {}
      }

      setPermStates((prev) => ({
        ...prev,
        accessibility: acc || !isNative,
        overlay: ov || !isNative,
        microphone: mic,
        notifications: notif,
        location: loc,
      }));
    } catch (e) {
      console.warn("Permissions check error:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshPermissions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const grantedCount = Object.values(permStates).filter(Boolean).length;

  const handleRequestMicrophone = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermStates((prev) => ({ ...prev, microphone: true }));
    } catch {
      alert("Please allow microphone access in device or browser settings.");
    }
  };

  const handleRequestNotifications = async () => {
    if ("Notification" in window) {
      const res = await Notification.requestPermission();
      setPermStates((prev) => ({ ...prev, notifications: res === "granted" }));
    }
  };

  const handleRequestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setPermStates((prev) => ({ ...prev, location: true })),
        () => alert("Please allow location access in your device settings.")
      );
    }
  };

  const handleRequestCamera = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setPermStates((prev) => ({ ...prev, camera: true }));
    } catch {
      alert("Please allow camera access in your device settings.");
    }
  };

  const handleRequestAccessibility = async () => {
    await MayaPhoneControlBridge.openAccessibilitySettings();
    setTimeout(refreshPermissions, 1000);
  };

  const handleRequestOverlay = async () => {
    await MayaPhoneControlBridge.requestOverlayPermission();
    setTimeout(refreshPermissions, 1000);
  };

  const handleToggle = (key: keyof typeof permStates) => {
    setPermStates((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const PERMISSION_ITEMS = [
    {
      id: "microphone" as const,
      name: "Microphone",
      status: permStates.microphone,
      desc: "Required to hear your voice commands.",
      code: "android.permission.RECORD_AUDIO",
      icon: Mic,
      onAction: handleRequestMicrophone,
    },
    {
      id: "notifications" as const,
      name: "Notifications",
      status: permStates.notifications,
      desc: "Required to keep the assistant running in background.",
      code: "android.permission.POST_NOTIFICATIONS",
      icon: Bell,
      onAction: handleRequestNotifications,
    },
    {
      id: "overlay" as const,
      name: "Overlay / Display Over Apps",
      status: permStates.overlay,
      desc: "Required to show the assistant UI / floating orb over other apps.",
      code: "android.permission.SYSTEM_ALERT_WINDOW",
      icon: Layers,
      onAction: handleRequestOverlay,
    },
    {
      id: "accessibility" as const,
      name: "Accessibility Service",
      status: permStates.accessibility,
      desc: "Required to automate tasks and interact with screen.",
      code: "ACCESSIBILITY_SERVICE",
      icon: Smartphone,
      onAction: handleRequestAccessibility,
    },
    {
      id: "battery" as const,
      name: "Battery Optimization",
      status: permStates.battery,
      desc: "Required to prevent the system from killing background service.",
      code: "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
      icon: BatteryCharging,
      onAction: () => handleToggle("battery"),
    },
    {
      id: "location" as const,
      name: "Location",
      status: permStates.location,
      desc: "Required for weather and location-based queries.",
      code: "android.permission.ACCESS_FINE_LOCATION",
      icon: MapPin,
      onAction: handleRequestLocation,
    },
    {
      id: "camera" as const,
      name: "Camera",
      status: permStates.camera,
      desc: "Required for visual capabilities and scanning.",
      code: "android.permission.CAMERA",
      icon: Camera,
      onAction: handleRequestCamera,
    },
    {
      id: "storage" as const,
      name: "Storage / Media",
      status: permStates.storage,
      desc: "Required to save memories and files.",
      code: "android.permission.READ_MEDIA_AUDIO",
      icon: FolderArchive,
      onAction: () => handleToggle("storage"),
    },
    {
      id: "contacts" as const,
      name: "Contacts",
      status: permStates.contacts,
      desc: "Required to find contact names when calling or messaging.",
      code: "android.permission.READ_CONTACTS",
      icon: Users,
      onAction: () => handleToggle("contacts"),
    },
    {
      id: "phone" as const,
      name: "Phone",
      status: permStates.phone,
      desc: "Required to initiate phone calls directly via voice.",
      code: "android.permission.CALL_PHONE",
      icon: Phone,
      onAction: () => handleToggle("phone"),
    },
    {
      id: "sms" as const,
      name: "SMS (Send & Read)",
      status: permStates.sms,
      desc: "Required to send and read text messages via voice.",
      code: "android.permission.SEND_SMS",
      icon: MessageSquare,
      onAction: () => handleToggle("sms"),
    },
    {
      id: "notificationAccess" as const,
      name: "Notification Access",
      status: permStates.notificationAccess,
      desc: "Required to read incoming WhatsApp and social messages aloud.",
      code: "NOTIFICATION_LISTENER_SERVICE",
      icon: Radio,
      onAction: () => handleToggle("notificationAccess"),
    },
    {
      id: "defaultAssistant" as const,
      name: "Default Digital Assistant",
      status: permStates.defaultAssistant,
      desc: "Set MAYA as your phone's default voice assistant app.",
      code: "VOICE_INTERACTION_SERVICE",
      icon: Sparkles,
      onAction: () => handleToggle("defaultAssistant"),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0a1120] border border-cyan-500/30 rounded-3xl p-5 shadow-[0_12px_60px_rgba(6,182,212,0.25)] text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-black tracking-widest uppercase text-white">
              PERMISSIONS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Access Status Card */}
        <div className="p-3.5 rounded-2xl bg-[#0c1626] border border-cyan-500/30 flex items-center justify-between mb-3 shrink-0">
          <div>
            <div className="text-xs font-bold text-white">System Access Status</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {grantedCount} of 13 permissions granted
            </div>
          </div>
          <button
            onClick={() => MayaPhoneControlBridge.openAccessibilitySettings()}
            className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold"
          >
            Settings
          </button>
        </div>

        {/* Scrollable list */}
        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 py-1">
          {PERMISSION_ITEMS.map((item) => {
            return (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-[#0c1626] border border-white/10 flex items-center justify-between gap-2.5"
              >
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="text-xs font-bold text-white">{item.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${
                        item.status
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                      }`}
                    >
                      <span
                        className={`w-1 h-1 rounded-full ${
                          item.status ? "bg-emerald-400" : "bg-rose-400"
                        }`}
                      />
                      {item.status ? "Granted" : "Not Granted"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-tight">{item.desc}</p>
                  <p className="text-[9px] font-mono text-slate-500 mt-0.5 truncate">
                    {item.code}
                  </p>
                </div>

                <button
                  onClick={item.onAction}
                  className="w-9 h-9 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 active:scale-95 transition-all"
                  title={`Configure ${item.name}`}
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
