import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/math/generate';
import { buildRoundTasks, rebuildUpcoming, type Adaptation } from '../src/missions/build';
import { demoTask } from '../src/missions/demos';
import { getallenbos, missions } from '../src/missions/getallenbos';
import { demoKey, type DemoKey } from '../src/state/settings';

const adaptations: (Adaptation | undefined)[] = [
  undefined,
  { shift: () => -1, needsPractice: () => true, maxTasks: 8 },
  { shift: () => 1, needsPractice: () => false, maxTasks: 8 },
];

describe('geen hetzelfde getal twee opdrachten na elkaar', () => {
  it('in elke ronde, ook met aanpassing en extra herhaling (300 seeds)', () => {
    for (const id of getallenbos.missionIds) {
      for (let round = 0; round < 3; round++) {
        for (const adapt of adaptations) {
          for (let seed = 0; seed < 300; seed++) {
            const answers = buildRoundTasks(missions[id], round, seededRng(seed), adapt).map((t) => t.exercise.answer);
            for (let i = 1; i < answers.length; i++) expect(answers[i], `${id} r${round} seed ${seed}: ${answers}`).not.toBe(answers[i - 1]);
          }
        }
      }
    }
  });

  it('ook na het opnieuw maken van komende opdrachten (adaptief)', () => {
    for (let seed = 0; seed < 300; seed++) {
      const tasks = buildRoundTasks(missions.appelmand, 0, seededRng(seed));
      const answers = rebuildUpcoming(tasks, 1, 'add', missions.appelmand, seededRng(seed + 1), -1).map((t) => t.exercise.answer);
      for (let i = 1; i < answers.length; i++) expect(answers[i]).not.toBe(answers[i - 1]);
    }
  });
});

describe('voorbeelden herhalen geen getal', () => {
  const keys = new Set<DemoKey>(getallenbos.missionIds.flatMap((id) => [0, 1, 2].flatMap((r) => buildRoundTasks(missions[id], r, seededRng(1)).map(demoKey))));

  it('voordoen en zelf proberen hebben een ander getal, en geen van beide dat van de volgende opdracht', () => {
    for (const key of keys) {
      for (let next = 0; next <= 20; next++) {
        const watch = demoTask(key, seededRng(1), 'apples', [next]).exercise.answer;
        const tryIt = demoTask(key, seededRng(2), 'apples', [watch, next]).exercise.answer;
        expect(watch, key).not.toBe(next);
        expect(tryIt, key).not.toBe(watch);
        expect(tryIt, key).not.toBe(next);
      }
    }
  });
});
