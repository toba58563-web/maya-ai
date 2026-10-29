# Maya AI — Android APK & Phone Control Guide

## 📱 Architecture Overview

Maya AI is upgraded into a hybrid Android native application using **Capacitor + Kotlin Native Services**:

1. **`MayaAccessibilityService.kt`**:
   - Node-based Android automation (taps UI elements, scrolls up/down, types into text fields, inspects active window labels).
   - Safe stop execution controller (`requestStop()`) to prevent loops.
2. **`MayaFloatingOrbService.kt`**:
   - Draggable overlay orb using `SYSTEM_ALERT_WINDOW` permission.
   - Dynamic visual states: `LISTENING` (cyan), `THINKING` (violet), `EXECUTING` (amber), `SPEAKING` (magenta), `ERROR` (red).
   - Tap to bring Maya to foreground or stop actions.
3. **`MayaForegroundService.kt`**:
   - Foreground service with ongoing notification for persistent background operation.
4. **`MayaSecureStorage.kt`**:
   - EncryptedSharedPreferences backed by Android Keystore for secure local Gemini API key storage.
5. **`geminiDirectApi.ts`**:
   - Client-side direct Google Cloud Gemini API caller (Hindi/Hinglish/English voice understanding).
   - Operates completely standalone inside the APK without requiring an external hosted server!

---

## 🚀 Option 1: Automated APK Build via GitHub Actions (Recommended)

Because building a full Android APK requires JDK 17, Android SDK tools, and Gradle, the easiest and most reliable way is using the included **GitHub Actions** workflow:

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Upgrade Maya AI with Android APK & Phone Control"
   git push origin main
   ```
2. Go to your GitHub repository -> **Actions** tab.
3. The **"Build Maya AI Android APK"** workflow will automatically run.
4. Once completed (approx. 2-3 minutes), download the **`MayaAI-Debug-APK`** zip under **Artifacts** and install `app-debug.apk` directly on your Android phone!

---

## 🛠️ Option 2: Building via Termux on Android Phone

If you have Termux installed on your Android phone with `openjdk-17`, follow these steps:

### Step 1: Install Prerequisites in Termux
```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts git openjdk-17 -y
```

### Step 2: Clone & Build Web Assets
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd <REPO_NAME>
npm install
npm run build
npx cap sync android
```

### Step 3: Compile APK with Gradle
```bash
cd android
chmod +x gradlew
./gradlew assembleDebug
```

> **Note on Termux SDK**: If Gradle complains about missing Android SDK in Termux, install Android command-line tools via `pkg install android-tools` or use **Option 1 (GitHub Actions)** which provides the complete pre-configured Android SDK environment.

The compiled APK will be at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔐 Manual Android Permission Setup (Post-Installation)

Once installed on your Android device:

1. **Accessibility Service (Required for Phone Control)**:
   - Go to **Android Settings** -> **Accessibility** -> **Downloaded Apps**.
   - Tap **Maya AI Phone Assistant** and toggle **ON**.
2. **Display Over Other Apps (Required for Floating Orb)**:
   - Go to **Android Settings** -> **Apps** -> **Special App Access** -> **Display over other apps**.
   - Find **Maya AI** and toggle **Allow**.
3. **Microphone Permission**:
   - When launching the app, allow microphone access when prompted.
4. **Battery Optimization (Optional for continuous background)**:
   - Go to **App Info** -> **Battery** -> select **Unrestricted**.

---

## ⚙️ Setting Your Gemini API Key

1. Open Maya AI.
2. Tap the **API Key** card on the Home Screen (or navigate to **Settings** -> **Gemini API Key**).
3. Paste your free Google AI Studio Gemini API key (`AIzaSy...`).
4. Tap **Test Connection** to verify live connection, then tap **Save & Apply**.
5. The key is securely stored in Android Keystore and used directly for all voice and phone commands.
