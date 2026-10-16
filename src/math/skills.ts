import { solveSteps } from './check';
import {
  makeAddition,
  makeBuild,
  makeChoices,
  makeCompare,
  makeCount,
  makeMakeTen,
  makeMissing,
  makeOrder,
  makeRecognize,
  makeSplit,
  makeSubtraction,
} from './generate';
import type { Exercise, Rng } from './types';

/**
 * Leerdoelen (vaardigheden) voor groep 3 en hun niveaus. Dit is de enige plek
 * waar grenzen staan: pas hier een niveau aan en alle missies volgen.
 */
export type SkillId =
  | 'recognize'
  | 'count'
  | 'build'
  | 'compare'
  | 'order'
  | 'missing'
  | 'add'
  | 'subtract'
  | 'split'
  | 'makeTen';

export interface SkillLevel {
  /** Kleinste en grootste getal dat in de opgave of uitkomst mag voorkomen. */
  min: number;
  max: number;
  /** Optellen/aftrekken: mag de som over het tiental? */
  bridgeTen?: boolean;
  /** Ordenen: aantal getallen. Ontbrekend getal: lengte van de rij. */
  size?: number;
  /** Vergelijken: minimaal verschil (groter = makkelijker). */
  minGap?: number;
  /** Optellen/aftrekken: grootste tweede getal (bv. kleine sprongen op de getallenlijn). */
  maxSecond?: number;
  /** Aantal antwoordknoppen (waar van toepassing). */
  choices: number;
}

export interface Skill {
  id: SkillId;
  /** Voor ouders/leerkracht; niet nodig voor het kind. */
  goal: string;
  levels: readonly SkillLevel[];
}

export const SKILLS: Readonly<Record<SkillId, Skill>> = {
  recognize: {
    id: 'recognize',
    goal: 'Getallen 0–20 herkennen',
    levels: [
      { min: 0, max: 10, choices: 4 },
      { min: 11, max: 20, choices: 4 },
      { min: 0, max: 20, choices: 4 },
    ],
  },
  count: {
    id: 'count',
    goal: 'Hoeveelheden tellen',
    levels: [
      { min: 1, max: 5, choices: 3 },
      { min: 5, max: 10, choices: 3 },
      { min: 11, max: 20, choices: 3 },
    ],
  },
  build: {
    id: 'build',
    goal: 'Een hoeveelheid maken bij een getal',
    levels: [
      { min: 1, max: 5, choices: 0 },
      { min: 3, max: 10, choices: 0 },
    ],
  },
  compare: {
    id: 'compare',
    goal: 'Hoeveelheden en getallen vergelijken (meer)',
    levels: [
      { min: 1, max: 10, minGap: 3, choices: 2 },
      { min: 1, max: 10, minGap: 1, choices: 2 },
      { min: 0, max: 20, minGap: 1, choices: 2 },
    ],
  },
  order: {
    id: 'order',
    goal: 'Getallen ordenen van klein naar groot',
    levels: [
      { min: 0, max: 10, size: 3, choices: 0 },
      { min: 0, max: 20, size: 4, choices: 0 },
    ],
  },
  missing: {
    id: 'missing',
    goal: 'Ontbrekende getallen in de telrij aanvullen',
    levels: [
      { min: 0, max: 10, size: 4, choices: 3 },
      { min: 0, max: 20, size: 5, choices: 4 },
    ],
  },
  add: {
    id: 'add',
    goal: 'Optellen',
    levels: [
      { min: 1, max: 5, choices: 3 },
      { min: 1, max: 10, choices: 3 },
      { min: 0, max: 20, bridgeTen: false, choices: 4 },
    ],
  },
  subtract: {
    id: 'subtract',
    goal: 'Aftrekken',
    levels: [
      { min: 1, max: 5, choices: 3 },
      { min: 1, max: 10, choices: 3 },
      { min: 0, max: 20, bridgeTen: false, choices: 4 },
    ],
  },
  split: {
    id: 'split',
    goal: 'Getallen splitsen',
    levels: [
      { min: 2, max: 5, choices: 3 },
      { min: 5, max: 10, choices: 3 },
    ],
  },
  makeTen: {
    id: 'makeTen',
    goal: 'Aanvullen tot 10',
    levels: [
      { min: 5, max: 9, choices: 3 },
      { min: 1, max: 9, choices: 4 },
    ],
  },
};

/** Niveau opzoeken; een te hoog niveau valt terug op het hoogste. */
export function levelOf(skill: SkillId, level: number): SkillLevel {
  const levels = SKILLS[skill].levels;
  return levels[Math.max(0, Math.min(level, levels.length - 1))];
}

/** Maakt een opgave voor deze vaardigheid op dit niveau. Puur (via `rng`). */
export function generateExercise(skill: SkillId, lv: SkillLevel, rng: Rng): Exercise {
  switch (skill) {
    case 'recognize':
      return makeRecognize(rng, lv.min, lv.max);
    case 'count':
      return makeCount(rng, lv.min, lv.max);
    case 'build':
      return makeBuild(rng, lv.min, lv.max);
    case 'compare':
      return makeCompare(rng, lv.min, lv.max, lv.minGap ?? 1);
    case 'order':
      return makeOrder(rng, lv.min, lv.max, lv.size ?? 3);
    case 'missing':
      return makeMissing(rng, lv.min, lv.max, lv.size ?? 4);
    case 'add':
      return makeAddition(rng, { max: lv.max, minOperand: lv.min, bridgeTen: lv.bridgeTen ?? true, maxSecond: lv.maxSecond });
    case 'subtract':
      return makeSubtraction(rng, { max: lv.max, minOperand: lv.min, bridgeTen: lv.bridgeTen ?? true, maxSecond: lv.maxSecond });
    case 'split':
      return makeSplit(rng, lv.min, lv.max);
    case 'makeTen':
      return makeMakeTen(rng, lv.min, lv.max);
  }
}

/**
 * Didactische afleiders: fouten die kinderen in groep 3 echt maken.
 * - optellen: één ernaast (tel-fout), een van de getallen zelf, verkeerde bewerking
 * - aftrekken: één ernaast, de getallen zelf, optellen i.p.v. aftrekken
 * - herkennen: cijfers omgedraaid (12 ↔ 21) en tien ernaast (4 ↔ 14)
 * - splitsen/aanvullen: het gegeven deel, het totaal
 */
export function didacticDistractors(ex: Exercise): number[] {
  const [a, b = 0] = ex.operands;
  switch (ex.operation) {
    case 'add':
      return [ex.answer + 1, ex.answer - 1, a, b, Math.abs(a - b)];
    case 'subtract':
      return [ex.answer + 1, ex.answer - 1, a, b, a + b];
    case 'recognize': {
      const reversed = a >= 10 ? Number(String(a).split('').reverse().join('')) : a * 10 + 1;
      return [a + 10, a - 10, reversed];
    }
    case 'count':
      return [ex.answer + 1, ex.answer - 1];
    case 'missing':
      return [ex.answer + 1, ex.answer - 1, a + b + 2];
    case 'split':
      return [b, a, ex.answer + 1, ex.answer - 1];
    case 'makeTen':
      return [a, ex.answer + 1, ex.answer - 1, 10];
    default:
      return [];
  }
}

/** Bereik waarbinnen antwoordknoppen voor deze opgave mogen liggen. */
export function choiceRange(ex: Exercise, lv: SkillLevel): { min: number; max: number } {
  switch (ex.operation) {
    case 'recognize':
    case 'missing':
      return { min: 0, max: Math.max(lv.max, 10) };
    case 'count':
      return { min: 1, max: Math.max(lv.max, 10) };
    case 'makeTen':
      return { min: 0, max: 10 };
    default:
      return { min: 0, max: lv.max };
  }
}

/**
 * Antwoordknoppen voor een opgave, of `undefined` als de opgave geen
 * keuzeknoppen heeft (bouwen, ordenen). Vergelijken: de twee hoeveelheden.
 */
export function choicesFor(ex: Exercise, lv: SkillLevel, rng: Rng): number[] | undefined {
  if (ex.operation === 'compare') return [...ex.operands];
  if (ex.operation === 'order' || ex.operation === 'build' || lv.choices < 2) return undefined;
  const { min, max } = choiceRange(ex, lv);
  return makeChoices(rng, ex.answer, { count: lv.choices, min, max, prefer: didacticDistractors(ex) });
}

/** Sleutel om dubbele opgaven binnen een ronde te voorkomen. */
export function exerciseKey(ex: Exercise): string {
  return `${ex.operation}:${ex.operands.join(',')}`;
}

/** Controle voor tests: klopt de opgave met haar eigen operanden? */
export function isConsistent(ex: Exercise): boolean {
  const steps = solveSteps(ex);
  return steps[steps.length - 1] === ex.answer && (!ex.steps || ex.steps.join() === steps.join());
}
