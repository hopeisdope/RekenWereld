import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/math/generate';
import { buildRoundTasks } from '../src/missions/build';
import { missions } from '../src/missions/getallenbos';
import { createPlacement, freeSlots, place, placementFor, takeBack } from '../src/state/placement';
import { parseResume, snapshot } from '../src/state/resume';
import { currentTask, reduce, startSession } from '../src/state/session';

describe('slepen: plaatsen in vakjes', () => {
  it('legt tot het vol is; daarna gaat het voorwerp terug (geen plaats)', () => {
    let p = createPlacement(3, 1, 4);
    const results = [];
    for (let i = 0; i < 4; i++) {
      const r = place(p);
      results.push(r.ok ? 'ok' : r.reason);
      p = r.state;
    }
    expect(results).toEqual(['ok', 'ok', 'full', 'full']);
    expect(p).toEqual({ capacity: 3, fixed: 1, placed: 2, tray: 2 });
    expect(freeSlots(p)).toBe(0);
  });

  it('terugleggen haalt alleen zelf gelegde voorwerpen weg', () => {
    let p = createPlacement(10, 8, 4);
    p = takeBack(p);
    expect(p.placed).toBe(0);
    expect(p.fixed).toBe(8);
    p = (place(p) as { state: typeof p }).state;
    p = takeBack(p);
    expect(p).toEqual(createPlacement(10, 8, 4));
  });

  it('lege voorraad', () => {
    expect(place(createPlacement(10, 0, 0))).toEqual({ ok: false, reason: 'empty-tray', state: createPlacement(10, 0, 0) });
  });

  it('elke sleep-opdracht is oplosbaar en niet triviaal (meer voorwerpen dan nodig)', () => {
    for (let n = 1; n <= 20; n++) {
      const p = placementFor('build', [n]);
      expect(p.tray).toBeGreaterThan(n);
      expect(p.capacity - p.fixed).toBeGreaterThanOrEqual(n);
    }
    for (let n = 1; n <= 9; n++) {
      const p = placementFor('makeTen', [n]);
      expect(p.fixed).toBe(n);
      expect(p.capacity).toBe(10);
      expect(p.tray).toBeGreaterThan(10 - n);
    }
  });
});

describe('hervatten van een missie', () => {
  const tasks = buildRoundTasks(missions.appelmand, 1, seededRng(4));

  it('na een goed antwoord hervat je bij de volgende opdracht', () => {
    let s = startSession('appelmand', tasks);
    s = reduce(s, { type: 'answer', taskId: currentTask(s).id, value: currentTask(s).exercise.answer });
    const point = snapshot(s, 1);
    expect(point.index).toBe(1);
    expect(point.firstTry).toBe(1);
    const back = parseResume(JSON.parse(JSON.stringify(point)))!;
    expect(back.round).toBe(1);
    const resumed = startSession('appelmand', back.tasks, back.index, back.firstTry);
    expect(currentTask(resumed).id).toBe(tasks[1].id);
  });

  it('midden in een opdracht (na een fout) hervat je bij dezelfde opdracht', () => {
    let s = startSession('appelmand', tasks, 2);
    const wrong = currentTask(s).choices!.find((c) => c !== currentTask(s).exercise.answer)!;
    s = reduce(s, { type: 'answer', taskId: currentTask(s).id, value: wrong });
    expect(snapshot(s, 1).index).toBe(2);
  });

  it('kapotte of gemanipuleerde opslag wordt genegeerd', () => {
    const ok = JSON.parse(JSON.stringify(snapshot(startSession('appelmand', tasks), 1)));
    expect(parseResume(ok)).not.toBeNull();
    expect(parseResume(null)).toBeNull();
    expect(parseResume({ ...ok, index: 99 })).toBeNull();
    expect(parseResume({ ...ok, index: -1 })).toBeNull();
    expect(parseResume({ ...ok, tasks: [] })).toBeNull();
    const broken = JSON.parse(JSON.stringify(ok));
    broken.tasks[0].exercise.answer = 999; // antwoord klopt niet meer met de som
    expect(parseResume(broken)).toBeNull();
    const noChoice = JSON.parse(JSON.stringify(ok));
    noChoice.tasks[0].choices = [123];
    expect(parseResume(noChoice)).toBeNull();
    expect(parseResume({ ...ok, firstTry: 50 })!.firstTry).toBe(0); // nooit meer dan gedaan
  });
});
