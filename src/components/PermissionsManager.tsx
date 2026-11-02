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
import { MayaPhoneControlBridge, MayaPermissionsMap } from "../utils/mayaPhoneControl";

interface PermissionsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PermissionsManager: React.FC<PermissionsManagerProps> = ({
  isOpen,
  onClose,
}) => {
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

  const refreshPermissions = async () => {
    try {
      const perms = await MayaPhoneControlBridge.checkAllPermissions();
      setPermStates(perms);
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

  const handleRequestPermission = async (id: string) => {
    await MayaPhoneControlBridge.requestSystemPermission(id);
    setTimeout(refreshPermissions, 1200);
  };

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
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
            className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold cursor-pointer"
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
                  onClick={() => handleRequestPermission(item.id)}
                  className="w-9 h-9 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 active:scale-95 transition-all cursor-pointer"
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
