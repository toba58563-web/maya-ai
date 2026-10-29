/**
 * Background Keep-Alive Service for Maya
 * Ensures microphone listening & audio execution persist even when tab is backgrounded
 */

class BackgroundKeepAlive {
  private wakeLock: any = null;
  private audioCtx: AudioContext | null = null;
  private silentSource: AudioBufferSourceNode | null = null;
  private isEnabled = true;

  public async acquire() {
    if (!this.isEnabled) return;

    // 1. Screen Wake Lock
    if ("wakeLock" in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request("screen");
        this.wakeLock.addEventListener("release", () => {
          this.wakeLock = null;
        });
      } catch (e) {
        console.warn("Screen wakeLock not permitted or failed:", e);
      }
    }

    // 2. Silent audio buffer loop to prevent browser audio thread freeze
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }

      // Create a 1-second silent audio buffer
      const buffer = this.audioCtx.createBuffer(1, this.audioCtx.sampleRate, this.audioCtx.sampleRate);
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Keep volume at virtually 0
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);

      source.connect(gain);
      gain.connect(this.audioCtx.destination);
      source.start();
      this.silentSource = source;
    } catch (e) {
      console.warn("Silent audio keep-alive not supported:", e);
    }
  }

  public release() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {}
      this.wakeLock = null;
    }

    if (this.silentSource) {
      try {
        this.silentSource.stop();
        this.silentSource.disconnect();
      } catch {}
      this.silentSource = null;
    }

    if (this.audioCtx && this.audioCtx.state !== "closed") {
      try {
        this.audioCtx.suspend();
      } catch {}
    }
  }

  public setEnabled(val: boolean) {
    this.isEnabled = val;
    if (!val) {
      this.release();
    }
  }
}

export const backgroundKeepAlive = new BackgroundKeepAlive();
