import { registerPlugin, Capacitor } from "@capacitor/core";

export interface InstalledApp {
  name: string;
  packageName: string;
}

export interface MayaPhoneAction {
  type: "launchApp" | "tap" | "scroll" | "typeText" | "readScreen" | "confirmAction";
  target?: string;
  packageName?: string;
  text?: string;
  direction?: "up" | "down";
  description?: string;
  isSensitive?: boolean;
}

export interface MayaPhoneControlPluginInterface {
  isAccessibilityEnabled(): Promise<{ enabled: boolean }>;
  openAccessibilitySettings(): Promise<void>;
  isOverlayPermissionGranted(): Promise<{ granted: boolean }>;
  requestOverlayPermission(): Promise<void>;
  showFloatingOrb(): Promise<{ success: boolean }>;
  hideFloatingOrb(): Promise<{ success: boolean }>;
  updateOrbState(options: { state: string }): Promise<void>;
  startForegroundService(): Promise<{ running: boolean }>;
  stopForegroundService(): Promise<{ running: boolean }>;
  launchApp(options: { packageName: string }): Promise<{ success: boolean }>;
  getInstalledApps(): Promise<{ apps: InstalledApp[] }>;
  performTap(options: { target: string }): Promise<{ success: boolean }>;
  performScroll(options: { direction: string }): Promise<{ success: boolean }>;
  enterText(options: { text: string; targetField?: string }): Promise<{ success: boolean }>;
  readScreen(): Promise<{ content: string[] }>;
  stopActions(): Promise<{ stopped: boolean }>;
  saveApiKey(options: { apiKey: string }): Promise<{ saved: boolean }>;
  getApiKey(): Promise<{ apiKey: string }>;
  clearApiKey(): Promise<{ cleared: boolean }>;
}

const MayaPhoneControl = registerPlugin<MayaPhoneControlPluginInterface>("MayaPhoneControl");

export class MayaPhoneControlBridge {
  public static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  public static async isAccessibilityEnabled(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const res = await MayaPhoneControl.isAccessibilityEnabled();
      return res.enabled;
    } catch {
      return false;
    }
  }

  public static async openAccessibilitySettings(): Promise<void> {
    if (this.isNative()) {
      await MayaPhoneControl.openAccessibilitySettings();
    }
  }

  public static async isOverlayPermissionGranted(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const res = await MayaPhoneControl.isOverlayPermissionGranted();
      return res.granted;
    } catch {
      return false;
    }
  }

  public static async requestOverlayPermission(): Promise<void> {
    if (this.isNative()) {
      await MayaPhoneControl.requestOverlayPermission();
    }
  }

  public static async setFloatingOrb(enable: boolean): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      if (enable) {
        const res = await MayaPhoneControl.showFloatingOrb();
        return res.success;
      } else {
        const res = await MayaPhoneControl.hideFloatingOrb();
        return res.success;
      }
    } catch (e) {
      console.warn("Floating orb error:", e);
      return false;
    }
  }

  public static async updateOrbVisual(
    state: "LISTENING" | "THINKING" | "EXECUTING" | "SPEAKING" | "ERROR" | "IDLE"
  ): Promise<void> {
    if (this.isNative()) {
      try {
        await MayaPhoneControl.updateOrbState({ state });
      } catch {}
    }
  }

  public static async launchApp(packageName: string): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`[Web Mode Simulated] Launching app: ${packageName}`);
      return true;
    }
    try {
      const res = await MayaPhoneControl.launchApp({ packageName });
      return res.success;
    } catch (e: any) {
      console.error("Launch app error:", e);
      return false;
    }
  }

  public static async getInstalledApps(): Promise<InstalledApp[]> {
    if (!this.isNative()) {
      return [
        { name: "WhatsApp", packageName: "com.whatsapp" },
        { name: "YouTube", packageName: "com.google.android.youtube" },
        { name: "Chrome", packageName: "com.android.chrome" },
        { name: "Google Maps", packageName: "com.google.android.apps.maps" },
        { name: "Settings", packageName: "com.android.settings" },
      ];
    }
    try {
      const res = await MayaPhoneControl.getInstalledApps();
      return res.apps || [];
    } catch {
      return [];
    }
  }

  public static async tap(target: string): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`[Web Mode Simulated] Tapping element: ${target}`);
      return true;
    }
    try {
      const res = await MayaPhoneControl.performTap({ target });
      return res.success;
    } catch (e: any) {
      console.error("Tap error:", e);
      return false;
    }
  }

  public static async scroll(direction: "up" | "down"): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`[Web Mode Simulated] Scrolling: ${direction}`);
      return true;
    }
    try {
      const res = await MayaPhoneControl.performScroll({ direction });
      return res.success;
    } catch (e: any) {
      console.error("Scroll error:", e);
      return false;
    }
  }

  public static async typeText(text: string, targetField?: string): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`[Web Mode Simulated] Typing text: ${text} into ${targetField || "focused field"}`);
      return true;
    }
    try {
      const res = await MayaPhoneControl.enterText({ text, targetField });
      return res.success;
    } catch (e: any) {
      console.error("Type text error:", e);
      return false;
    }
  }

  public static async readScreen(): Promise<string[]> {
    if (!this.isNative()) {
      return ["[Screen Content Simulated] Maya Home Screen, Search input, Play button"];
    }
    try {
      const res = await MayaPhoneControl.readScreen();
      return res.content || [];
    } catch {
      return [];
    }
  }

  public static async stop(): Promise<void> {
    if (this.isNative()) {
      try {
        await MayaPhoneControl.stopActions();
        await this.updateOrbVisual("IDLE");
      } catch {}
    }
  }

  public static async saveSecureKey(apiKey: string): Promise<void> {
    if (this.isNative()) {
      try {
        await MayaPhoneControl.saveApiKey({ apiKey });
      } catch {}
    }
  }

  public static async getSecureKey(): Promise<string> {
    if (this.isNative()) {
      try {
        const res = await MayaPhoneControl.getApiKey();
        return res.apiKey || "";
      } catch {
        return "";
      }
    }
    return "";
  }

  public static async clearApiKey(): Promise<void> {
    if (this.isNative()) {
      try {
        await MayaPhoneControl.clearApiKey();
      } catch {}
    }
  }

  public static async clearSecureKey(): Promise<void> {
    await this.clearApiKey();
  }
}
