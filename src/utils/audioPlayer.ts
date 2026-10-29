/**
 * Audio Player for Maya
 * Supports Gemini 24kHz PCM AudioBuffer playback and Web Speech API Synthesis fallback,
 * with real-time AnalyserNode integration for visualizer animations and instant interruption.
 */

export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying = false;
  private onPlaybackStateChange?: (playing: boolean) => void;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.initAudioContext();
    this.initVoices();
  }

  private initAudioContext() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx({ sampleRate: 24000 });
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
      }
    } catch (e) {
      console.warn("AudioContext init error:", e);
    }
  }

  private initVoices() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.cachedVoices = window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.cachedVoices = window.speechSynthesis.getVoices();
      };
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public setOnPlaybackStateChange(callback: (playing: boolean) => void) {
    this.onPlaybackStateChange = callback;
  }

  public async resume() {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      try {
        await this.audioCtx.resume();
      } catch {}
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.resume();
      } catch {}
    }
  }

  /**
   * Stop both Web Audio API source and Web Speech synthesis immediately
   */
  public stop() {
    this.isPlaying = false;
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {}
      this.currentSource = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.activeUtterance = null;

    this.onPlaybackStateChange?.(false);
  }

  /**
   * Play base64 encoded PCM 24000Hz audio buffer (from Gemini TTS)
   */
  public async playPcmBase64(base64: string): Promise<void> {
    this.stop();
    await this.resume();

    if (!this.audioCtx || !this.analyser) {
      throw new Error("AudioContext not ready");
    }

    const ctx = this.audioCtx;
    const analyser = this.analyser;

    return new Promise((resolve, reject) => {
      try {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Gemini TTS returns 16-bit linear PCM (little endian)
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }

        const buffer = ctx.createBuffer(1, float32Array.length, 24000);
        buffer.copyToChannel(float32Array, 0);

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        // Connect source -> analyser -> destination
        source.connect(analyser);
        analyser.connect(ctx.destination);

        this.currentSource = source;
        this.isPlaying = true;
        this.onPlaybackStateChange?.(true);

        source.onended = () => {
          if (this.currentSource === source) {
            this.isPlaying = false;
            this.currentSource = null;
            this.onPlaybackStateChange?.(false);
          }
          resolve();
        };

        source.start(0);
      } catch (err) {
        this.isPlaying = false;
        this.onPlaybackStateChange?.(false);
        reject(err);
      }
    });
  }

  /**
   * Speak using browser neural speech synthesis with natural female voice
   */
  public async speakBrowserTts(
    text: string,
    options: { pitch?: number; rate?: number; preferredVoiceName?: string } = {}
  ): Promise<void> {
    this.stop();

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return Promise.resolve();
    }

    await this.resume();

    return new Promise((resolve) => {
      // Small tick after cancel to ensure browser audio pipeline is cleared
      setTimeout(() => {
        try {
          // Clean clean text from emoticons or stage cues like *chuckles*
          const cleanText = text.replace(/\*[^*]+\*/g, "").trim();
          if (!cleanText) {
            this.isPlaying = false;
            this.onPlaybackStateChange?.(false);
            resolve();
            return;
          }

          const utterance = new SpeechSynthesisUtterance(cleanText);
          this.activeUtterance = utterance; // Prevent garbage collection in Chrome

          utterance.pitch = options.pitch ?? 1.15; // Slightly higher pitch for sweet female friend
          utterance.rate = options.rate ?? 1.0;

          const voices =
            this.cachedVoices.length > 0 ? this.cachedVoices : window.speechSynthesis.getVoices();

          let chosenVoice: SpeechSynthesisVoice | undefined;

          if (options.preferredVoiceName) {
            chosenVoice = voices.find((v) => v.name === options.preferredVoiceName);
          }

          if (!chosenVoice) {
            // Prioritize natural warm female voices across platforms
            const femaleVoiceNames = [
              "Google UK English Female",
              "Google US English",
              "Samantha",
              "Victoria",
              "Karen",
              "Moira",
              "Tessa",
              "Microsoft Jenny Online (Natural) - English (United States)",
              "Microsoft Zira - English (United States)",
              "Microsoft Aria Online (Natural) - English (United States)",
            ];

            for (const name of femaleVoiceNames) {
              const match = voices.find((v) =>
                v.name.toLowerCase().includes(name.toLowerCase())
              );
              if (match) {
                chosenVoice = match;
                break;
              }
            }
          }

          // If still not found, find any English voice with female hint or en-US
          if (!chosenVoice) {
            chosenVoice =
              voices.find(
                (v) =>
                  v.lang.startsWith("en") &&
                  (v.name.toLowerCase().includes("female") ||
                    v.name.toLowerCase().includes("girl"))
              ) ||
              voices.find((v) => v.lang.startsWith("en")) ||
              voices[0];
          }

          if (chosenVoice) {
            utterance.voice = chosenVoice;
          }

          utterance.onstart = () => {
            this.isPlaying = true;
            this.onPlaybackStateChange?.(true);
          };

          utterance.onend = () => {
            if (this.activeUtterance === utterance) {
              this.isPlaying = false;
              this.activeUtterance = null;
              this.onPlaybackStateChange?.(false);
            }
            resolve();
          };

          utterance.onerror = (e) => {
            // "interrupted" or "canceled" are standard user interruption events
            if (this.activeUtterance === utterance) {
              this.isPlaying = false;
              this.activeUtterance = null;
              this.onPlaybackStateChange?.(false);
            }
            resolve();
          };

          window.speechSynthesis.speak(utterance);
        } catch (e) {
          this.isPlaying = false;
          this.activeUtterance = null;
          this.onPlaybackStateChange?.(false);
          resolve();
        }
      }, 30);
    });
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
    return this.cachedVoices.length > 0 ? this.cachedVoices : window.speechSynthesis.getVoices();
  }
}

export const audioPlayer = new AudioPlayer();
