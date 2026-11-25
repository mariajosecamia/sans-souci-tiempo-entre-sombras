// Sonido procedural con Web Audio: ambientes por sala, efectos y una música mínima.
// Sin archivos de audio: todo se sintetiza (ruido filtrado, osciladores, envolventes).
export type Bus = 'master' | 'music' | 'amb' | 'sfx';

export interface Volumes { master: number; music: number; amb: number; sfx: number }

class AudioEngine {
  ctx?: AudioContext;
  buses: Partial<Record<Bus, GainNode>> = {};
  vol: Volumes = { master: 0.8, music: 0.5, amb: 0.7, sfx: 0.8 };
  private noiseBuf?: AudioBuffer;
  private ambNodes: AudioNode[] = [];
  private ambTimers: number[] = [];
  private musicTimer?: number;
  private currentAmb = '';

  init(): void {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const ctx = this.ctx!;
    const master = ctx.createGain();
    master.connect(ctx.destination);
    this.buses.master = master;
    for (const b of ['music', 'amb', 'sfx'] as Bus[]) {
      const g = ctx.createGain();
      g.connect(master);
      this.buses[b] = g;
    }
    this.applyVolumes();
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setVolumes(v: Partial<Volumes>): void {
    this.vol = { ...this.vol, ...v };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.buses.master!.gain.setTargetAtTime(this.vol.master, t, 0.05);
    this.buses.music!.gain.setTargetAtTime(this.vol.music * 0.6, t, 0.05);
    this.buses.amb!.gain.setTargetAtTime(this.vol.amb * 0.8, t, 0.05);
    this.buses.sfx!.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
  }

  private noise(): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noiseBuf!;
    src.loop = true;
    return src;
  }

  // ---------------------------------------------------------------- ambientes
  ambience(kind: string): void {
    if (!this.ctx || kind === this.currentAmb) return;
    this.stopAmbience();
    this.currentAmb = kind;
    const ctx = this.ctx, out = this.buses.amb!;
    const loop = (freq: number, q: number, gain: number, lfo = 0.07) => {
      const n = this.noise();
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = gain;
      const l = ctx.createOscillator(); l.frequency.value = lfo;
      const lg = ctx.createGain(); lg.gain.value = gain * 0.6;
      l.connect(lg); lg.connect(g.gain);
      n.connect(f); f.connect(g); g.connect(out);
      n.start(); l.start();
      this.ambNodes.push(n, l, g);
    };
    if (kind === 'rain-out') { loop(1800, 0.5, 0.22, 0.05); loop(400, 0.8, 0.12, 0.03); }
    if (kind === 'rain-in' || kind === 'house') { loop(900, 0.7, kind === 'house' ? 0.05 : 0.1, 0.04); loop(160, 1.2, 0.05, 0.02); }
    if (kind === 'greenhouse') { loop(2400, 0.6, 0.14, 0.06); loop(700, 0.9, 0.06, 0.04); }
    if (kind === 'basement') { loop(90, 2, 0.12, 0.02); this.every(5200, () => this.drip()); }
    if (kind === 'void') { loop(60, 4, 0.1, 0.01); loop(3000, 8, 0.015, 0.2); }
    if (kind !== 'void') this.every(kind === 'basement' ? 1400 : 2600, () => this.tick(kind === 'basement' ? 0.25 : 0.08));
    else this.every(1000, () => this.tick(0.3, 0.5));
    if (kind === 'house' || kind === 'rain-in') this.every(9000, () => Math.random() < 0.5 && this.creak(0.12));
  }

  private every(ms: number, fn: () => void): void {
    const id = window.setInterval(fn, ms * (0.85 + Math.random() * 0.3));
    this.ambTimers.push(id);
  }

  stopAmbience(): void {
    for (const n of this.ambNodes) { try { (n as any).stop?.(); n.disconnect(); } catch { /* */ } }
    this.ambNodes = [];
    for (const t of this.ambTimers) clearInterval(t);
    this.ambTimers = [];
    this.currentAmb = '';
  }

  // ---------------------------------------------------------------- música
  startMusic(mood: 'calm' | 'tense' | 'void' = 'calm'): void {
    if (!this.ctx) return;
    this.stopMusic();
    const scales: Record<string, number[]> = {
      calm: [220, 246.9, 261.6, 293.7, 329.6, 392, 440],
      tense: [207.6, 220, 246.9, 261.6, 311.1, 329.6],
      void: [110, 116.5, 146.8, 155.6, 220],
    };
    const sc = scales[mood];
    const play = () => {
      const t = this.ctx!.currentTime;
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) this.note(sc[Math.floor(Math.random() * sc.length)] * (Math.random() < 0.3 ? 0.5 : 1), t + i * 0.9, 3.5, 0.06, this.buses.music!);
    };
    play();
    this.musicTimer = window.setInterval(play, mood === 'void' ? 5200 : 4200);
  }
  stopMusic(): void { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = undefined; }

  /** Nota tipo piano/caja de música: suma de parciales con caída exponencial. */
  note(freq: number, at: number, dur: number, gain: number, out?: AudioNode, bright = 1): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    g.connect(out ?? this.buses.sfx!);
    [1, 2, 3.01, 4.2].forEach((m, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * m;
      const pg = ctx.createGain();
      pg.gain.value = [1, 0.35 * bright, 0.12 * bright, 0.05 * bright][i];
      o.connect(pg); pg.connect(g);
      o.start(at); o.stop(at + dur + 0.05);
    });
  }

  // ---------------------------------------------------------------- efectos
  private burst(dur: number, freq: number, q: number, gain: number, type: BiquadFilterType = 'bandpass', at = 0): void {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + at;
    const n = this.noise();
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(this.buses.sfx!);
    n.start(t, Math.random()); n.stop(t + dur + 0.05);
  }

  private tone(f0: number, f1: number, dur: number, gain: number, type: OscillatorType = 'sine', at = 0): void {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + at;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.buses.sfx!);
    o.start(t); o.stop(t + dur + 0.05);
  }

  tick(gain = 0.1, pitch = 1): void { this.burst(0.03, 3200 * pitch, 6, gain); }
  /** Tecla de máquina de escribir: golpe seco + tipo metálico. */
  key(): void { const p = 0.85 + Math.random() * 0.3; this.burst(0.025, 2600 * p, 5, 0.07); this.burst(0.012, 5200 * p, 8, 0.03); }
  /** Campanita del final de renglón. */
  ding(): void { this.tone(2093, 2093, 0.5, 0.04); }
  drip(): void { this.tone(1400, 600, 0.12, 0.08); }
  creak(gain = 0.15): void { this.tone(140, 90, 0.9, gain * 0.5, 'sawtooth'); this.burst(0.8, 300, 4, gain * 0.4); }
  step(surface: 'wood' | 'stone' | 'gravel' | 'water' = 'wood'): void {
    if (surface === 'gravel') this.burst(0.09, 2400, 0.8, 0.12);
    else if (surface === 'water') { this.burst(0.15, 900, 1.2, 0.1); this.drip(); }
    else if (surface === 'stone') this.burst(0.05, 1600, 2, 0.12);
    else this.burst(0.07, 500, 1.5, 0.18);
  }

  sfx(id: string): void {
    if (!this.ctx) return;
    switch (id) {
      case 'bell': [0, 0.5, 1.0].forEach((d) => this.note(523, this.ctx!.currentTime + d, 2.2, 0.12, undefined, 2)); break;
      case 'gate': this.creak(0.4); this.burst(0.3, 200, 2, 0.3, 'lowpass', 0.6); break;
      case 'door_stuck': this.burst(0.12, 180, 1, 0.4, 'lowpass'); this.burst(0.1, 220, 1, 0.3, 'lowpass', 0.18); break;
      case 'unlock': this.burst(0.04, 2600, 4, 0.3); this.burst(0.05, 1800, 4, 0.3, 'bandpass', 0.12); break;
      case 'pickup': this.burst(0.08, 1200, 1, 0.15); this.tone(600, 900, 0.1, 0.03); break;
      case 'paper': this.burst(0.25, 3500, 0.7, 0.12); break;
      case 'match': this.burst(0.15, 4000, 0.6, 0.25); this.burst(0.6, 600, 0.5, 0.06, 'lowpass', 0.1); break;
      case 'pour': this.burst(1.0, 700, 3, 0.08); break;
      case 'oil': this.burst(0.3, 500, 2, 0.06); break;
      case 'clock_open': this.tick(0.4); this.creak(0.2); break;
      case 'piano_chord': [261.6, 329.6, 392].forEach((f) => this.note(f, this.ctx!.currentTime, 2.5, 0.08)); break;
      case 'memory': this.tone(880, 440, 1.6, 0.05); this.tone(660, 330, 1.8, 0.04, 'triangle', 0.1); break;
      case 'scream': this.tone(900, 500, 0.9, 0.06, 'sawtooth'); this.burst(0.9, 1200, 2, 0.06); break;
      case 'rumble': this.burst(1.6, 80, 1, 0.5, 'lowpass'); break;
      case 'whoosh': this.burst(1.0, 500, 0.5, 0.25); this.tone(200, 60, 1.2, 0.1); break;
      case 'light': this.tone(300, 900, 0.8, 0.06, 'triangle'); break;
      case 'gear': this.tick(0.6); this.tick(0.5, 0.7); this.burst(0.4, 300, 3, 0.2, 'bandpass', 0.1); break;
      case 'shutter': this.burst(0.03, 3000, 2, 0.4); this.burst(0.04, 2000, 2, 0.3, 'bandpass', 0.07); break;
      case 'era': this.tone(220, 110, 1.4, 0.08, 'triangle'); this.burst(1.2, 800, 0.6, 0.1); break;
      case 'crow': this.tone(700, 400, 0.25, 0.08, 'sawtooth'); this.tone(650, 380, 0.25, 0.07, 'sawtooth', 0.35); break;
      case 'ui': this.tone(900, 700, 0.06, 0.03); break;
      default: this.burst(0.08, 900, 1, 0.1);
    }
  }

  /** Caja de música: toca una melodía (índices de escala) con timbre brillante. */
  playMelody(notes: number[], gap = 0.55): void {
    if (!this.ctx) return;
    const scale = [523.3, 587.3, 659.3, 698.5, 784, 880, 987.8, 1046.5];
    const t = this.ctx.currentTime + 0.1;
    notes.forEach((n, i) => this.note(scale[n], t + i * gap, 1.6, 0.12, undefined, 2.2));
  }

  pianoKey(n: number): void {
    if (!this.ctx) return;
    const scale = [261.6, 293.7, 329.6, 349.2, 392, 440, 493.9, 523.3];
    this.note(scale[n], this.ctx.currentTime, 2.2, 0.14);
  }
}

export const audio = new AudioEngine();
