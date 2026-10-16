import { describe, expect, it } from 'vitest';
import { solve } from '../src/math/check';
import { seededRng } from '../src/math/generate';
import { demoTask } from '../src/missions/demos';
import { getallenbos, missions } from '../src/missions/getallenbos';
import type { PromptKind } from '../src/missions/types';
import { demoNeeded, shouldPointAtAnswer, suggestedMission } from '../src/state/guidance';
import { DEFAULT_SETTINGS, markDemoSeen, parseSettings } from '../src/state/settings';
import { currentTask, reduce, startSession } from '../src/state/session';

const KINDS: PromptKind[] = ['count', 'recognize', 'add', 'jump'];

describe('voorbeelden (voordoen en zelf proberen)', () => {
  it('elke soort opdracht in de missies heeft een geldig voorbeeld', () => {
    const used = new Set(getallenbos.missionIds.flatMap((id) => missions[id].buildTasks(seededRng(1)).map((t) => t.prompt)));
    for (const kind of used) {
      const t = demoTask(kind, seededRng(2));
      expect(t.prompt).toBe(kind);
      expect(solve(t.exercise)).toBe(t.exercise.answer);
      if (t.interaction === 'choice') expect(t.choices).toContain(t.exercise.answer);
      else expect(t.line).toBeDefined();
    }
  });

  it('een voorbeeld is op te lossen met de gewone missieflow', () => {
    for (const kind of KINDS) {
      let s = startSession('demo', [demoTask(kind, seededRng(3))]);
      s = reduce(s, { type: 'answer', taskId: currentTask(s).id, value: currentTask(s).exercise.answer });
      expect(s.phase).toBe('correct');
    }
  });

  it('voorbeeld alleen bij een nieuwe soort opdracht, daarna niet meer', () => {
    const task = missions.appelmand.buildTasks(seededRng(4))[0];
    expect(demoNeeded(task, [])).toBe('add');
    const seen = markDemoSeen(DEFAULT_SETTINGS, 'add').seenDemos;
    expect(demoNeeded(task, seen)).toBeNull();
  });

  it('voetstappen introduceert tellen én getallen zoeken met elk een eigen voorbeeld', () => {
    const tasks = missions.voetstappen.buildTasks(seededRng(5));
    let seen: PromptKind[] = [];
    const demos: PromptKind[] = [];
    for (const t of tasks) {
      const k = demoNeeded(t, seen);
      if (k) {
        demos.push(k);
        seen = [...seen, k];
      }
    }
    expect(demos).toEqual(['count', 'recognize']);
  });
});

describe('instellingen', () => {
  it('leest kapotte of oude opslag veilig in', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ sound: 'ja', seenDemos: ['add', 'onzin', 3] })).toEqual({ sound: true, seenDemos: ['add'] });
    expect(parseSettings({ sound: false, seenDemos: 'add' })).toEqual({ sound: false, seenDemos: [] });
  });

  it('markDemoSeen voegt niet dubbel toe', () => {
    const s = markDemoSeen(markDemoSeen(DEFAULT_SETTINGS, 'jump'), 'jump');
    expect(s.seenDemos).toEqual(['jump']);
  });
});

describe('aanwijzen', () => {
  it('de hand wijst de eerste ongespeelde missie aan', () => {
    const ids = getallenbos.missionIds;
    expect(suggestedMission(ids, {})).toBe('voetstappen');
    expect(suggestedMission(ids, { voetstappen: { completed: true, bestStars: 1, timesPlayed: 1 } })).toBe('appelmand');
    const all = Object.fromEntries(ids.map((id) => [id, { completed: true, bestStars: 3 as const, timesPlayed: 1 }]));
    expect(suggestedMission(ids, all)).toBe('voetstappen');
  });

  it('na twee fouten bij veel keuzes wijst de hand het antwoord aan; niet bij drie knoppen', () => {
    expect(shouldPointAtAnswer(1, 10)).toBe(false);
    expect(shouldPointAtAnswer(2, 10)).toBe(true);
    expect(shouldPointAtAnswer(2, 4)).toBe(true);
    expect(shouldPointAtAnswer(2, 3)).toBe(false);
  });
});
