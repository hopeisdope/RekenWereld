import type { Exercise, Rng } from './types';

export interface RangeOptions {
  /** Hoogste getal dat in de som of de uitkomst mag voorkomen. */
  max: number;
  /** Kleinste waarde voor elk los getal in de som (standaard 0). */
  minOperand?: number;
}

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

let counter = 0;
const nextId = () => `ex-${++counter}`;

/** Tel n dingen, met min <= n <= max. */
export function makeCount(rng: Rng, min: number, max: number): Exercise {
  const n = randInt(rng, min, max);
  return { id: nextId(), operation: 'count', operands: [n], answer: n };
}

/** Herken het getal n tussen andere getallen, met min <= n <= max. */
export function makeRecognize(rng: Rng, min: number, max: number): Exercise {
  const n = randInt(rng, min, max);
  return { id: nextId(), operation: 'recognize', operands: [n], answer: n };
}

/** a + b = ?, met uitkomst <= max. */
export function makeAddition(rng: Rng, { max, minOperand = 0 }: RangeOptions): Exercise {
  const answer = randInt(rng, 2 * minOperand, max);
  const a = randInt(rng, minOperand, answer - minOperand);
  return { id: nextId(), operation: 'add', operands: [a, answer - a], answer };
}

/** a − b = ?, zonder negatieve uitkomst. */
export function makeSubtraction(rng: Rng, { max, minOperand = 0 }: RangeOptions): Exercise {
  const a = randInt(rng, minOperand, max);
  const b = randInt(rng, Math.min(minOperand, a), a);
  return { id: nextId(), operation: 'subtract', operands: [a, b], answer: a - b };
}

/** Fisher–Yates; geeft een nieuwe array terug. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface ChoiceOptions {
  /** Aantal knoppen, inclusief het goede antwoord. */
  count: number;
  min: number;
  max: number;
}

/**
 * Antwoordkeuzes: het goede antwoord plus unieke afleiders binnen [min, max],
 * bij voorkeur dicht bij het antwoord. De volgorde is willekeurig, zodat de
 * plek van het goede antwoord niet te voorspellen is.
 */
export function makeChoices(rng: Rng, answer: number, { count, min, max }: ChoiceOptions): number[] {
  const available = max - min + 1;
  if (answer < min || answer > max) throw new RangeError(`antwoord ${answer} valt buiten ${min}–${max}`);
  const wanted = Math.min(count, available);

  const near = shuffle(rng, [-2, -1, 1, 2].map((d) => answer + d)).filter((n) => n >= min && n <= max);
  const rest = shuffle(
    rng,
    Array.from({ length: available }, (_, i) => min + i).filter((n) => Math.abs(n - answer) > 2),
  );
  const distractors = [...near, ...rest].slice(0, wanted - 1);
  return shuffle(rng, [answer, ...distractors]);
}

/** Kleine seedbare PRNG (mulberry32). */
export function seededRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
