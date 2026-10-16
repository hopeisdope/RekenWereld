import type { Exercise } from './types';

/** Klopt het gegeven antwoord? Alleen hele getallen tellen. */
export function isCorrect(ex: Exercise, given: number): boolean {
  return Number.isInteger(given) && given === ex.answer;
}

/** Herberekent het antwoord uit de operanden; gebruikt om opgaven te valideren. */
export function solve(ex: Exercise): number {
  const [a, b = 0] = ex.operands;
  switch (ex.operation) {
    case 'count':
    case 'recognize':
      return a;
    case 'add':
      return a + b;
    case 'subtract':
      return a - b;
  }
}
