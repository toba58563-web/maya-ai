import { registerPlugin, Capacitor, PluginListenerHandle } from "@capacitor/core";

export interface InstalledApp {
  name: string;
  packageName: string;
}

export interface MayaPhoneAction {
  type:
    | "launchApp"
    | "tap"
    | "scroll"
    | "typeText"
    | "readScreen"
    | "confirmAction"
    | "playYouTube"
    | "autoSkipAd"
    | "call"
    | "sms"
    | "email"
    | "readNotifications"
    | "mediaControl"
    | "stop";
  target?: string;
  packageName?: string;
  appName?: string;
  text?: string;
  direction?: "up" | "down" | "left" | "right";
  description?: string;
  isSensitive?: boolean;
  query?: string;
  number?: string;
  message?: string;
  to?: string;
  subject?: string;
  body?: string;
  mediaCommand?: "play" | "pause" | "playPause" | "next" | "previous" | "volumeUp" | "volumeDown" | "mute";
}

export interface MayaPermissionsMap {
  microphone: boolean;
  notifications: boolean;
  overlay: boolean;
  accessibility: boolean;
  battery: boolean;
  location: boolean;
  camera: boolean;
  storage: boolean;
  contacts: boolean;
  phone: boolean;
  sms: boolean;
  notificationAccess: boolean;
  defaultAssistant: boolean;
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
  launchApp(options: { packageName?: string; appName?: string; target?: string }): Promise<{ success: boolean; packageName?: string; appName?: string }>;
  getInstalledApps(): Promise<{ apps: InstalledApp[] }>;
  performTap(options: { target: string }): Promise<{ success: boolean }>;
  performScroll(options: { direction: string }): Promise<{ success: boolean }>;
  enterText(options: { text: string; targetField?: string }): Promise<{ success: boolean }>;
  readScreen(): Promise<{ content: string[] }>;
  getScreenDetails(): Promise<{ success: boolean; packageName: string; elements: string[]; summary: string }>;
  stopActions(): Promise<{ stopped: boolean }>;
  saveApiKey(options: { apiKey: string }): Promise<{ saved: boolean }>;
  getApiKey(): Promise<{ apiKey: string }>;
  clearApiKey(): Promise<{ cleared: boolean }>;

  // Advanced Phone Control Capabilities
  playYouTube(options: { query: string }): Promise<{ success: boolean }>;
  autoSkipAd(): Promise<{ skipped: boolean }>;
  controlMedia(options: { command: string }): Promise<{ success: boolean; command?: string }>;
  makePhoneCall(options: { number: string }): Promise<{ success: boolean }>;
  sendSms(options: { number: string; message: string }): Promise<{ success: boolean; sentDirectly?: boolean }>;
  sendEmail(options: { to: string; subject: string; body: string }): Promise<{ success: boolean }>;
  getRecentNotifications(): Promise<{
    notifications: Array<{
      id: string;
      packageName: string;
      appName: string;
      title: string;
      text: string;
      time: string;
    }>;
  }>;

  // Native Audio Engine
  startAudioCapture(): Promise<{ success: boolean; alreadyRunning?: boolean; status?: string }>;
  stopAudioCapture(): Promise<{ success: boolean; status?: string }>;
  playAudioChunk(options: { data: string }): Promise<{ success: boolean; status?: string; bytesWritten?: number }>;
  stopAudioPlayback(): Promise<{ success: boolean; status?: string }>;
  getAudioStatus(): Promise<{ isRecording: boolean; isAudioTrackInitialized: boolean; audioTrackPlayState: number; sampleRate: number; status: string }>;
  getBackgroundServiceStatus(): Promise<{ running: boolean; status: string }>;
  startMayaService(): Promise<{ running: boolean }>;
  stopMayaService(): Promise<{ running: boolean }>;

  // Real Android System Permissions
  checkAllPermissions(): Promise<MayaPermissionsMap>;
  requestSystemPermission(options: { name: string }): Promise<{
    success: boolean;
    granted?: boolean;
    denied?: boolean;
    permanentlyDenied?: boolean;
    state?: string;
    openedSettings?: boolean;
  }>;
  openAppSettings(): Promise<{ success: boolean }>;

  // Listeners
  addListener(
    eventName: "audioInputChunk",
    listenerFunc: (data: { data: string }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "audioPlaybackState",
    listenerFunc: (data: { state: string; bytesWritten?: number; completed?: boolean; error?: string }) => void
  ): Promise<PluginListenerHandle>;
}

const MayaPhoneControl = registerPlugin<MayaPhoneControlPluginInterface>("MayaPhoneControl");

export class MayaPhoneControlBridge {
  private static audioChunkListener: PluginListenerHandle | null = null;
  private static playbackStateListener: PluginListenerHandle | null = null;

  public static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  // -------------------------------------------------------------
  // NATIVE AUDIO STREAMING (16kHz AudioRecord & 24kHz AudioTrack)
  // -------------------------------------------------------------
  public static async startAudioCapture(onChunk: (base64Chunk: string) => void): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      if (this.audioChunkListener) {
        await this.audioChunkListener.remove();
        this.audioChunkListener = null;
      }
      this.audioChunkListener = await MayaPhoneControl.addListener("audioInputChunk", (event) => {
        if (event && event.data) {
          onChunk(event.data);
        }
      });
      const res = await MayaPhoneControl.startAudioCapture();
      return res.success;
    } catch (e) {
      console.warn("Native startAudioCapture error:", e);
      return false;
    }
  }

  public static async stopAudioCapture(): Promise<void> {
    if (!this.isNative()) return;
    try {
      if (this.audioChunkListener) {
        await this.audioChunkListener.remove();
        this.audioChunkListener = null;
      }
      await MayaPhoneControl.stopAudioCapture();
    } catch (e) {
      console.warn("Native stopAudioCapture error:", e);
    }
  }

  public static async playAudioChunk(base64Pcm: string): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const res = await MayaPhoneControl.playAudioChunk({ data: base64Pcm });
      return res.success;
    } catch (e) {
      console.warn("Native playAudioChunk error:", e);
      return false;
    }
  }

  public static async stopAudioPlayback(): Promise<void> {
    if (!this.isNative()) return;
    try {
      await MayaPhoneControl.stopAudioPlayback();
    } catch (e) {
      console.warn("Native stopAudioPlayback error:", e);
    }
  }

  public static async onPlaybackStateChange(callback: (state: string) => void): Promise<PluginListenerHandle | null> {
    if (!this.isNative()) return null;
    try {
      if (this.playbackStateListener) {
        await this.playbackStateListener.remove();
        this.playbackStateListener = null;
      }
      this.playbackStateListener = await MayaPhoneControl.addListener("audioPlaybackState", (event) => {
        if (event && event.state) {
          callback(event.state);
        }
      });
      return this.playbackStateListener;
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------
  // REAL ANDROID PERMISSIONS
  // -------------------------------------------------------------
  public static async checkAllPermissions(): Promise<MayaPermissionsMap> {
    if (!this.isNative()) {
      // Browser fallback inspection
      let mic = true;
      let notif = false;
      let loc = false;
      if (typeof window !== "undefined") {
        if ("Notification" in window) notif = Notification.permission === "granted";
      }
      return {
        microphone: mic,
        notifications: notif,
        overlay: true,
        accessibility: true,
        battery: true,
        location: loc,
        camera: false,
        storage: true,
        contacts: false,
        phone: false,
        sms: false,
        notificationAccess: false,
        defaultAssistant: false,
      };
    }

    try {
      const res = await MayaPhoneControl.checkAllPermissions();
      return res;
    } catch (e) {
      console.warn("Native checkAllPermissions error:", e);
      return {
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
      };
    }
  }

  public static async requestSystemPermission(name: string): Promise<{
    success: boolean;
    granted: boolean;
    denied?: boolean;
    permanentlyDenied?: boolean;
    state?: string;
    openedSettings?: boolean;
  }> {
    if (!this.isNative()) {
      if (name === "microphone" && navigator.mediaDevices) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          return { success: true, granted: true, state: "granted" };
        } catch {
          return { success: false, granted: false, denied: true, state: "denied" };
        }
      }
      if (name === "notifications" && "Notification" in window) {
        const res = await Notification.requestPermission();
        const granted = res === "granted";
        return { success: granted, granted, state: res };
      }
      if (name === "location" && "geolocation" in navigator) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve({ success: true, granted: true, state: "granted" }),
            () => resolve({ success: false, granted: false, state: "denied" })
          );
        });
      }
      return { success: false, granted: false };
    }

    try {
      const res = await MayaPhoneControl.requestSystemPermission({ name });
      const isGranted = Boolean(res.granted || (res.success && res.state === "granted"));
      return {
        success: isGranted,
        granted: isGranted,
        denied: res.denied,
        permanentlyDenied: res.permanentlyDenied,
        state: res.state,
        openedSettings: res.openedSettings,
      };
    } catch (e) {
      console.warn(`requestSystemPermission(${name}) error:`, e);
      return { success: false, granted: false };
    }
  }

  public static async openAppSettings(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const res = await MayaPhoneControl.openAppSettings();
      return res.success;
    } catch (e) {
      console.warn("openAppSettings error:", e);
      return false;
    }
  }

  // -------------------------------------------------------------
  // ACCESSIBILITY & PHONE CONTROL
  // -------------------------------------------------------------
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

  public static async launchApp(appIdentifier: string): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`[Web Mode Simulated] Launching app: ${appIdentifier}`);
      return true;
    }
    try {
      const res = await MayaPhoneControl.launchApp({
        packageName: appIdentifier.includes(".") ? appIdentifier : undefined,
        appName: !appIdentifier.includes(".") ? appIdentifier : undefined,
        target: appIdentifier,
      });
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

  public static async scroll(direction: "up" | "down" | "left" | "right"): Promise<boolean> {
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

  public static async getScreenDetails(): Promise<{ packageName: string; elements: string[]; summary: string } | null> {
    if (!this.isNative()) {
      return {
        packageName: "com.maya.ai.assistant",
        elements: ["[Button] Start Listening", "[Input Field] Settings API Key"],
        summary: "Web preview active",
      };
    }
    try {
      const res = await MayaPhoneControl.getScreenDetails();
      return res;
    } catch (e: any) {
      console.warn("getScreenDetails error:", e);
      return null;
    }
  }

  public static async controlMedia(command: string): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`[Web Mode Simulated] Media control: ${command}`);
      return true;
    }
    try {
      const res = await MayaPhoneControl.controlMedia({ command });
      return res.success;
    } catch (e: any) {
      console.error("controlMedia error:", e);
      return false;
    }
  }

  // -------------------------------------------------------------
  // ADVANCED REAL PHONE CONTROLS (YouTube, Ads, Calls, SMS, Email, Notifs)
  // -------------------------------------------------------------
  public static async playYouTube(query: string): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`[Web Mode Simulated] Playing YouTube song: ${query}`);
      window.open(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        "_blank"
      );
      return true;
    }
    try {
      const res = await MayaPhoneControl.playYouTube({ query });
      return res.success;
    } catch (e: any) {
      console.error("playYouTube bridge error:", e);
      return false;
    }
  }

  public static async autoSkipAd(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const res = await MayaPhoneControl.autoSkipAd();
      return res.skipped;
    } catch {
      return false;
    }
  }

  public static async makePhoneCall(number: string): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`[Web Mode Simulated] Calling: ${number}`);
      window.location.href = `tel:${encodeURIComponent(number)}`;
      return true;
    }
    try {
      const res = await MayaPhoneControl.makePhoneCall({ number });
      return res.success;
    } catch (e: any) {
      console.error("makePhoneCall bridge error:", e);
      return false;
    }
  }

  public static async sendSms(number: string, message: string): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`[Web Mode Simulated] Sending SMS to ${number}: ${message}`);
      return true;
    }
    try {
      const res = await MayaPhoneControl.sendSms({ number, message });
      return res.success;
    } catch (e: any) {
      console.error("sendSms bridge error:", e);
      return false;
    }
  }

  public static async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    if (!this.isNative()) {
      console.log(`[Web Mode Simulated] Emailing ${to}: ${subject}`);
      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
      return true;
    }
    try {
      const res = await MayaPhoneControl.sendEmail({ to, subject, body });
      return res.success;
    } catch (e: any) {
      console.error("sendEmail bridge error:", e);
      return false;
    }
  }

  public static async getRecentNotifications(): Promise<
    Array<{
      id: string;
      packageName: string;
      appName: string;
      title: string;
      text: string;
      time: string;
    }>
  > {
    if (!this.isNative()) {
      return [
        {
          id: "1",
          packageName: "com.whatsapp",
          appName: "WhatsApp",
          title: "Rahul Sharma",
          text: "Hey, are you free for the meeting?",
          time: "10:30 AM",
        },
      ];
    }
    try {
      const res = await MayaPhoneControl.getRecentNotifications();
      return res.notifications || [];
    } catch (e: any) {
      console.warn("getRecentNotifications bridge error:", e);
      return [];
    }
  }

  public static async stop(): Promise<void> {
    if (this.isNative()) {
      try {
        await MayaPhoneControl.stopActions();
        await this.stopAudioCapture();
        await this.stopAudioPlayback();
        await this.stopForegroundService();
        await this.updateOrbVisual("IDLE");
      } catch {}
    }
  }

  public static async getAudioStatus(): Promise<{ isRecording: boolean; isAudioTrackInitialized: boolean; audioTrackPlayState: number; sampleRate: number; status: string }> {
    if (!this.isNative()) {
      return { isRecording: false, isAudioTrackInitialized: false, audioTrackPlayState: 0, sampleRate: 24000, status: "WEB" };
    }
    try {
      return await MayaPhoneControl.getAudioStatus();
    } catch {
      return { isRecording: false, isAudioTrackInitialized: false, audioTrackPlayState: 0, sampleRate: 24000, status: "ERROR" };
    }
  }

  public static async getBackgroundServiceStatus(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const res = await MayaPhoneControl.getBackgroundServiceStatus();
      return res.running;
    } catch {
      return false;
    }
  }

  public static async startForegroundService(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const res = await MayaPhoneControl.startForegroundService();
      return res.running;
    } catch (e) {
      console.warn("startForegroundService bridge error:", e);
      return false;
    }
  }

  public static async stopForegroundService(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const res = await MayaPhoneControl.stopForegroundService();
      return !res.running;
    } catch (e) {
      console.warn("stopForegroundService bridge error:", e);
      return false;
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
