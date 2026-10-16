import type { Exercise, Rng } from './types';

export interface RangeOptions {
  /** Hoogste getal dat in de som of de uitkomst mag voorkomen. */
  max: number;
}

function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

let counter = 0;
const nextId = () => `ex-${++counter}`;

/** a + b = ?, met uitkomst <= max. */
export function makeAddition(rng: Rng, { max }: RangeOptions): Exercise {
  const answer = randInt(rng, 0, max);
  const a = randInt(rng, 0, answer);
  return { id: nextId(), operation: 'add', operands: [a, answer - a], answer };
}

/** a - b = ?, zonder negatieve uitkomst. */
export function makeSubtraction(rng: Rng, { max }: RangeOptions): Exercise {
  const a = randInt(rng, 0, max);
  const b = randInt(rng, 0, a);
  return { id: nextId(), operation: 'subtract', operands: [a, b], answer: a - b };
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
