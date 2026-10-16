import { describe, expect, it } from 'vitest';
import { expectedAt, isCorrect, solve, solveSteps, stepCount } from '../src/math/check';
import { crossesTenAdd, crossesTenSubtract, makeChoices, makeOrder, seededRng } from '../src/math/generate';
import { choicesFor, didacticDistractors, generateExercise, isConsistent, levelOf, SKILLS, type SkillId } from '../src/math/skills';

const ALL = Object.keys(SKILLS) as SkillId[];

describe('rekenengine: elke vaardigheid op elk niveau', () => {
  for (const skill of ALL) {
    SKILLS[skill].levels.forEach((lv, i) => {
      it(`${skill} niveau ${i}: geldige opgaven binnen de grenzen (500 seeds)`, () => {
        const rng = seededRng(1000 + i);
        for (let n = 0; n < 500; n++) {
          const ex = generateExercise(skill, lv, rng);
          expect(isConsistent(ex)).toBe(true);
          expect(Number.isInteger(ex.answer)).toBe(true);
          expect(ex.answer).toBeGreaterThanOrEqual(0);
          for (const o of ex.operands) expect(Number.isInteger(o)).toBe(true);

          const [a, b] = ex.operands;
          switch (skill) {
            case 'recognize':
            case 'count':
            case 'build':
              expect(a).toBeGreaterThanOrEqual(lv.min);
              expect(a).toBeLessThanOrEqual(lv.max);
              break;
            case 'compare':
              expect(Math.abs(a - b)).toBeGreaterThanOrEqual(lv.minGap ?? 1);
              expect(Math.min(a, b)).toBeGreaterThanOrEqual(lv.min);
              expect(Math.max(a, b)).toBeLessThanOrEqual(lv.max);
              break;
            case 'order':
              expect(ex.operands).toHaveLength(lv.size!);
              expect(new Set(ex.operands).size).toBe(lv.size);
              expect(ex.operands.join()).not.toBe(ex.steps!.join()); // nooit al gesorteerd
              break;
            case 'missing': {
              const [start, gap, len] = ex.operands;
              expect(len).toBe(lv.size);
              expect(gap).toBeGreaterThanOrEqual(0);
              expect(gap).toBeLessThan(len);
              expect(start).toBeGreaterThanOrEqual(lv.min);
              expect(start + len - 1).toBeLessThanOrEqual(lv.max);
              break;
            }
            case 'add':
              expect(Math.min(a, b)).toBeGreaterThanOrEqual(lv.min);
              expect(ex.answer).toBeLessThanOrEqual(lv.max);
              if (lv.bridgeTen === false) expect(crossesTenAdd(a, b)).toBe(false);
              break;
            case 'subtract':
              expect(a).toBeLessThanOrEqual(lv.max);
              expect(ex.answer).toBeGreaterThanOrEqual(0);
              if (lv.bridgeTen === false) expect(crossesTenSubtract(a, b)).toBe(false);
              break;
            case 'split':
              expect(a).toBeGreaterThanOrEqual(lv.min);
              expect(a).toBeLessThanOrEqual(lv.max);
              expect(b).toBeGreaterThanOrEqual(1);
              expect(ex.answer).toBeGreaterThanOrEqual(1);
              break;
            case 'makeTen':
              expect(a).toBeGreaterThanOrEqual(lv.min);
              expect(a).toBeLessThanOrEqual(lv.max);
              expect(a + ex.answer).toBe(10);
              break;
          }

          const choices = choicesFor(ex, lv, rng);
          if (choices) {
            expect(choices.filter((c) => c === ex.answer)).toHaveLength(1);
            expect(new Set(choices).size).toBe(choices.length);
            for (const c of choices) expect(c).toBeGreaterThanOrEqual(0);
          }
        }
      });
    });
  }

  it('alle grenzen 0 en 20 worden bereikt waar het niveau dat toestaat', () => {
    const rng = seededRng(77);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(generateExercise('recognize', levelOf('recognize', 2), rng).answer);
    expect(seen.has(0)).toBe(true);
    expect(seen.has(20)).toBe(true);
    expect(seen.size).toBe(21);
  });

  it('een te hoog niveau valt terug op het hoogste', () => {
    expect(levelOf('add', 99)).toBe(SKILLS.add.levels[SKILLS.add.levels.length - 1]);
    expect(levelOf('add', -3)).toBe(SKILLS.add.levels[0]);
  });
});

describe('tientalovergang', () => {
  it('herkent sommen over het tiental', () => {
    expect(crossesTenAdd(8, 5)).toBe(true);
    expect(crossesTenAdd(6, 4)).toBe(false); // precies tot 10
    expect(crossesTenAdd(12, 5)).toBe(false);
    expect(crossesTenAdd(17, 3)).toBe(false);
    expect(crossesTenAdd(9, 2)).toBe(true);
    expect(crossesTenSubtract(13, 5)).toBe(true);
    expect(crossesTenSubtract(10, 3)).toBe(false); // vanaf 10
    expect(crossesTenSubtract(18, 6)).toBe(false);
    expect(crossesTenSubtract(15, 5)).toBe(false);
  });
});

describe('antwoordcontrole', () => {
  it('ordenen gaat in stappen: alleen het eerstvolgende getal is goed', () => {
    const ex = makeOrder(seededRng(5), 0, 10, 3);
    const sorted = [...ex.operands].sort((x, y) => x - y);
    expect(stepCount(ex)).toBe(3);
    expect(solveSteps(ex)).toEqual(sorted);
    expect(isCorrect(ex, sorted[0], 0)).toBe(true);
    expect(isCorrect(ex, sorted[1], 0)).toBe(false);
    expect(isCorrect(ex, sorted[1], 1)).toBe(true);
    expect(isCorrect(ex, sorted[2], 3)).toBe(false); // stap buiten bereik
    expect(expectedAt(ex, 2)).toBe(sorted[2]);
  });

  it('weigert niet-gehele en negatieve stappen', () => {
    const ex = { id: 'x', operation: 'add' as const, operands: [2, 3], answer: 5 };
    expect(isCorrect(ex, 5)).toBe(true);
    expect(isCorrect(ex, 5.0000001)).toBe(false);
    expect(isCorrect(ex, Number.NaN)).toBe(false);
    expect(isCorrect(ex, 5, -1)).toBe(false);
    expect(solve(ex)).toBe(5);
  });
});

describe('afleiders', () => {
  it('optellen: bevat typische fouten (één ernaast, verkeerde bewerking)', () => {
    const ex = { id: 'x', operation: 'add' as const, operands: [6, 2], answer: 8 };
    expect(didacticDistractors(ex)).toEqual(expect.arrayContaining([9, 7, 6, 2, 4]));
    const choices = makeChoices(seededRng(1), 8, { count: 3, min: 0, max: 10, prefer: didacticDistractors(ex) });
    expect(choices).toContain(8);
  });

  it('herkennen: cijfers omgedraaid en tien ernaast', () => {
    const ex = { id: 'x', operation: 'recognize' as const, operands: [12], answer: 12 };
    expect(didacticDistractors(ex)).toEqual(expect.arrayContaining([21, 2]));
    const choices = makeChoices(seededRng(3), 12, { count: 4, min: 0, max: 20, prefer: didacticDistractors(ex) });
    expect(choices).not.toContain(21); // buiten bereik valt weg
    expect(choices).toContain(2); // tien ernaast blijft
  });

  it('afleiders liggen nooit buiten het bereik en zijn nooit gelijk aan het antwoord', () => {
    const rng = seededRng(9);
    for (let i = 0; i < 300; i++) {
      const c = makeChoices(rng, 0, { count: 4, min: 0, max: 5, prefer: [-1, 0, 6, 99, 2.5] });
      for (const v of c) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(5);
        expect(Number.isInteger(v)).toBe(true);
      }
      expect(c.filter((v) => v === 0)).toHaveLength(1);
    }
  });

  it('vergelijken: de twee hoeveelheden zijn de keuzes', () => {
    const ex = generateExercise('compare', levelOf('compare', 0), seededRng(4));
    expect(choicesFor(ex, levelOf('compare', 0), seededRng(4))).toEqual([...ex.operands]);
  });
});
