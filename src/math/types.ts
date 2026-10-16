/** Een rekenopgave, los van hoe die getoond of beantwoord wordt. */
export type Operation = 'count' | 'recognize' | 'add' | 'subtract';

export interface Exercise {
  id: string;
  operation: Operation;
  /**
   * count/recognize: [n]
   * add/subtract:    [a, b]  → a + b of a − b
   */
  operands: readonly number[];
  answer: number;
}

/** Randombron met waarden in [0, 1), zodat oefeningen testbaar zijn. */
export type Rng = () => number;
