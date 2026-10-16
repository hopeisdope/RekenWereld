import type { Exercise, Rng } from './types';

export interface RangeOptions {
  /** Hoogste getal dat in de som of de uitkomst mag voorkomen. */
  max: number;
  /** Kleinste waarde voor elk los getal in de som (standaard 0). */
  minOperand?: number;
  /** Mag de som over het tiental gaan (bv. 8 + 5)? Standaard ja. */
  bridgeTen?: boolean;
  /** Grootste tweede getal (bv. sprongen op de getallenlijn klein houden). */
  maxSecond?: number;
}

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

let counter = 0;
const nextId = () => `ex-${++counter}`;
const exercise = (operation: Exercise['operation'], operands: number[], answer: number, steps?: number[]): Exercise => ({
  id: nextId(),
  operation,
  operands,
  answer,
  ...(steps ? { steps } : {}),
});

/** Gaat a + b over een tiental heen (8 + 5), anders dan precies tot een tiental (6 + 4)? */
export function crossesTenAdd(a: number, b: number): boolean {
  const sum = a + b;
  return Math.floor(a / 10) !== Math.floor(sum / 10) && sum % 10 !== 0;
}

/** Gaat a − b terug over een tiental heen (13 − 5), anders dan vanaf een tiental (10 − 3)? */
export function crossesTenSubtract(a: number, b: number): boolean {
  return Math.floor(a / 10) !== Math.floor((a - b) / 10) && a % 10 !== 0;
}

/** Herhaal `make` tot `ok` klopt (met een veilige bovengrens). */
function until(make: () => Exercise, ok: (ex: Exercise) => boolean): Exercise {
  let ex = make();
  for (let i = 0; i < 200 && !ok(ex); i++) ex = make();
  if (!ok(ex)) throw new Error(`geen geldige opgave gevonden voor ${ex.operation}`);
  return ex;
}

/** Tel n dingen, met min <= n <= max. */
export function makeCount(rng: Rng, min: number, max: number): Exercise {
  const n = randInt(rng, min, max);
  return exercise('count', [n], n);
}

/** Herken het getal n, met min <= n <= max. */
export function makeRecognize(rng: Rng, min: number, max: number): Exercise {
  const n = randInt(rng, min, max);
  return exercise('recognize', [n], n);
}

/** Maak een hoeveelheid van n voorwerpen. */
export function makeBuild(rng: Rng, min: number, max: number): Exercise {
  const n = randInt(rng, min, max);
  return exercise('build', [n], n);
}

/** a + b = ?, met uitkomst <= max. */
export function makeAddition(rng: Rng, { max, minOperand = 0, bridgeTen = true, maxSecond = max }: RangeOptions): Exercise {
  return until(
    () => {
      const b = randInt(rng, minOperand, Math.min(maxSecond, max - minOperand));
      const a = randInt(rng, minOperand, max - b);
      return exercise('add', [a, b], a + b);
    },
    (ex) => bridgeTen || !crossesTenAdd(ex.operands[0], ex.operands[1]),
  );
}

/** a − b = ?, zonder negatieve uitkomst. */
export function makeSubtraction(rng: Rng, { max, minOperand = 0, bridgeTen = true, maxSecond = max }: RangeOptions): Exercise {
  return until(
    () => {
      const a = randInt(rng, minOperand, max);
      const b = randInt(rng, Math.min(minOperand, a), Math.min(a, maxSecond));
      return exercise('subtract', [a, b], a - b);
    },
    (ex) => bridgeTen || !crossesTenSubtract(ex.operands[0], ex.operands[1]),
  );
}

/** Welke is meer: a of b? Verschil minstens `minGap` (groter verschil = makkelijker). */
export function makeCompare(rng: Rng, min: number, max: number, minGap = 1): Exercise {
  return until(
    () => {
      const a = randInt(rng, min, max);
      const b = randInt(rng, min, max);
      return exercise('compare', [a, b], Math.max(a, b));
    },
    (ex) => Math.abs(ex.operands[0] - ex.operands[1]) >= minGap,
  );
}

/** Zet `size` verschillende getallen tussen min en max van klein naar groot. */
export function makeOrder(rng: Rng, min: number, max: number, size: number): Exercise {
  if (max - min + 1 < size) throw new RangeError('bereik te klein om te ordenen');
  const pool = shuffle(rng, Array.from({ length: max - min + 1 }, (_, i) => min + i));
  const picked = pool.slice(0, size);
  const sorted = [...picked].sort((x, y) => x - y);
  // Nooit al gesorteerd aanbieden: dan valt er niets te ordenen.
  const shown = until(
    () => exercise('order', shuffle(rng, picked), sorted[sorted.length - 1], sorted),
    (ex) => ex.operands.some((v, i) => v !== sorted[i]),
  );
  return shown;
}

/** Rij van `length` opeenvolgende getallen binnen [min, max] met één gat (niet altijd aan het eind). */
export function makeMissing(rng: Rng, min: number, max: number, length: number): Exercise {
  const start = randInt(rng, min, max - length + 1);
  const gap = randInt(rng, 0, length - 1);
  return exercise('missing', [start, gap, length], start + gap);
}

/** Splits `total` in een gegeven deel en een te vinden deel. Beide delen >= minPart. */
export function makeSplit(rng: Rng, minTotal: number, maxTotal: number, minPart = 1): Exercise {
  const total = randInt(rng, Math.max(minTotal, 2 * minPart), maxTotal);
  const part = randInt(rng, minPart, total - minPart);
  return exercise('split', [total, part], total - part);
}

/** n + ? = 10, met minFilled <= n <= maxFilled. */
export function makeMakeTen(rng: Rng, minFilled = 1, maxFilled = 9): Exercise {
  const n = randInt(rng, minFilled, maxFilled);
  return exercise('makeTen', [n], 10 - n);
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
  /**
   * Didactische afleiders die voorrang krijgen (bv. veelgemaakte fouten),
   * mits binnen het bereik en verschillend van het antwoord.
   */
  prefer?: readonly number[];
}

/**
 * Antwoordkeuzes: het goede antwoord plus unieke afleiders binnen [min, max].
 * Volgorde van voorkeur: `prefer`, dan dichtbij (±1, ±2), dan de rest.
 * De volgorde van de knoppen is willekeurig, zodat de plek van het goede
 * antwoord niet te voorspellen is.
 */
export function makeChoices(rng: Rng, answer: number, { count, min, max, prefer = [] }: ChoiceOptions): number[] {
  const available = max - min + 1;
  if (answer < min || answer > max) throw new RangeError(`antwoord ${answer} valt buiten ${min}–${max}`);
  const wanted = Math.min(count, available);
  const inRange = (n: number) => Number.isInteger(n) && n >= min && n <= max && n !== answer;

  const preferred = shuffle(rng, [...new Set(prefer)].filter(inRange));
  const near = shuffle(rng, [-2, -1, 1, 2].map((d) => answer + d)).filter(inRange);
  const rest = shuffle(
    rng,
    Array.from({ length: available }, (_, i) => min + i).filter((n) => inRange(n) && Math.abs(n - answer) > 2),
  );
  // Maximaal de helft van de afleiders uit `prefer`, zodat er ook dichtbij-afleiders zijn.
  const fromPrefer = preferred.slice(0, Math.max(1, Math.floor((wanted - 1) / 2)));
  const distractors = [...new Set([...fromPrefer, ...near, ...preferred, ...rest])].slice(0, wanted - 1);
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
