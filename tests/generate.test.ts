import { describe, expect, it } from 'vitest';
import { makeAddition, makeSubtraction, seededRng } from '../src/math/generate';

describe('oefeningengenerator', () => {
  it('optellen blijft binnen het bereik', () => {
    const rng = seededRng(1);
    for (let i = 0; i < 500; i++) {
      const ex = makeAddition(rng, { max: 10 });
      const [a, b] = ex.operands;
      expect(a + b).toBe(ex.answer);
      expect(ex.answer).toBeLessThanOrEqual(10);
      expect(Math.min(a, b)).toBeGreaterThanOrEqual(0);
    }
  });

  it('aftrekken geeft nooit een negatieve uitkomst', () => {
    const rng = seededRng(2);
    for (let i = 0; i < 500; i++) {
      const ex = makeSubtraction(rng, { max: 20 });
      const [a, b] = ex.operands;
      expect(a - b).toBe(ex.answer);
      expect(ex.answer).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(20);
    }
  });

  it('dezelfde seed geeft dezelfde reeks', () => {
    const x = makeAddition(seededRng(42), { max: 20 });
    const y = makeAddition(seededRng(42), { max: 20 });
    expect(x.operands).toEqual(y.operands);
  });
});
