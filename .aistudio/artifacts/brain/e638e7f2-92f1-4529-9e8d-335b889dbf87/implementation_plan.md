# Maya AI — Complete Functionality Repair & Production Upgrade

## 1. Executive Summary & Root Cause Analysis

From inspecting the codebase, the screen recording, and the user's report, here are the real root causes identified across the application:

1. **Fake API Key "Connected" Status on Home Screen**:
   - *Root Cause*: `src/components/HomeScreen.tsx` line 59 had `const isKeyConfigured = true;` hardcoded.
   - *Fix*: Implement a dedicated `apiKeyStatus` model (`"missing" | "unverified" | "connected" | "failed"`) bound to the user's actual stored key and real API test results in `MayaSecureStorage` / `localStorage`.

2. **No Real Voice Input (Microphone Failure in APK)**:
   - *Root Cause*: The APK relies on WebView `getUserMedia` / Web Audio `ScriptProcessorNode` at 16kHz, which is frequently blocked or suspended by Android WebView security policy, battery optimization, or missing native audio routing.
   - *Fix*: Implement native Android `AudioRecord` in `MayaPhoneControlPlugin.kt` capturing 16kHz, 16-bit mono PCM, streaming base64 chunks directly to the Gemini Live session, with WebView Web Audio as browser fallback.

3. **No Audible Voice Output (Silent Playback in APK)**:
   - *Root Cause*: Returning 24kHz PCM from Gemini was either not arriving (due to local proxy failure) or fed to a suspended browser `AudioContext`.
   - *Fix*: Implement high-performance native `AudioTrack` in `MayaPhoneControlPlugin.kt` operating at 24,000Hz (exact sample rate of Gemini Live Aoede voice) streaming PCM directly to the Android phone speaker.

4. **Standalone APK Direct Cloud Connection**:
   - *Root Cause*: In a standalone APK built via Termux, no local Node.js server (`http://localhost:3000`) is running. Previous calls to `/api/chat` or `/live` returned HTML or failed.
   - *Fix*: In standalone APK mode (Capacitor native), connect directly to Google Cloud Gemini WebSocket (`wss://generativelanguage.googleapis.com/ws/...`) and REST endpoints using the user's verified API key, while preserving server proxy fallback for browser mode.

5. **Voice & Personality Not Applied**:
   - *Root Cause*: Voice and Personality selections in Settings were saved in transient state but not propagated to the active Gemini Live `speechConfig` or system instructions.
   - *Fix*: Update the Gemini Live connection and prompt builder to dynamically inject the user's selected Voice (`Aoede`, `Charon`, `Kore`, `Fenrir`, `Puck`, `Leda`, `Orus`, `Zephyr`) and Personality mode (`Girlfriend Mode`, `Assistant Mode`, `Professional Mode`) into system instructions and speech config.

6. **Permissions Showing Inaccurate States**:
   - *Root Cause*: Permission items were using simulated state or browser-only APIs (`navigator.permissions.query`) that fail in Android WebView.
   - *Fix*: Implement true Android permission inspection methods in `MayaPhoneControlPlugin.kt` using `ContextCompat.checkSelfPermission`, `Settings.canDrawOverlays`, `isIgnoringBatteryOptimizations`, and `isAccessibilityServiceEnabled` for all 13 permissions.

---

## 2. Architecture & Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ANDROID DEVICE (STANDALONE APK)                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────────────┐                 ┌────────────────────────┐  │
│   │   Microphone        │                 │     Phone Speaker      │  │
│   │   (Physical Mic)    │                 │   (Physical Speaker)   │  │
│   └──────────┬──────────┘                 └───────────▲────────────┘  │
│              │                                        │                │
│              ▼ (16kHz PCM)                            │ (24kHz PCM)    │
│   ┌─────────────────────┐                 ┌───────────┴────────────┐  │
│   │  AudioRecord        │                 │      AudioTrack        │  │
│   │  (Native Kotlin)    │                 │    (Native Kotlin)     │  │
│   └──────────┬──────────┘                 └───────────▲────────────┘  │
│              │                                        │                │
│              ▼                                        │                │
│   ┌───────────────────────────────────────────────────┴────────────┐  │
│   │        MayaPhoneControlPlugin.kt (Capacitor Native Bridge)     │  │
│   │  - AudioRecord streaming (start/stopAudioCapture)              │  │
│   │  - AudioTrack streaming (playAudioChunk, stopAudioPlayback)    │  │
│   │  - Real Permission checks for 13 Android system permissions    │  │
│   │  - MayaAccessibilityService & Floating Orb integration         │  │
│   │  - Android Keystore EncryptedSharedPreferences (SecureStorage) │  │
│   └──────────┬────────────────────────────────────────▲────────────┘  │
│              │                                        │                │
│              ▼ (Bridge Events)                        │                │
│   ┌───────────────────────────────────────────────────┴────────────┐  │
│   │          Maya AI Frontend (React + TypeScript + Vite)          │  │
│   │                                                                │  │
│   │  - HomeScreen: RGB Visualizer Orb, Dynamic Weather, Real Key   │  │
│   │  - SettingsScreen: Model, Voice (8), Personality (3), WakeWord │  │
│   │  - PermissionsScreen: Live verification for 13 permissions     │  │
│   │  - geminiLiveClient.ts: Dual-mode connection (Direct & Proxy)  │  │
│   └──────────────────────┬────────────────────────────▲────────────┘  │
│                          │                            │                │
└──────────────────────────┼────────────────────────────┼────────────────┘
                           │                            │
                           │ WSS / REST                 │
                           ▼                            │
             ┌──────────────────────────────────────────┴─┐
             │       Google Cloud Gemini Live API         │
             │   - Model: gemini-3.8-live / flash-lite    │
             │   - Voice: Aoede, Charon, Kore, etc.       │
             │   - Speech: 24kHz PCM Stream Output        │
             │   - Real-time Hindi, Hinglish, English     │
             └────────────────────────────────────────────┘
```

---

## 3. Detailed Component Repairs

### 1. Gemini API Key & Connection Status
- **State Definition**:
  - `missing`: No key entered. Home screen card shows red badge `API Key Missing`, tapping prompts user to open Settings. Voice call cannot start.
  - `unverified`: Key entered but not tested against Gemini. Yellow badge `Not Verified`.
  - `connected`: Tested with live `ping` request to Gemini 2.5/3.8 Flash, returned 200 OK. Green badge `Connected`. Stored with timestamp and verified key hash.
  - `failed`: Test request returned error (quota, invalid key, network). Red badge `Connection Failed` with actual error message.
- **Settings Screen Actions**:
  - Gemini API key input with show/hide password toggle.
  - `Paste from clipboard` button (`navigator.clipboard.readText()`).
  - `Test Connection` button making an actual request to Gemini.
  - `Clear API Key` button resetting state immediately to `missing`.

### 2. Native Audio Pipeline (16kHz Input & 24kHz Output)
- **Native AudioRecord (`MayaPhoneControlPlugin.kt`)**:
  - Sample Rate: 16,000 Hz, Channel: Mono, Format: 16-bit PCM.
  - Background thread reading buffer of 2048 shorts, encoding to base64, emitting `onAudioInputChunk` event to Capacitor bridge.
  - Proper start/stop lifecycle ensuring microphone resources are released when user stops Maya.
- **Native AudioTrack (`MayaPhoneControlPlugin.kt`)**:
  - Sample Rate: 24,000 Hz (Gemini Live standard), Channel: Mono, AudioTrack streaming mode in `AudioTrack.MODE_STREAM`.
  - Receives base64 PCM chunks from Gemini Live, decodes to byte array, writes to AudioTrack.
  - Interruption handler (`stopAudioPlayback`) clears buffers immediately so Maya stops speaking when user speaks or taps Stop.

### 3. Standalone Direct Cloud WebSocket + Browser Proxy Dual Mode
- In `geminiLiveClient.ts`:
  - Detect if running inside Capacitor (`MayaPhoneControlBridge.isNative()`).
  - If native: connect directly to Google's official Gemini Live WebSocket (`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=...`).
  - If web browser: connect to `/live` on the Node.js server.
  - Sends setup frame with chosen model, voice (`Aoede`, etc.), and system instructions tailored to the chosen personality (`Girlfriend Mode`, `Assistant Mode`, etc.).

### 4. Real Android Permissions Engine
- Implement comprehensive native check and request methods in `MayaPhoneControlPlugin.kt`:
  1. `android.permission.RECORD_AUDIO`: `ContextCompat.checkSelfPermission`
  2. `android.permission.POST_NOTIFICATIONS`: `NotificationManagerCompat.areNotificationsEnabled`
  3. `android.permission.SYSTEM_ALERT_WINDOW`: `Settings.canDrawOverlays`
  4. `ACCESSIBILITY_SERVICE`: `MayaAccessibilityService.isServiceRunning`
  5. `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`: `PowerManager.isIgnoringBatteryOptimizations`
  6. `android.permission.ACCESS_FINE_LOCATION`: `ContextCompat.checkSelfPermission`
  7. `android.permission.CAMERA`: `ContextCompat.checkSelfPermission`
  8. `android.permission.READ_MEDIA_AUDIO`: `ContextCompat.checkSelfPermission`
  9. `android.permission.READ_CONTACTS`: `ContextCompat.checkSelfPermission`
  10. `android.permission.CALL_PHONE`: `ContextCompat.checkSelfPermission`
  11. `android.permission.SEND_SMS`: `ContextCompat.checkSelfPermission`
  12. `NOTIFICATION_LISTENER_SERVICE`: `NotificationManagerCompat.getEnabledListenerPackages`
  13. `VOICE_INTERACTION_SERVICE`: Checks default assistant role or setting.
- In `AndroidManifest.xml`, declare all required permissions so Android permits requesting them.

### 5. Persistent Settings & Personality Application
- Use `Preferences` / `localStorage` + `MayaSecureStorage` (Keystore) to ensure settings never vanish on app restart.
- Inject active `personality` and `voice` directly into:
  - Gemini Live setup frame
  - `/api/chat` and direct command prompts
  - Fallback text-to-speech configuration
- Supported voices: `Aoede`, `Charon`, `Kore`, `Fenrir`, `Puck`, `Leda`, `Orus`, `Zephyr`.
- Supported personalities: `Girlfriend Mode`, `Assistant Mode`, `Professional Mode`.

---

## 4. Verification & Testing Strategy

1. **API Key Verification**:
   - Clear key -> Home screen immediately displays `API Key Missing`. Starting Maya prompts to enter key.
   - Enter invalid key and test -> Connection fails with clear message.
   - Enter valid key and test -> Live ping succeeds -> Home screen updates to `Connected`.
2. **Audio Input & Output Pipeline**:
   - Test mic permission request -> Grant mic -> AudioRecord starts streaming 16kHz PCM.
   - Verify Gemini Live returns 24kHz audio chunks -> AudioTrack plays aloud through phone speaker.
3. **Voice & Personality Persistence**:
   - Switch voice to `Fenrir` or `Aoede` -> Verify Gemini Live connects with the requested voice name.
   - Switch to `Girlfriend Mode` -> Verify spoken response uses warm Hinglish companion tone.
   - Restart app -> Settings reload accurately from storage.
4. **Permissions Verification**:
   - Open Permissions Hub -> True Android statuses reflect accurately.
   - Tap Gear on Accessibility / Overlay -> Android system settings open -> Returning to app auto-refreshes state.
5. **Compilation & Build**:
   - Run `tsc --noEmit` -> Zero errors.
   - Run `npm run build && npx cap sync android`.
   - Verify Kotlin compiles cleanly for Termux / GitHub Actions.
