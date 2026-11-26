// Procedural WebAudio Synthesizer for Madinat Aspace (Zero external audio files required)

class SolarpunkAudioEngine {
  private ctx: AudioContext | null = null;
  private radioTimer: number | null = null;
  private step = 0;

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) this.ctx = new Ctx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playGoldenGong() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [146.83, 220, 293.66, 440, 554.37, 659.25];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.992, now + 3.2);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11 / (i + 1), now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 3.5);
    });
  }

  playChime(up = true) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = up ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 523.25];
    notes.forEach((n, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n, now + idx * 0.08);
      gain.gain.setValueAtTime(0.06, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.5);
    });
  }

  playHorn() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [330, 415.3].forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    });
  }

  setRadioStation(station: number) {
    if (this.radioTimer !== null) {
      window.clearInterval(this.radioTimer);
      this.radioTimer = null;
    }
    if (station === 0) return;

    const ctx = this.ensureCtx();
    if (!ctx) return;

    // 1: Radio Al-Hikma (Hijaz Solarpunk Oud Ambient)
    // 2: Cupertino FM (Warm Lydian Plucks)
    // 3: Rooftop Oasis Pulse (Upbeat Arpeggio)
    const scales: Record<number, number[]> = {
      1: [220.0, 233.08, 277.18, 293.66, 329.63, 349.23, 415.3, 440.0],
      2: [261.63, 293.66, 329.63, 369.99, 392.0, 440.0, 493.88, 523.25],
      3: [196.0, 246.94, 293.66, 369.99, 392.0, 493.88, 587.33, 739.99],
    };
    const tempoMs = station === 3 ? 210 : station === 2 ? 360 : 440;
    const scale = scales[station] || scales[1];

    this.radioTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const note = scale[(this.step * 3 + (this.step % 2)) % scale.length];
      this.step++;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = station === 1 ? 'triangle' : station === 2 ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(note, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(station === 3 ? 1400 : 950, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.032, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (station === 3 ? 0.25 : 0.65));

      osc.connect(filter).connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    }, tempoMs);
  }
}

export const solarpunkAudio = new SolarpunkAudioEngine();
