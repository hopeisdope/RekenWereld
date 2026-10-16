import { describe, expect, it } from 'vitest';
import { parseProgress, recordResult } from '../src/state/progress';

describe('voortgang', () => {
  it('bewaart de beste score en telt het aantal keer spelen', () => {
    let p = recordResult({}, 'rivier', 3);
    p = recordResult(p, 'rivier', 1);
    expect(p.rivier).toEqual({ completed: true, bestStars: 3, timesPlayed: 2 });
  });

  it('leest kapotte opgeslagen data veilig in', () => {
    expect(parseProgress(null)).toEqual({});
    expect(parseProgress('x')).toEqual({});
    expect(parseProgress({ a: { completed: true, bestStars: 7 }, b: 3, c: { completed: true, bestStars: 2 } })).toEqual({
      c: { completed: true, bestStars: 2, timesPlayed: 0 },
    });
  });
});
