import React, { useState } from "react";
import { Key, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ExternalLink, Trash2, X, ShieldCheck } from "lucide-react";
import { ApiKeyManager } from "../utils/apiKeyManager";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveKey: (key: string) => void;
  onClearKey: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveKey,
  onClearKey,
}) => {
  const [inputVal, setInputVal] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: "idle" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setTestResult({
        status: "error",
        message: "Please enter an API key.",
      });
      return;
    }

    onSaveKey(trimmed);
    setIsTesting(true);
    setTestResult({ status: "idle", message: "" });

    try {
      const state = await ApiKeyManager.testKey(trimmed);
      if (state.status === "connected") {
        setTestResult({
          status: "success",
          message: "API Key verified & saved! Maya is ready to talk.",
        });
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setTestResult({
          status: "error",
          message: state.errorMessage || "API key saved, but verification failed.",
        });
      }
    } catch {
      setTestResult({
        status: "success",
        message: "API key saved to device storage.",
      });
      setTimeout(() => {
        onClose();
      }, 800);
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestKey = async () => {
    const keyToTest = inputVal.trim() || apiKey.trim();
    if (!keyToTest) {
      setTestResult({
        status: "error",
        message: "Please enter an API key to test.",
      });
      return;
    }

    setIsTesting(true);
    setTestResult({ status: "idle", message: "" });

    try {
      const state = await ApiKeyManager.testKey(keyToTest);
      if (state.status === "connected") {
        setTestResult({
          status: "success",
          message: "Connection verified! Google Gemini is connected and active.",
        });
      } else {
        setTestResult({
          status: "error",
          message: state.errorMessage || "Connection failed. Please check your key at aistudio.google.com",
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    setInputVal("");
    ApiKeyManager.clear();
    onClearKey();
    setTestResult({
      status: "idle",
      message: "API key removed from device storage.",
    });
  };

  const hasKey = Boolean(apiKey.trim() || inputVal.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0a1020] border border-cyan-500/30 rounded-3xl p-6 shadow-[0_10px_50px_rgba(6,182,212,0.25)] text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Gemini API Key
              </h2>
              {hasKey && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Configured
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Provide your personal Google Cloud Gemini key
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="mb-4 p-3 rounded-2xl bg-[#0f172a] border border-white/10 text-xs text-slate-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            Your API key is saved locally in your device's Android Keystore / storage. It unlocks Maya's real-time multimodal audio, voice-to-voice conversation, and phone commands.
          </p>
        </div>

        {/* Input Field */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Enter API Key (starts with AIzaSy...)
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Paste your Gemini API key here"
              className="w-full px-4 py-3 bg-[#060a14] border border-white/15 focus:border-cyan-400 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors pr-10 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Test Result Message */}
        {testResult.message && (
          <div
            className={`mb-4 p-3 rounded-2xl border text-xs flex items-center gap-2 ${
              testResult.status === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : testResult.status === "error"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-white/5 border-white/10 text-slate-300"
            }`}
          >
            {testResult.status === "success" && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            {testResult.status === "error" && (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={handleTestKey}
            disabled={isTesting || !inputVal.trim()}
            className="py-2.5 px-3 rounded-2xl border border-white/15 hover:border-cyan-400/50 hover:bg-cyan-500/10 text-xs font-semibold text-cyan-300 flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!inputVal.trim()}
            className="py-2.5 px-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-cyan-500/25 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save & Apply</span>
          </button>
        </div>

        {/* Footer Links */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>Get free API key</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {hasKey && (
            <button
              type="button"
              onClick={handleClear}
              className="text-rose-400 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear key</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
