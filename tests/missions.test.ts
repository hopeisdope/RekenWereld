import { describe, expect, it } from 'vitest';
import { expectedAt, solve, stepCount } from '../src/math/check';
import { seededRng } from '../src/math/generate';
import { buildRoundTasks } from '../src/missions/build';
import { getallenbos, missions } from '../src/missions/getallenbos';

describe('missies in het Getallenbos', () => {
  it('heeft de drie missies, elk met drie rondes', () => {
    expect(getallenbos.missionIds).toEqual(['voetstappen', 'appelmand', 'rivier']);
    for (const id of getallenbos.missionIds) expect(missions[id].rounds).toHaveLength(3);
  });

  for (const id of getallenbos.missionIds) {
    for (let round = 0; round < 3; round++) {
      it(`${id} ronde ${round + 1}: 5–8 geldige, controleerbare opdrachten (200 seeds)`, () => {
        for (let seed = 0; seed < 200; seed++) {
          const tasks = buildRoundTasks(missions[id], round, seededRng(seed));
          expect(tasks.length).toBeGreaterThanOrEqual(5);
          expect(tasks.length).toBeLessThanOrEqual(8);
          expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
          for (const t of tasks) {
            const { exercise: ex } = t;
            expect(solve(ex)).toBe(ex.answer);
            expect(ex.answer).toBeGreaterThanOrEqual(0);
            expect(ex.answer).toBeLessThanOrEqual(20);
            for (const o of ex.operands) expect(o).toBeGreaterThanOrEqual(0);
            if (t.interaction === 'choice') {
              expect(t.choices!.filter((c) => c === ex.answer)).toHaveLength(1);
              expect(new Set(t.choices).size).toBe(t.choices!.length);
              expect(t.choices!.length).toBeGreaterThanOrEqual(2);
            }
            if (t.interaction === 'numberline') {
              const [start, jump] = ex.operands;
              expect(jump).toBeGreaterThanOrEqual(1);
              expect(start).toBeGreaterThanOrEqual(t.line!.min);
              expect(start).toBeLessThanOrEqual(t.line!.max);
              expect(ex.answer).toBeGreaterThanOrEqual(t.line!.min);
              expect(ex.answer).toBeLessThanOrEqual(t.line!.max);
            }
            if (t.interaction === 'sequence') {
              for (let s = 0; s < stepCount(ex); s++) expect(ex.operands).toContain(expectedAt(ex, s));
            }
          }
        }
      });
    }
  }

  it('geen dubbele opgaven binnen één ronde', () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const id of getallenbos.missionIds) {
        for (let round = 0; round < 3; round++) {
          const keys = buildRoundTasks(missions[id], round, seededRng(seed)).map((t) => `${t.prompt}:${t.exercise.operation}:${t.exercise.operands}`);
          expect(new Set(keys).size).toBe(keys.length);
        }
      }
    }
  });

  it('ondersteuning wordt binnen een ronde afgebouwd: nooit abstract vóór concreet', () => {
    for (const id of getallenbos.missionIds) {
      for (const r of missions[id].rounds) {
        const supports = r.specs.map((s) => s.support ?? 'concrete');
        const firstAbstract = supports.indexOf('abstract');
        if (firstAbstract >= 0) expect(supports[0]).toBe('concrete');
      }
    }
  });

  it('voetstappen ronde 1 blijft tellen en herkennen tot 10 (regressie fase 1)', () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const t of buildRoundTasks(missions.voetstappen, 0, seededRng(seed))) {
        expect(['count', 'recognize']).toContain(t.exercise.operation);
        expect(t.exercise.answer).toBeLessThanOrEqual(10);
      }
    }
  });

  it('appelmand ronde 1 blijft optellen tot 10 met minstens één per groep (regressie fase 1)', () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const t of buildRoundTasks(missions.appelmand, 0, seededRng(seed))) {
        expect(t.exercise.operation).toBe('add');
        expect(Math.min(...t.exercise.operands)).toBeGreaterThanOrEqual(1);
        expect(t.exercise.answer).toBeLessThanOrEqual(10);
      }
    }
  });

  it('rivier ronde 1 blijft vooruit springen op 0–10 (regressie fase 1)', () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const t of buildRoundTasks(missions.rivier, 0, seededRng(seed))) {
        expect(t.prompt).toBe('jump');
        expect(t.exercise.operation).toBe('add');
        expect(t.line).toEqual({ min: 0, max: 10 });
        expect(t.exercise.operands[1]).toBeLessThanOrEqual(4);
      }
    }
  });
});
