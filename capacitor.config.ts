import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.maya.ai.assistant",
  appName: "Maya AI",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    backgroundColor: "#050814",
  },
  plugins: {
    // Custom plugin configuration
  },
};

export default config;
