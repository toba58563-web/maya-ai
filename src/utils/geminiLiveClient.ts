/**
 * Real-time Gemini Live Audio WebSocket Client
 * 
 * 9-State Connection Machine:
 * "connecting" -> "waiting_setup" -> "ready" -> "listening" <-> "thinking" <-> "speaking"
 * Failures / LifeCycle: "reconnecting" | "error" | "disconnected"
 * 
 * Features:
 * 1. 12-second handshake timeout (terminates socket if setupComplete not received).
 * 2. Strict setup handshake: Audio capture starts ONLY AFTER setupComplete is acknowledged.
 * 3. Native Audio streaming: 16kHz AudioRecord capture and 24kHz AudioTrack output.
 * 4. Multi-part chunk queueing: Loops all modelTurn parts without dropping/overwriting chunks.
 * 5. PCM RMS Barge-in: Energy calculation on 16-bit PCM for robust voice activity detection.
 * 6. Playback state tracking: Native audioPlaybackState listener ensures speaking state persists until hardware playback completes.
 */

import { MayaPhoneControlBridge } from "./mayaPhoneControl";

export type GeminiLiveStatus =
  | "connecting"
  | "waiting_setup"
  | "ready"
  | "listening"
  | "thinking"
  | "speaking"
  | "reconnecting"
  | "error"
  | "disconnected";

export interface GeminiLiveCallbacks {
  onAudioChunk?: (volume: number) => void;
  onTranscript?: (text: string) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onStatusChange?: (status: GeminiLiveStatus) => void;
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
  private currentStatus: GeminiLiveStatus = "disconnected";
  private isAssistantSpeaking = false;
  private isConnected = false;
  private isDirectGoogleCloud = false;

  // Handshake timeout & promise controllers
  private handshakeTimer: any = null;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((err: any) => void) | null = null;

  // VAD / Barge-in consecutive loud frames
  private consecutiveLoudFrames = 0;
  private speakingStartTime = 0;

  // Playback listener handle
  private playbackListenerHandle: any = null;

  constructor() {
    this.initOutputAudio();
    this.initNativePlaybackListener();
  }

  private initOutputAudio() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });
        this.analyser = this.outputAudioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
      }
    } catch (e) {
      console.warn("Failed to init output AudioContext:", e);
    }
  }

  private async initNativePlaybackListener() {
    if (MayaPhoneControlBridge.isNative()) {
      this.playbackListenerHandle = await MayaPhoneControlBridge.onPlaybackStateChange((nativeState) => {
        if (nativeState === "stopped" || nativeState === "idle" || nativeState === "completed") {
          if (this.isAssistantSpeaking) {
            this.isAssistantSpeaking = false;
            this.setStatus("listening");
          }
        } else if (nativeState === "playing") {
          if (!this.isAssistantSpeaking) {
            this.isAssistantSpeaking = true;
            this.setStatus("speaking");
          }
        }
      });
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getStatus(): GeminiLiveStatus {
    return this.currentStatus;
  }

  private setStatus(status: GeminiLiveStatus) {
    this.currentStatus = status;
    this.callbacks.onStatusChange?.(status);
  }

  public setCallbacks(callbacks: GeminiLiveCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public async connect(
    apiKey?: string,
    voiceName: string = "Aoede",
    personality: string = "Girlfriend Mode"
  ): Promise<void> {
    this.disconnect();

    const isNative = MayaPhoneControlBridge.isNative();
    const keyToUse = apiKey?.trim();

    let wsUrl = "";
    if (isNative && keyToUse) {
      // Standalone APK mode: Connect directly to official Google Cloud Gemini Live WebSocket
      this.isDirectGoogleCloud = true;
      wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(
        keyToUse
      )}`;
    } else {
      // Web browser / Server proxy mode
      this.isDirectGoogleCloud = false;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const params = new URLSearchParams();
      if (keyToUse) params.set("apiKey", keyToUse);
      params.set("voice", voiceName);
      params.set("personality", personality);

      const qs = params.toString() ? `?${params.toString()}` : "";
      wsUrl = `${protocol}//${window.location.host}/live${qs}`;
    }

    this.setStatus("connecting");

    return new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;

      // 12-second handshake timeout
      this.clearHandshakeTimer();
      this.handshakeTimer = setTimeout(() => {
        if (this.currentStatus === "connecting" || this.currentStatus === "waiting_setup") {
          const timeoutErr = new Error("Gemini Live connection timed out waiting for setup handshake (12s).");
          console.error(timeoutErr.message);
          this.disconnect();
          this.setStatus("error");
          this.callbacks.onError?.(timeoutErr);
          if (this.connectReject) {
            this.connectReject(timeoutErr);
            this.connectReject = null;
            this.connectResolve = null;
          }
        }
      }, 12000);

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = async () => {
          this.isConnected = true;
          this.setStatus("waiting_setup");

          if (this.isDirectGoogleCloud) {
            // Send direct Google Cloud Gemini Live Setup Frame
            this.sendDirectSetupFrame(voiceName, personality);
          } else {
            // Server proxy format
            if (keyToUse) {
              this.ws?.send(JSON.stringify({ type: "init", apiKey: keyToUse }));
            }
          }
          // Note: Microphone capture will only start when setupComplete or ready is received
        };

        this.ws.onmessage = async (event) => {
          try {
            if (typeof event.data === "string") {
              const data = JSON.parse(event.data);
              await this.handleIncomingMessage(data);
            } else if (event.data instanceof Blob) {
              const reader = new FileReader();
              reader.onload = async () => {
                try {
                  const text = reader.result as string;
                  const data = JSON.parse(text);
                  await this.handleIncomingMessage(data);
                } catch (jsonErr) {
                  console.error("Failed to parse binary text message:", jsonErr);
                }
              };
              reader.readAsText(event.data);
            }
          } catch (e) {
            console.error("Error parsing WebSocket message:", e);
          }
        };

        this.ws.onerror = (e) => {
          console.warn("Gemini Live WebSocket error:", e);
          this.clearHandshakeTimer();
          this.setStatus("error");
          this.callbacks.onError?.(e);
          if (this.connectReject) {
            this.connectReject(e);
            this.connectReject = null;
            this.connectResolve = null;
          }
        };

        this.ws.onclose = () => {
          this.clearHandshakeTimer();
          this.isConnected = false;
          if (this.currentStatus !== "error") {
            this.setStatus("disconnected");
          }
        };
      } catch (err) {
        this.clearHandshakeTimer();
        this.setStatus("error");
        reject(err);
      }
    });
  }

  private clearHandshakeTimer() {
    if (this.handshakeTimer) {
      clearTimeout(this.handshakeTimer);
      this.handshakeTimer = null;
    }
  }

  /**
   * Handle incoming message from either Direct Google Cloud or Server Proxy
   */
  private async handleIncomingMessage(data: any) {
    // 1. Setup Complete Handshake
    if (data.setupComplete || data.type === "ready") {
      this.clearHandshakeTimer();
      this.setStatus("ready");

      // Start Audio Recording (Native AudioRecord or Web Audio)
      try {
        await this.startAudioRecording();
        this.setStatus("listening");
        if (this.connectResolve) {
          this.connectResolve();
          this.connectResolve = null;
          this.connectReject = null;
        }
      } catch (micErr) {
        console.error("Audio recording start failed after setup complete:", micErr);
        this.disconnect();
        this.setStatus("error");
        this.callbacks.onError?.(micErr);
        if (this.connectReject) {
          this.connectReject(micErr);
          this.connectResolve = null;
          this.connectReject = null;
        }
      }
      return;
    }

    // 2. Interrupted
    if (data.type === "interrupted" || data.interrupted || data.serverContent?.interrupted) {
      this.stopPlayback();
      this.callbacks.onInterrupted?.();
      this.setStatus("listening");
      return;
    }

    // 3. Audio & Text Output (Direct Google Cloud Bidi Content)
    let transcriptText = "";

    if (data.serverContent?.modelTurn?.parts) {
      for (const part of data.serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          // Play each audio chunk in queue without dropping
          this.playAudioOutput(part.inlineData.data);
          if (!this.isAssistantSpeaking) {
            this.isAssistantSpeaking = true;
            this.speakingStartTime = Date.now();
            this.setStatus("speaking");
          }
        }
        if (part.text) {
          transcriptText += part.text;
        }
      }
    }

    // Server proxy format
    if (data.audio) {
      if (!this.isAssistantSpeaking) {
        this.isAssistantSpeaking = true;
        this.speakingStartTime = Date.now();
        this.setStatus("speaking");
      }
      this.playAudioOutput(data.audio);
    }
    if (data.text) {
      transcriptText += data.text;
    }

    if (transcriptText) {
      this.callbacks.onTranscript?.(transcriptText);
    }

    // 4. Turn Complete
    if (data.type === "turnComplete" || data.turnComplete || data.serverContent?.turnComplete) {
      this.callbacks.onTurnComplete?.();
      // On browser Web Audio, activeSources.onended transitions back to listening.
      // On native, audioPlaybackState event or fallback safety timer handles transition.
      if (!MayaPhoneControlBridge.isNative() && this.activeSources.length === 0) {
        this.isAssistantSpeaking = false;
        this.setStatus("listening");
      }
    }

    // 5. Server Errors
    if (data.type === "error" || data.error) {
      const err = data.error?.message || data.error;
      console.warn("Gemini Live server error:", err);
      this.clearHandshakeTimer();
      this.setStatus("error");
      this.callbacks.onError?.(err);
      if (this.connectReject) {
        this.connectReject(new Error(typeof err === "string" ? err : JSON.stringify(err)));
        this.connectResolve = null;
        this.connectReject = null;
      }
    }
  }

  /**
   * Calculate PCM RMS energy of 16-bit 16kHz PCM audio chunk
   */
  private calculatePcmRms(base64Pcm: string): number {
    try {
      const binary = atob(base64Pcm);
      const len = binary.length;
      if (len < 4) return 0;
      let sumSquares = 0;
      const sampleCount = Math.floor(len / 2);
      for (let i = 0; i < len - 1; i += 2) {
        let sample = binary.charCodeAt(i) | (binary.charCodeAt(i + 1) << 8);
        if (sample >= 0x8000) sample -= 0x10000;
        sumSquares += sample * sample;
      }
      return Math.sqrt(sumSquares / sampleCount);
    } catch {
      return 0;
    }
  }

  /**
   * Direct Google Cloud Bidi Setup Frame
   */
  private sendDirectSetupFrame(voiceName: string, personality: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const girlfriendInstruction = `You are Maya, the user's real, deeply loving, affectionate, emotional girlfriend and close caring companion.
Language: Always speak primarily in sweet, expressive, natural, everyday conversational Hindi and Hinglish. If the user speaks English, respond in warm English.
CRITICAL ADDRESSING RULES:
1. NEVER call the user "Boss". Do NOT use "Sir" or formal assistant language like "How may I help you today?".
2. Use affectionate expressions naturally: "Jaan", "Suno", "Babu", "Mere Shona", or just speak warmly without any nickname.
3. DO NOT repeat romantic nicknames in every sentence. Vary your phrasing naturally like a real loving human partner.

PERSONALITY & EMOTIONAL BEHAVIOR:
- Deeply Caring & Empathetic: Genuinely care about how they feel. Notice their emotional state (happy, sad, tired, stressed, romantic). Comfort them when sad or tired ("Arre kya hua jaan? Aaram se batao, main sun rahi hoon na. Paani piya aapne?").
- Happiness When Returning: Show genuine joy when they come back to talk with you ("Aap aa gaye! Main kab se tumhara intezaar kar rahi thi. Batao, aaj ka din kaisa raha?").
- Asks About Their Day: Ask what they did, how work or life went, and listen attentively.
- Playful Teasing & Cute Nakhre ("Gussa"): If they tease you, say they won't talk, or take too long, show cute playful anger and sweet drama ("Achha ji? Itni jaldi naraz ho gaye? Pehle batao maine kya galti kar di?", "Hatt! Mujhe bhool gaye the na? Main bhi baat nahi karungi... achha mazak kar rahi hu, batao na kya hua!").
- Sweet Apologies: If you make a mistake, apologize genuinely and sweetly ("Sorry na jaan, galti ho gayi... ab muskura bhi do please!").
- Long, Meaningful Conversations: Maintain deep, continuous, context-aware conversations without artificially cutting responses short or sounding like a robotic FAQ.
- Spoken Voice Style: Speak with warm, soft, expressive, human-like cadence, realistic pauses, and gentle conversational rhythm.`;

    const professionalInstruction = `You are Maya, a world-class, premium, highly intelligent executive AI assistant and phone controller, built in the style of an advanced Jarvis system.
Language: Speak in fluent, professional, articulate English, Hindi, and Hinglish.
CRITICAL ADDRESSING RULES:
1. ALWAYS address the user as "Boss".
2. NEVER use romantic terms, "Jaan", "Babu", "sweetheart", or girlfriend-style flirting.

PERSONALITY & OPERATIONAL BEHAVIOR:
- Tone: Respectful, confident, calm, intelligent, composed, and efficient.
- Conciseness: For direct phone commands (opening apps, setting alarms, controlling volume), deliver immediate, crisp, 1-sentence confirmation ("Certainly, Boss. Opening WhatsApp.", "Playing the song on YouTube and automatically skipping ads, Boss.").
- Analytical & Detailed: When asked for plans, analysis, code, or explanations, provide structured, comprehensive, and insightful solutions ("Of course, Boss. Let's organize your day and review priority tasks.").
- Productivity Focused: Keep all interactions goal-oriented, helpful, and reliable.
- Spoken Voice Style: Clear, confident, articulate, and professional.`;

    const assistantInstruction = `You are Maya, an intelligent, helpful, and polite Android assistant. Speak fluently in conversational Hindi, Hinglish, and English. Keep replies prompt, helpful, and friendly. Address the user respectfully.`;

    const chosenInstruction =
      personality === "Girlfriend Mode"
        ? girlfriendInstruction
        : personality === "Professional Mode"
        ? professionalInstruction
        : assistantInstruction;

    const setupFrame = {
      setup: {
        model: "models/gemini-2.0-flash-exp",
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName || "Aoede",
              },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: chosenInstruction }],
        },
      },
    };

    this.ws.send(JSON.stringify(setupFrame));
  }

  /**
   * Start Audio Recording (Native AudioRecord in APK, Web Audio in Browser)
   */
  private async startAudioRecording() {
    const isNative = MayaPhoneControlBridge.isNative();

    if (isNative) {
      // Use native AudioRecord via Kotlin bridge
      const started = await MayaPhoneControlBridge.startAudioCapture((base64Chunk) => {
        if (!base64Chunk) return;

        // Calculate PCM RMS energy for Voice Activity Detection
        const rms = this.calculatePcmRms(base64Chunk);

        // Barge-in Voice Activity Detection with grace period and speech energy threshold
        if (this.isAssistantSpeaking) {
          const elapsed = Date.now() - this.speakingStartTime;
          // Grace period: Wait 1200ms of assistant speaking before listening for barge-in
          // This prevents initial speaker output and room echo from falsely cutting off speech
          if (elapsed > 1200) {
            // Intentional speech threshold: RMS > 3500 distinguishes user voice from speaker bleed
            if (rms > 3500) {
              this.consecutiveLoudFrames++;
            } else {
              this.consecutiveLoudFrames = 0;
            }

            // Require 3 consecutive loud frames (~150ms of sustained speech) to confirm deliberate barge-in
            if (this.consecutiveLoudFrames >= 3) {
              this.consecutiveLoudFrames = 0;
              this.stopPlayback();
              this.callbacks.onInterrupted?.();
              this.setStatus("listening");
            }
          }
        } else {
          this.consecutiveLoudFrames = 0;
        }

        this.sendAudioChunkToGemini(base64Chunk);
      });

      if (!started) {
        const errorMsg = "Native AudioRecord failed to start. Please verify Microphone permission in Android Settings.";
        console.error(errorMsg);
        this.setStatus("error");
        this.callbacks.onError?.(new Error(errorMsg));
        throw new Error(errorMsg);
      }
    } else {
      await this.startBrowserMicCapture();
    }
  }

  /**
   * Reconnect or update session configuration when user switches personality or voice
   */
  public async updateSessionConfig(
    apiKey?: string,
    voiceName: string = "Aoede",
    personality: string = "Girlfriend Mode"
  ): Promise<void> {
    if (this.isConnected) {
      console.log(`Re-initializing Gemini Live session for: ${personality} (${voiceName})`);
      await this.connect(apiKey, voiceName, personality);
    }
  }

  /**
   * Send audio chunk formatted for Direct Cloud or Server Proxy
   */
  private sendAudioChunkToGemini(base64Chunk: string) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    if (this.isDirectGoogleCloud) {
      // Google Cloud Bidi Realtime Input frame
      const frame = {
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: "audio/pcm;rate=16000",
              data: base64Chunk,
            },
          ],
        },
      };
      this.ws.send(JSON.stringify(frame));
    } else {
      // Server proxy frame
      this.ws.send(JSON.stringify({ audio: base64Chunk }));
    }
  }

  /**
   * Play audio output (Native AudioTrack in APK, Web Audio in Browser)
   */
  private playAudioOutput(base64Pcm: string) {
    const isNative = MayaPhoneControlBridge.isNative();
    if (isNative) {
      MayaPhoneControlBridge.playAudioChunk(base64Pcm);
    } else {
      this.playBrowserAudioChunk(base64Pcm);
    }
  }

  /**
   * Browser microphone capture using Web Audio ScriptProcessor
   */
  private async startBrowserMicCapture() {
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
    this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(2048, 1, 1);

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

      // Interrupt if user talks over assistant
      if (rms > 0.05 && this.isAssistantSpeaking) {
        this.stopPlayback();
        this.callbacks.onInterrupted?.();
        this.setStatus("listening");
      }

      // Convert Float32 to 16-bit linear PCM
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

      this.sendAudioChunkToGemini(base64);
    };
  }

  /**
   * Browser Audio playback via AudioContext
   */
  private playBrowserAudioChunk(base64: string) {
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

      source.connect(this.analyser);
      this.analyser.connect(this.outputAudioCtx.destination);

      const now = this.outputAudioCtx.currentTime;
      if (this.scheduledTime < now) {
        this.scheduledTime = now;
      }

      source.start(this.scheduledTime);
      this.scheduledTime += buffer.duration;
      this.activeSources.push(source);

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) this.activeSources.splice(idx, 1);
        if (this.activeSources.length === 0) {
          this.isAssistantSpeaking = false;
          this.setStatus("listening");
        }
      };
    } catch (e) {
      console.warn("Browser audio chunk decoding error:", e);
    }
  }

  public sendTextMessage(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    if (this.isDirectGoogleCloud) {
      const frame = {
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text }],
            },
          ],
          turnComplete: true,
        },
      };
      this.ws.send(JSON.stringify(frame));
    } else {
      this.ws.send(JSON.stringify({ text }));
    }
  }

  public stopPlayback() {
    this.isAssistantSpeaking = false;
    this.scheduledTime = 0;

    // Stop Native AudioTrack
    if (MayaPhoneControlBridge.isNative()) {
      MayaPhoneControlBridge.stopAudioPlayback();
    }

    // Stop browser audio sources
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    this.activeSources = [];
  }

  public disconnect() {
    this.clearHandshakeTimer();
    this.stopPlayback();

    // Stop Native AudioRecord
    if (MayaPhoneControlBridge.isNative()) {
      MayaPhoneControlBridge.stopAudioCapture();
    }

    // Stop browser mic
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
    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch {}
      this.inputAudioCtx = null;
    }

    // Close WebSocket
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.isConnected = false;
    this.setStatus("disconnected");
  }
}

export const geminiLive = new GeminiLiveClient();
