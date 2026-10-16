import type { Exercise } from './types';

/** Aantal antwoorden dat bij deze opgave hoort (ordenen: meerdere, anders 1). */
export function stepCount(ex: Exercise): number {
  return ex.steps?.length ?? 1;
}

/** Het verwachte antwoord bij stap `step`. */
export function expectedAt(ex: Exercise, step = 0): number {
  return ex.steps ? ex.steps[step] : ex.answer;
}

/** Klopt het gegeven antwoord voor deze stap? Alleen hele getallen tellen. */
export function isCorrect(ex: Exercise, given: number, step = 0): boolean {
  return Number.isInteger(given) && step >= 0 && step < stepCount(ex) && given === expectedAt(ex, step);
}

/** Herberekent het antwoord uit de operanden; gebruikt om opgaven te valideren. */
export function solve(ex: Exercise): number {
  const [a, b = 0] = ex.operands;
  switch (ex.operation) {
    case 'count':
    case 'recognize':
    case 'build':
      return a;
    case 'compare':
      return Math.max(a, b);
    case 'order':
      return Math.max(...ex.operands);
    case 'missing':
      return a + b;
    case 'add':
      return a + b;
    case 'subtract':
      return a - b;
    case 'split':
      return a - b;
    case 'makeTen':
      return 10 - a;
  }
}

/** Volledige oplossing in stappen (voor ordenen de gesorteerde rij). */
export function solveSteps(ex: Exercise): number[] {
  return ex.operation === 'order' ? [...ex.operands].sort((x, y) => x - y) : [solve(ex)];
}
