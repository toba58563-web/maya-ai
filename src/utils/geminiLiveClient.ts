/**
 * Real-time Gemini Live Audio WebSocket Client
 * Connects directly to Google Cloud Gemini Live API (gemini-3.1-flash-live-preview)
 * Pure neural female voice: Aoede
 * No robot or phone device TTS.
 */

export interface GeminiLiveCallbacks {
  onAudioChunk?: (volume: number) => void;
  onTranscript?: (text: string) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onStatusChange?: (status: "connecting" | "ready" | "speaking" | "listening" | "disconnected") => void;
  onError?: (err: any) => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private scheduledTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private callbacks: GeminiLiveCallbacks = {};
  private isAssistantSpeaking = false;
  private isConnected = false;

  constructor() {
    this.initOutputAudio();
  }

  private initOutputAudio() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        // Output at 24,000Hz (exact rate of Gemini Live Aoede voice)
        this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });
        this.analyser = this.outputAudioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
      }
    } catch (e) {
      console.warn("Failed to init output AudioContext:", e);
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public setCallbacks(callbacks: GeminiLiveCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public async connect(
    apiKey?: string,
    voiceName?: string,
    personality?: string
  ): Promise<void> {
    this.disconnect();

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const params = new URLSearchParams();
    if (apiKey) params.set("apiKey", apiKey);
    if (voiceName) params.set("voice", voiceName);
    if (personality) params.set("personality", personality);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const wsUrl = `${protocol}//${window.location.host}/live${qs}`;

    this.callbacks.onStatusChange?.("connecting");

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = async () => {
          this.isConnected = true;
          this.callbacks.onStatusChange?.("listening");

          if (apiKey) {
            this.ws?.send(JSON.stringify({ type: "init", apiKey }));
          }

          // Start continuous microphone audio streaming to Gemini
          try {
            await this.startMicCapture();
            resolve();
          } catch (micErr) {
            reject(micErr);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "ready") {
              this.callbacks.onStatusChange?.("ready");
              return;
            }

            if (data.type === "interrupted" || data.interrupted) {
              this.stopPlayback();
              this.callbacks.onInterrupted?.();
              this.callbacks.onStatusChange?.("listening");
              return;
            }

            if (data.audio) {
              this.playAudioChunk(data.audio);
              if (!this.isAssistantSpeaking) {
                this.isAssistantSpeaking = true;
                this.callbacks.onStatusChange?.("speaking");
              }
            }

            if (data.text) {
              this.callbacks.onTranscript?.(data.text);
            }

            if (data.type === "turnComplete" || data.turnComplete) {
              this.callbacks.onTurnComplete?.();
            }

            if (data.type === "error" || data.error) {
              console.warn("Gemini Live notice:", data.error);
              this.callbacks.onError?.(data.error);
            }
          } catch (e) {
            console.error("Error parsing Live WS message:", e);
          }
        };

        this.ws.onerror = (e) => {
          console.warn("Gemini Live WebSocket error:", e);
          this.callbacks.onError?.(e);
          reject(e);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.callbacks.onStatusChange?.("disconnected");
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private async startMicCapture() {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
    if (this.inputAudioCtx.state === "suspended") {
      await this.inputAudioCtx.resume();
    }

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const source = this.inputAudioCtx.createMediaStreamSource(this.micStream);
    this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioCtx.destination);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const float32 = e.inputBuffer.getChannelData(0);

      // Check mic energy to detect active speech
      let sum = 0;
      for (let i = 0; i < float32.length; i++) {
        sum += float32[i] * float32[i];
      }
      const rms = Math.sqrt(sum / float32.length);

      // User interrupt trigger if user starts talking over Maya
      if (rms > 0.05 && this.isAssistantSpeaking) {
        this.stopPlayback();
        this.callbacks.onInterrupted?.();
      }

      // Convert Float32 to 16-bit linear PCM little-endian
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      const uint8 = new Uint8Array(int16.buffer);
      let binary = "";
      const len = uint8.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);

      this.ws.send(JSON.stringify({ audio: base64 }));
    };
  }

  /**
   * Schedule seamless playback of incoming 24kHz PCM chunks from Aoede voice
   */
  private playAudioChunk(base64: string) {
    if (!this.outputAudioCtx || !this.analyser) {
      this.initOutputAudio();
    }
    if (!this.outputAudioCtx || !this.analyser) return;

    if (this.outputAudioCtx.state === "suspended") {
      this.outputAudioCtx.resume();
    }

    try {
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const buffer = this.outputAudioCtx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = buffer;

      // Connect source -> analyser -> destination
      source.connect(this.analyser);
      this.analyser.connect(this.outputAudioCtx.destination);

      const now = this.outputAudioCtx.currentTime;
      if (this.scheduledTime < now) {
        this.scheduledTime = now + 0.015;
      }

      source.start(this.scheduledTime);
      this.scheduledTime += buffer.duration;

      this.activeSources.push(source);

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0) {
          this.isAssistantSpeaking = false;
          this.callbacks.onStatusChange?.("listening");
        }
      };
    } catch (e) {
      console.warn("Error playing live audio chunk:", e);
    }
  }

  /**
   * Immediately abort all active and queued audio sources
   */
  public stopPlayback() {
    this.isAssistantSpeaking = false;
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.scheduledTime = this.outputAudioCtx.currentTime;
    }
  }

  /**
   * Send a text message to Gemini Live (e.g. for initial greeting or quick prompts)
   */
  public sendTextMessage(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ text }));
    }
  }

  public disconnect() {
    this.stopPlayback();

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }

    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((t) => t.stop());
      } catch {}
      this.micStream = null;
    }

    if (this.inputAudioCtx && this.inputAudioCtx.state !== "closed") {
      try {
        this.inputAudioCtx.close();
      } catch {}
      this.inputAudioCtx = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.isConnected = false;
    this.callbacks.onStatusChange?.("disconnected");
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getIsSpeaking(): boolean {
    return this.isAssistantSpeaking;
  }
}

export const geminiLive = new GeminiLiveClient();
