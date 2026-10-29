import React, { useState } from "react";
import { Key, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ExternalLink, Trash2, X, ShieldCheck } from "lucide-react";

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

  const handleSave = () => {
    onSaveKey(inputVal.trim());
    setTestResult({
      status: "success",
      message: "API Key saved successfully! Zara is ready.",
    });
    setTimeout(() => {
      onClose();
    }, 1000);
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
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyToTest }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          status: "success",
          message: "Connection verified! Gemini model is responding.",
        });
      } else {
        setTestResult({
          status: "error",
          message: data.error || "Failed to connect with this key.",
        });
      }
    } catch (e: any) {
      setTestResult({
        status: "error",
        message: e.message || "Network test failed.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    setInputVal("");
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
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Gemini API Key
              {hasKey && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Ready
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Provide your personal Google Cloud Gemini key
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-200/90 mb-4 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Your API key is saved locally in your browser session. It directly unlocks Zara's real-time multimodal audio and chat.
          </p>
        </div>

        {/* Key Input */}
        <div className="space-y-1.5 mb-4">
          <label className="text-xs font-semibold text-slate-300 block">
            Enter API Key (starts with AIzaSy...)
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setTestResult({ status: "idle", message: "" });
              }}
              placeholder="AIzaSy..."
              className="w-full py-3 pl-3.5 pr-11 rounded-2xl bg-black/40 border border-white/15 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-sm font-mono text-white placeholder:text-slate-600 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Status Message */}
        {testResult.message && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs flex items-center gap-2 ${
              testResult.status === "success"
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                : testResult.status === "error"
                ? "bg-red-500/15 border border-red-500/30 text-red-300"
                : "bg-white/5 text-slate-300"
            }`}
          >
            {testResult.status === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
            {testResult.status === "error" && <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
            <span className="leading-snug">{testResult.message}</span>
          </div>
        )}

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={handleTestKey}
            disabled={isTesting || !inputVal.trim()}
            className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!inputVal.trim()}
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save & Apply</span>
          </button>
        </div>

        {/* Helper Links & Clear */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <span>Get free API key</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {hasKey && (
            <button
              onClick={handleClear}
              className="text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
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
