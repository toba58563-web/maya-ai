/**
 * Maya AI — Real Gemini API Key Manager & Connection Verifier
 * Prevents false "Connected" statuses and verifies keys with real Google Cloud Gemini API requests.
 */

export type ApiKeyConnectionStatus = "missing" | "unverified" | "connected" | "failed";

export interface ApiKeyVerificationState {
  status: ApiKeyConnectionStatus;
  errorMessage?: string;
  verifiedKey?: string;
  timestamp?: number;
}

const STORAGE_KEY = "maya_api_key_verification_v2";

export class ApiKeyManager {
  public static getStoredVerification(): ApiKeyVerificationState {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
    return { status: "missing" };
  }

  public static saveVerification(state: ApiKeyVerificationState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }

  /**
   * Determine current status based on actual key value and stored test
   */
  public static getCurrentStatus(currentKey: string): ApiKeyVerificationState {
    const trimmed = currentKey.trim();
    if (!trimmed) {
      return { status: "missing" };
    }

    const stored = this.getStoredVerification();
    if (stored.verifiedKey === trimmed && stored.status === "connected") {
      return stored;
    }

    if (stored.verifiedKey === trimmed && stored.status === "failed") {
      return stored;
    }

    return { status: "unverified", verifiedKey: trimmed };
  }

  /**
   * Test connection with a real Gemini request (direct Google Cloud REST or server proxy)
   */
  public static async testKey(keyToTest: string): Promise<ApiKeyVerificationState> {
    const trimmed = keyToTest.trim();
    if (!trimmed) {
      const state: ApiKeyVerificationState = {
        status: "missing",
        errorMessage: "API key is required. Please enter your Gemini key.",
      };
      this.saveVerification(state);
      return state;
    }

    // 1. Try local server test endpoint if available (Web mode)
    try {
      const localRes = await fetch("/api/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      if (localRes.ok) {
        const localData = await localRes.json();
        if (localData.success) {
          const state: ApiKeyVerificationState = {
            status: "connected",
            verifiedKey: trimmed,
            timestamp: Date.now(),
          };
          this.saveVerification(state);
          return state;
        }
      }
    } catch {
      // Continue to direct Google Cloud test (e.g. standalone APK on phone)
    }

    // 2. Direct Google Cloud Models List Verification (Standard Google Cloud Gemini API check)
    try {
      const modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
        trimmed
      )}`;

      const modelsRes = await fetch(modelsUrl);
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        if (modelsData && (Array.isArray(modelsData.models) || modelsData.models)) {
          const state: ApiKeyVerificationState = {
            status: "connected",
            verifiedKey: trimmed,
            timestamp: Date.now(),
          };
          this.saveVerification(state);
          return state;
        }
      } else {
        const errJson = await modelsRes.json().catch(() => null);
        if (errJson?.error?.message?.toLowerCase().includes("api key not valid")) {
          const state: ApiKeyVerificationState = {
            status: "failed",
            errorMessage: "Invalid API key. Please check your Google AI Studio key.",
            verifiedKey: trimmed,
            timestamp: Date.now(),
          };
          this.saveVerification(state);
          return state;
        }
      }
    } catch (modelsErr) {
      console.warn("Direct models list check skipped:", modelsErr);
    }

    // 3. Direct Google Cloud GenerateContent Ping (gemini-2.0-flash / gemini-1.5-flash)
    for (const testModel of ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"]) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${encodeURIComponent(
          trimmed
        )}`;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "hi" }] }],
          }),
        });

        const data = await res.json();
        if (res.ok && data.candidates) {
          const state: ApiKeyVerificationState = {
            status: "connected",
            verifiedKey: trimmed,
            timestamp: Date.now(),
          };
          this.saveVerification(state);
          return state;
        }

        if (data?.error?.message?.toLowerCase().includes("api key not valid")) {
          const state: ApiKeyVerificationState = {
            status: "failed",
            errorMessage: data.error.message,
            verifiedKey: trimmed,
            timestamp: Date.now(),
          };
          this.saveVerification(state);
          return state;
        }
      } catch (genErr) {
        console.warn(`Direct ping with ${testModel} failed:`, genErr);
      }
    }

    // Fallback: If network allowed but key was rejected
    const state: ApiKeyVerificationState = {
      status: "failed",
      errorMessage: "Could not verify API key. Please verify internet connection or key validity.",
      verifiedKey: trimmed,
      timestamp: Date.now(),
    };
    this.saveVerification(state);
    return state;
  }

  public static clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("maya_api_key");
    } catch {}
  }
}
