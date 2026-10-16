import { describe, expect, it } from 'vitest';
import { makeChoices, seededRng, shuffle } from '../src/math/generate';

describe('antwoordkeuzes', () => {
  it('bevatten het antwoord precies één keer, zonder dubbele waarden, binnen het bereik', () => {
    const rng = seededRng(7);
    for (let answer = 0; answer <= 20; answer++) {
      for (let i = 0; i < 20; i++) {
        const choices = makeChoices(rng, answer, { count: 4, min: 0, max: 20 });
        expect(choices).toHaveLength(4);
        expect(choices.filter((c) => c === answer)).toHaveLength(1);
        expect(new Set(choices).size).toBe(4);
        for (const c of choices) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(20);
        }
      }
    }
  });

  it('zetten het goede antwoord niet steeds op dezelfde plek', () => {
    const rng = seededRng(3);
    const positions = new Set<number>();
    for (let i = 0; i < 60; i++) positions.add(makeChoices(rng, 5, { count: 3, min: 0, max: 10 }).indexOf(5));
    expect(positions).toEqual(new Set([0, 1, 2]));
  });

  it('werken ook aan de rand van een klein bereik', () => {
    expect(makeChoices(seededRng(1), 0, { count: 3, min: 0, max: 1 }).sort()).toEqual([0, 1]);
  });

  it('weigeren een antwoord buiten het bereik', () => {
    expect(() => makeChoices(seededRng(1), 11, { count: 3, min: 0, max: 10 })).toThrow(RangeError);
  });

  it('shuffle behoudt alle elementen', () => {
    expect(shuffle(seededRng(9), [1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
