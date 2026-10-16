/**
 * Korte, zachte geluidjes, ter plekke gemaakt met de Web Audio API: geen
 * bestanden, geen netwerk. Optioneel (uit te zetten) en nooit nodig om de
 * app te begrijpen. Op iOS mag geluid pas na een eerste tik.
 */
export type SoundName = 'tap' | 'place' | 'drop-fail' | 'hop' | 'correct' | 'retry' | 'finish' | 'unlock' | 'locked' | 'collect';

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

/** Aanroepen bij de eerste aanraking (iOS-regel). */
export function unlockAudio(): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', volume = 0.12, slideTo?: number): void {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, A4 = 440, E4 = 329.63, G4 = 392;

export function playSound(name: SoundName): void {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  try {
    switch (name) {
      case 'tap':
        return tone(900, 0, 0.05, 'triangle', 0.05);
      case 'hop':
        return tone(500, 0, 0.12, 'sine', 0.08, 800);
      case 'place':
        return tone(660, 0, 0.1, 'triangle', 0.09, 990);
      case 'drop-fail':
        return tone(300, 0, 0.18, 'sine', 0.06, 220);
      case 'locked':
        return tone(196, 0, 0.2, 'sine', 0.06);
      case 'correct':
        tone(C5, 0, 0.14, 'triangle');
        tone(E5, 0.09, 0.14, 'triangle');
        return tone(G5, 0.18, 0.22, 'triangle');
      case 'retry': // vriendelijk "hmm", geen zoemer
        tone(G4, 0, 0.16, 'sine', 0.07);
        return tone(E4, 0.14, 0.2, 'sine', 0.06);
      case 'collect':
        tone(E5, 0, 0.1, 'triangle', 0.08);
        return tone(C6, 0.08, 0.18, 'triangle', 0.08);
      case 'unlock':
        [C5, E5, G5, C6].forEach((f, i) => tone(f, i * 0.07, 0.16, 'triangle', 0.08));
        return;
      case 'finish':
        [C5, E5, G5, C6, G5, C6].forEach((f, i) => tone(f, i * 0.11, i === 5 ? 0.4 : 0.14, 'triangle', 0.1));
        return tone(A4 / 2, 0, 0.6, 'sine', 0.05);
    }
  } catch {
    /* geluid is optioneel */
  }
}
