import { describe, expect, it } from 'vitest';
import { nextRound, parseProgress, recordResult } from '../src/state/progress';

describe('voortgang', () => {
  it('bewaart de beste score en telt het aantal keer spelen', () => {
    let p = recordResult({}, 'rivier', 3, 0, 3);
    p = recordResult(p, 'rivier', 1, 0, 3);
    expect(p.rivier).toEqual({ roundsDone: 1, completed: true, bestStars: 3, timesPlayed: 2 });
  });

  it('leest kapotte opgeslagen data veilig in', () => {
    expect(parseProgress(null)).toEqual({});
    expect(parseProgress('x')).toEqual({});
    expect(parseProgress({ a: { completed: true, bestStars: 7 }, b: 3, c: { completed: true, bestStars: 2 } })).toEqual({
      c: { roundsDone: 1, completed: true, bestStars: 2, timesPlayed: 0 },
    });
  });
});

describe('rondes', () => {
  it('alleen de eerstvolgende ronde telt als nieuwe voortgang', () => {
    let p = recordResult({}, 'appelmand', 2, 0, 3);
    expect(p.appelmand.roundsDone).toBe(1);
    p = recordResult(p, 'appelmand', 2, 0, 3); // ronde 1 herhalen
    expect(p.appelmand.roundsDone).toBe(1);
    p = recordResult(p, 'appelmand', 2, 1, 3);
    p = recordResult(p, 'appelmand', 2, 2, 3);
    expect(p.appelmand.roundsDone).toBe(3);
    p = recordResult(p, 'appelmand', 2, 2, 3);
    expect(p.appelmand.roundsDone).toBe(3); // nooit meer dan het aantal rondes
  });

  it('volgende ronde: eerst de nieuwe, daarna rondgaand herhalen', () => {
    expect(nextRound({}, 'x', 3)).toBe(0);
    expect(nextRound({ x: { roundsDone: 2, completed: true, bestStars: 1, timesPlayed: 2 } }, 'x', 3)).toBe(2);
    const done = (t: number) => ({ x: { roundsDone: 3, completed: true, bestStars: 1 as const, timesPlayed: t } });
    expect([3, 4, 5, 6].map((t) => nextRound(done(t), 'x', 3))).toEqual([0, 1, 2, 0]);
  });

  it('oude opslag (fase 1, zonder rondes) telt als ronde 1 klaar', () => {
    expect(parseProgress({ rivier: { completed: true, bestStars: 2, timesPlayed: 4 } }).rivier.roundsDone).toBe(1);
    expect(parseProgress({ rivier: { completed: false, bestStars: 0 } }).rivier.roundsDone).toBe(0);
    expect(parseProgress({ rivier: { completed: true, bestStars: 1, roundsDone: 9 } }).rivier.roundsDone).toBe(3);
  });
});
