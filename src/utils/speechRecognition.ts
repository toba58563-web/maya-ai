/**
 * Continuous Speech Recognition Service for Maya
 * Provides continuous listening, auto-restart on timeout, wake-word detection,
 * speech interruption handling, and background resilience.
 */

// Types for Web Speech API
type SpeechRecognitionType = any;

export interface SpeechRecognitionEvents {
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onWakePhraseDetected?: () => void;
  onExitPhraseDetected?: () => void;
  onError?: (error: any) => void;
  onStatusChange?: (active: boolean) => void;
}

export class ContinuousSpeechRecognition {
  private recognition: SpeechRecognitionType | null = null;
  private isListening = false;
  private shouldKeepListening = false;
  private wakeWordEnabled = false;
  private isAssistantSpeaking = false;
  private callbacks: SpeechRecognitionEvents = {};
  private restartTimeout: any = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API is not supported in this browser.");
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.callbacks.onStatusChange?.(true);
      };

      this.recognition.onspeechstart = () => {
        this.callbacks.onSpeechStart?.();
      };

      this.recognition.onspeechend = () => {
        this.callbacks.onSpeechEnd?.();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptChunk;
          } else {
            interimTranscript += transcriptChunk;
          }
        }

        const currentSpeech = (finalTranscript || interimTranscript).trim();

        // 1. Interruption check: If user started talking while Maya is speaking, immediately interrupt!
        if (this.isAssistantSpeaking && currentSpeech.length > 1) {
          this.callbacks.onSpeechStart?.();
        }

        // 2. Interim transcript for live UI feedback
        if (interimTranscript) {
          this.callbacks.onInterimResult?.(interimTranscript);
        }

        // 3. Final transcript processing
        if (finalTranscript.trim()) {
          const cleaned = finalTranscript.trim();
          this.processRecognizedSpeech(cleaned);
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === "no-speech") {
          // Expected on quiet pauses, ignore and let continuous loop handle it
          return;
        }
        if (event.error === "not-allowed") {
          this.shouldKeepListening = false;
          this.isListening = false;
          this.callbacks.onError?.("Microphone permission denied");
          return;
        }
        console.warn("Speech recognition error:", event.error);
        this.callbacks.onError?.(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.callbacks.onStatusChange?.(false);

        // Auto-restart if session is meant to stay alive!
        if (this.shouldKeepListening) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.shouldKeepListening && !this.isListening) {
              try {
                this.recognition?.start();
              } catch (e) {
                // Ignore already started errors
              }
            }
          }, 200);
        }
      };
    } catch (e) {
      console.error("Failed to initialize SpeechRecognition:", e);
    }
  }

  private processRecognizedSpeech(rawTranscript: string) {
    const lower = rawTranscript.toLowerCase();

    // Check exit phrases
    const exitPhrases = [
      "stop assistant",
      "go offline",
      "exit",
      "goodbye maya",
      "goodbye",
      "bye maya",
      "stop listening",
      "turn off",
      "sleep now",
    ];

    const isExit = exitPhrases.some((phrase) => lower.includes(phrase));
    if (isExit) {
      this.callbacks.onExitPhraseDetected?.();
      return;
    }

    // If wake word is required
    if (this.wakeWordEnabled) {
      const wakePhrases = ["hey maya", "maya", "hi maya", "hello maya"];
      const matchesWake = wakePhrases.some((w) => lower.startsWith(w) || lower.includes(w));

      if (matchesWake) {
        this.callbacks.onWakePhraseDetected?.();
        // Strip the wake word prefix for the query if user continued speaking
        let cleaned = rawTranscript;
        for (const w of wakePhrases) {
          const regex = new RegExp(`^\\s*${w}[,\\s]*`, "i");
          cleaned = cleaned.replace(regex, "");
        }
        if (cleaned.trim()) {
          this.callbacks.onFinalResult?.(cleaned.trim());
        }
      }
      return;
    }

    // Direct mode: any speech is sent to Maya
    this.callbacks.onFinalResult?.(rawTranscript);
  }

  public setCallbacks(callbacks: SpeechRecognitionEvents) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public setAssistantSpeaking(speaking: boolean) {
    this.isAssistantSpeaking = speaking;
  }

  public setWakeWordEnabled(enabled: boolean) {
    this.wakeWordEnabled = enabled;
  }

  public async startListening(): Promise<boolean> {
    this.shouldKeepListening = true;
    if (!this.recognition) {
      this.initRecognition();
    }

    if (!this.recognition) {
      throw new Error("Speech Recognition not supported in this browser.");
    }

    try {
      // Prompt for microphone permission explicitly if needed
      await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!this.isListening) {
        this.recognition.start();
      }
      return true;
    } catch (err: any) {
      this.shouldKeepListening = false;
      this.isListening = false;
      throw err;
    }
  }

  public stopListening() {
    this.shouldKeepListening = false;
    clearTimeout(this.restartTimeout);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.isListening = false;
    this.callbacks.onStatusChange?.(false);
  }

  public isSessionActive(): boolean {
    return this.shouldKeepListening;
  }

  public isCurrentlyRecognizing(): boolean {
    return this.isListening;
  }
}

export const speechService = new ContinuousSpeechRecognition();
