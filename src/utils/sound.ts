import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type { AlarmSoundId } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Synthesizes an authentic crisp aluminum blister foil tear + plastic dome POP!
 */
export function playBlisterPopSound(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Sharp metallic foil crackle burst (band-passed noise)
  const noiseLength = Math.floor(ctx.sampleRate * 0.14);
  const noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseLength; i++) {
    const t = i / noiseLength;
    // Two quick crinkle peaks like foil ripping
    const env = Math.pow(1 - t, 2.2) * (0.65 + 0.35 * Math.sin(t * 48));
    output[i] = (Math.random() * 2 - 1) * env;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(3400, now);
  bandpass.frequency.exponentialRampToValueAtTime(1900, now + 0.12);
  bandpass.Q.value = 1.4;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001, now);
  noiseGain.gain.linearRampToValueAtTime(0.32, now + 0.012);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

  noise.connect(bandpass);
  bandpass.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);

  // 2. Tactile plastic blister "POP" thump (fast pitch-drop sine)
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(480, now + 0.015);
  osc.frequency.exponentialRampToValueAtTime(115, now + 0.095);

  const popGain = ctx.createGain();
  popGain.gain.setValueAtTime(0.001, now + 0.012);
  popGain.gain.linearRampToValueAtTime(0.38, now + 0.022);
  popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.105);

  osc.connect(popGain);
  popGain.connect(ctx.destination);
  osc.start(now + 0.012);
  osc.stop(now + 0.12);

  // 3. Tiny satisfying high sparkle confirmation note
  const ding = ctx.createOscillator();
  ding.type = 'sine';
  ding.frequency.setValueAtTime(1046.5, now + 0.09);
  ding.frequency.exponentialRampToValueAtTime(1318.5, now + 0.24);

  const dingGain = ctx.createGain();
  dingGain.gain.setValueAtTime(0.001, now + 0.085);
  dingGain.gain.linearRampToValueAtTime(0.09, now + 0.105);
  dingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

  ding.connect(dingGain);
  dingGain.connect(ctx.destination);
  ding.start(now + 0.085);
  ding.stop(now + 0.3);
}

/**
 * Cute subtle pop + sweet little kitten "mew!" chirp for the Cat Peek blister
 */
export function playCatPeekSound(enabled = true) {
  if (!enabled) return;
  playBlisterPopSound(true);
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + 0.08;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  // Cute upward-then-downward kitten "mew" contour
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(1020, now + 0.09);
  osc.frequency.exponentialRampToValueAtTime(760, now + 0.24);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.28);
}

/**
 * Adorable crunchy kibble munch-munch + happy chime for the Cat Bowl blister
 */
export function playCatMunchSound(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // 3 cute rapid kibble crunches
  [0, 0.14, 0.28].forEach((offset) => {
    const len = Math.floor(ctx.sampleRate * 0.07);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.9;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800 + offset * 900;
    filter.Q.value = 1.6;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.24, now + offset);
    g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.068);

    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(now + offset);
  });

  // Happy satisfied "mew-purr" sparkle at the end
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(784, now + 0.42);
  osc.frequency.exponentialRampToValueAtTime(1174.6, now + 0.56);
  gain.gain.setValueAtTime(0.001, now + 0.41);
  gain.gain.linearRampToValueAtTime(0.11, now + 0.44);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now + 0.41);
  osc.stop(now + 0.65);
}

/**
 * Plays a gentle pill alarm melody (3 distinct pleasant presets)
 */
export function playAlarmSound(soundId: AlarmSoundId, enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const playNote = (freq: number, startOffset: number, duration: number, type: OscillatorType, vol: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + startOffset);
    gain.gain.setValueAtTime(0.001, now + startOffset);
    gain.gain.linearRampToValueAtTime(vol, now + startOffset + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + startOffset + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + startOffset);
    osc.stop(now + startOffset + duration + 0.04);
  };

  if (soundId === 'harp') {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => playNote(n, idx * 0.13, 0.75, 'sine', 0.16));
  } else if (soundId === 'chime') {
    playNote(880, 0, 0.9, 'sine', 0.16);
    playNote(1318.5, 0.18, 1.0, 'triangle', 0.12);
    playNote(1760, 0.42, 0.9, 'sine', 0.09);
  } else {
    playNote(698.46, 0, 0.28, 'sine', 0.18);
    playNote(880, 0.3, 0.38, 'sine', 0.18);
  }
}

export async function triggerHaptic(enabled = true, style: 'light' | 'medium' | 'heavy' = 'medium') {
  if (!enabled) return;
  try {
    const map: Record<string, ImpactStyle> = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: map[style] });
  } catch {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const ms = style === 'heavy' ? 36 : style === 'medium' ? 22 : 10;
      navigator.vibrate(ms);
    }
  }
}
