import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/math/generate';
import { buildRoundTasks } from '../src/missions/build';
import { missions } from '../src/missions/getallenbos';
import { currentTask, reduce, startSession, starsFor, type SessionState } from '../src/state/session';

function freshSession(): SessionState {
  return startSession('appelmand', buildRoundTasks(missions.appelmand, 1, seededRng(1)));
}
const answerOf = (s: SessionState) => currentTask(s).exercise.answer;
const wrongOf = (s: SessionState) => currentTask(s).choices!.find((c) => c !== answerOf(s))!;
const answer = (s: SessionState, value: number) => reduce(s, { type: 'answer', taskId: currentTask(s).id, value });

describe('missieflow', () => {
  it('goed antwoord → vieren → volgende opdracht', () => {
    let s = freshSession();
    s = answer(s, answerOf(s));
    expect(s.phase).toBe('correct');
    expect(s.feedback).toBe('correct');
    s = reduce(s, { type: 'next' });
    expect(s.index).toBe(1);
    expect(s.phase).toBe('asking');
    expect(s.showHint).toBe(false);
  });

  it('fout antwoord beëindigt de missie niet en zet de hint aan', () => {
    let s = freshSession();
    s = answer(s, wrongOf(s));
    expect(s.phase).toBe('asking');
    expect(s.index).toBe(0);
    expect(s.showHint).toBe(true);
    expect(s.feedback).toBe('tryAgain');
    s = answer(s, answerOf(s));
    expect(s.phase).toBe('correct');
    expect(s.firstTry).toBe(0);
  });

  it('dubbel tikken op het goede antwoord slaat geen opdracht over', () => {
    let s = freshSession();
    const task = currentTask(s);
    s = answer(s, answerOf(s));
    const after = reduce(s, { type: 'answer', taskId: task.id, value: task.exercise.answer });
    expect(after).toBe(s);
    s = reduce(s, { type: 'next' });
    expect(reduce(s, { type: 'next' })).toBe(s); // 'next' zonder goed antwoord doet niets
    // Een verlate tik van de vorige opdracht telt niet voor de nieuwe.
    expect(reduce(s, { type: 'answer', taskId: task.id, value: answerOf(s) })).toBe(s);
    expect(s.index).toBe(1);
  });

  it('nogmaals op hetzelfde foute antwoord tikken verandert niets', () => {
    let s = freshSession();
    const w = wrongOf(s);
    s = answer(s, w);
    expect(answer(s, w)).toBe(s);
  });

  it('na de laatste opdracht is de missie klaar', () => {
    let s = freshSession();
    while (s.phase !== 'finished') {
      s = answer(s, answerOf(s));
      s = reduce(s, { type: 'next' });
    }
    expect(s.index).toBe(s.tasks.length - 1);
    expect(s.firstTry).toBe(s.tasks.length);
    expect(starsFor(s)).toBe(3);
  });
});

describe('sterren', () => {
  const tasks = new Array(6).fill(null) as never[];
  it('altijd minstens één ster, nooit straf', () => {
    expect(starsFor({ tasks, firstTry: 0 })).toBe(1);
    expect(starsFor({ tasks, firstTry: 3 })).toBe(2);
    expect(starsFor({ tasks, firstTry: 5 })).toBe(3);
    expect(starsFor({ tasks, firstTry: 6 })).toBe(3);
  });
});

describe('meerstaps-opdrachten (ordenen)', () => {
  const orderSession = () => startSession('voetstappen', buildRoundTasks(missions.voetstappen, 2, seededRng(3)).filter((t) => t.prompt === 'order'));

  it('elke goede stap schuift door; pas na de laatste stap is de opdracht goed', () => {
    let s = orderSession();
    const steps = currentTask(s).exercise.steps!;
    for (let i = 0; i < steps.length - 1; i++) {
      s = answer(s, steps[i]);
      expect(s.phase).toBe('asking');
      expect(s.step).toBe(i + 1);
      expect(s.feedback).toBe('step');
    }
    s = answer(s, steps[steps.length - 1]);
    expect(s.phase).toBe('correct');
    expect(s.firstTry).toBe(1);
  });

  it('fout in een tussenstap telt als fout, maar de opdracht gaat door', () => {
    let s = orderSession();
    const steps = currentTask(s).exercise.steps!;
    s = answer(s, steps[1]);
    expect(s.feedback).toBe('tryAgain');
    expect(s.step).toBe(0);
    s = answer(s, steps[0]);
    expect(s.wrong).toEqual([]); // vorige foute keuze is weer beschikbaar
    for (const v of steps.slice(1)) s = answer(s, v);
    expect(s.phase).toBe('correct');
    expect(s.firstTry).toBe(0);
  });

  it('dubbel tikken op een al geplaatst getal doet niets', () => {
    let s = orderSession();
    const steps = currentTask(s).exercise.steps!;
    s = answer(s, steps[0]);
    const again = answer(s, steps[0]);
    expect(again.step).toBe(1);
    expect(again.feedback).toBe('tryAgain'); // al geplaatst = niet het volgende getal
  });

  it('hervatten: sessie starten bij een opgeslagen opdracht', () => {
    const tasks = buildRoundTasks(missions.appelmand, 0, seededRng(8));
    const s = startSession('appelmand', tasks, 3, 2);
    expect(s.index).toBe(3);
    expect(s.firstTry).toBe(2);
    expect(startSession('appelmand', tasks, 99).index).toBe(tasks.length - 1);
  });
});
