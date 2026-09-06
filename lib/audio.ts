'use client';

/**
 * Interaction sound, synthesised on the fly.
 *
 * No audio files: every sound is a few oscillators and a noise burst, which
 * keeps the payload at zero and makes the palette easy to tune. Nothing plays
 * until the visitor explicitly turns sound on, and there is no music or
 * looping ambience — only short physical responses to things they did.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let noiseBuffer: AudioBuffer | null = null;

function ensure() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function getNoise(c: AudioContext) {
  if (noiseBuffer) return noiseBuffer;
  const len = Math.floor(c.sampleRate * 1.2);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (on) ensure();
}

export function isSoundEnabled() {
  return enabled;
}

interface NoiseOpts {
  duration: number;
  gain: number;
  type?: BiquadFilterType;
  freq: number;
  q?: number;
  /** Filter frequency at the end of the envelope, for a sweep. */
  freqEnd?: number;
  delay?: number;
}

function noise(opts: NoiseOpts) {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime + (opts.delay ?? 0);
  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  const filter = c.createBiquadFilter();
  filter.type = opts.type ?? 'bandpass';
  filter.frequency.setValueAtTime(opts.freq, t);
  if (opts.freqEnd) filter.frequency.exponentialRampToValueAtTime(Math.max(40, opts.freqEnd), t + opts.duration);
  filter.Q.value = opts.q ?? 1;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain, t + Math.min(0.02, opts.duration * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.duration);
  src.connect(filter).connect(g).connect(master);
  src.start(t);
  src.stop(t + opts.duration + 0.05);
}

interface ToneOpts {
  freq: number;
  freqEnd?: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
  delay?: number;
}

function tone(opts: ToneOpts) {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, t);
  if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t + opts.duration);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.duration);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + opts.duration + 0.05);
}

export const sfx = {
  /** Latch, a breath of hinge friction, then the leaf settling. */
  door(strength = 1) {
    if (!enabled) return;
    noise({ duration: 0.05, gain: 0.16 * strength, freq: 2600, q: 1.4 });
    tone({ freq: 128, freqEnd: 62, duration: 0.3, gain: 0.16 * strength, type: 'sine', delay: 0.02 });
    noise({ duration: 0.5, gain: 0.045 * strength, freq: 900, freqEnd: 320, q: 0.7, delay: 0.06 });
    tone({ freq: 74, freqEnd: 48, duration: 0.42, gain: 0.11 * strength, type: 'sine', delay: 0.36 });
  },

  /** Tiny, dry interface tick. */
  click() {
    if (!enabled) return;
    noise({ duration: 0.032, gain: 0.1, freq: 3400, q: 2.2 });
    tone({ freq: 900, freqEnd: 540, duration: 0.05, gain: 0.045, type: 'triangle' });
  },

  /** A sheet being picked up — used when a panel opens. */
  paper() {
    if (!enabled) return;
    noise({ duration: 0.2, gain: 0.06, freq: 4200, freqEnd: 1800, q: 0.6, type: 'highpass' });
    noise({ duration: 0.14, gain: 0.035, freq: 2600, q: 0.5, delay: 0.09 });
  },

  /** Soft attention cue when something becomes interactive. */
  hover() {
    if (!enabled) return;
    noise({ duration: 0.026, gain: 0.03, freq: 5200, q: 2 });
  },

  /** Low, muffled footfall. */
  step(strength = 1) {
    if (!enabled) return;
    tone({ freq: 96, freqEnd: 52, duration: 0.13, gain: 0.05 * strength, type: 'sine' });
    noise({ duration: 0.07, gain: 0.022 * strength, freq: 700, freqEnd: 300, q: 0.8 });
  },
};
