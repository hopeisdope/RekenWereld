import { describe, expect, it } from 'vitest';
import { solve } from '../src/math/check';
import { seededRng } from '../src/math/generate';
import { getallenbos, missions } from '../src/missions/getallenbos';

describe('missies in het Getallenbos', () => {
  it('heeft precies de drie missies van fase 1', () => {
    expect(getallenbos.missionIds).toEqual(['voetstappen', 'appelmand', 'rivier']);
    for (const id of getallenbos.missionIds) expect(missions[id]).toBeDefined();
  });

  for (const id of getallenbos.missionIds) {
    describe(id, () => {
      it('maakt 5–8 geldige, controleerbare opdrachten (over veel seeds)', () => {
        for (let seed = 0; seed < 200; seed++) {
          const tasks = missions[id].buildTasks(seededRng(seed));
          expect(tasks.length).toBeGreaterThanOrEqual(5);
          expect(tasks.length).toBeLessThanOrEqual(8);
          expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);

          for (const t of tasks) {
            const { exercise } = t;
            expect(solve(exercise)).toBe(exercise.answer);
            expect(Number.isInteger(exercise.answer)).toBe(true);
            expect(exercise.answer).toBeGreaterThanOrEqual(0);
            expect(exercise.answer).toBeLessThanOrEqual(20);

            if (t.interaction === 'choice') {
              expect(t.choices).toBeDefined();
              expect(t.choices!.filter((c) => c === exercise.answer)).toHaveLength(1);
              expect(new Set(t.choices).size).toBe(t.choices!.length);
              expect(t.choices!.length).toBeGreaterThanOrEqual(3);
            } else {
              const [start, jump] = exercise.operands;
              expect(t.line).toEqual({ min: 0, max: 10 });
              expect(jump).toBeGreaterThanOrEqual(1);
              expect(start).toBeGreaterThanOrEqual(0);
              expect(start).toBeLessThanOrEqual(10);
              expect(exercise.answer).toBeLessThanOrEqual(10);
              expect(exercise.answer).not.toBe(start);
            }
          }
        }
      });
    });
  }

  it('appelmand: alleen optellen tot 10 met minstens één appel per groep', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const t of missions.appelmand.buildTasks(seededRng(seed))) {
        expect(t.exercise.operation).toBe('add');
        expect(Math.min(...t.exercise.operands)).toBeGreaterThanOrEqual(1);
        expect(t.exercise.answer).toBeLessThanOrEqual(10);
      }
    }
  });

  it('voetstappen: tellen gaat tot en met 20 en begint bij minstens 1', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const t of missions.voetstappen.buildTasks(seededRng(seed))) {
        expect(['count', 'recognize']).toContain(t.exercise.operation);
        expect(t.exercise.answer).toBeGreaterThanOrEqual(1);
        expect(t.exercise.answer).toBeLessThanOrEqual(20);
      }
    }
  });

  it('geeft geen dubbele opdrachten binnen één missie', () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const id of getallenbos.missionIds) {
        const keys = missions[id].buildTasks(seededRng(seed)).map((t) => `${t.prompt}:${t.exercise.operation}:${t.exercise.operands}`);
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });
});
