/** Een rekenopgave, los van hoe die getoond of beantwoord wordt. */
export type Operation = 'count' | 'add' | 'subtract';

export interface Exercise {
  id: string;
  operation: Operation;
  operands: readonly number[];
  answer: number;
}

/** Deterministische randombron, zodat oefeningen testbaar zijn. */
export type Rng = () => number;
