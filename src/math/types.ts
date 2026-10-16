/** Een rekenopgave, los van hoe die getoond of beantwoord wordt. */
export type Operation =
  | 'count' // tel n dingen
  | 'recognize' // herken het getal n
  | 'build' // maak een hoeveelheid van n
  | 'compare' // welke van twee is meer
  | 'order' // zet getallen van klein naar groot
  | 'missing' // welk getal ontbreekt in de rij
  | 'add'
  | 'subtract'
  | 'split' // splits totaal in deel + ?
  | 'makeTen'; // vul n aan tot 10

export interface Exercise {
  id: string;
  operation: Operation;
  /**
   * count/recognize/build: [n]
   * compare:               [a, b]           (a ≠ b)
   * order:                 [x, y, z, ...]   (ongesorteerd)
   * missing:               [start, gatIndex, lengte]  rij start, start+1, ...
   * add/subtract:          [a, b]           a + b of a − b
   * split:                 [totaal, deel]
   * makeTen:               [n]
   */
  operands: readonly number[];
  /** Het (laatste) goede antwoord. */
  answer: number;
  /** Meerstaps-antwoord (ordenen): de verwachte antwoorden in volgorde. */
  steps?: readonly number[];
}

/** Randombron met waarden in [0, 1), zodat oefeningen testbaar zijn. */
export type Rng = () => number;
