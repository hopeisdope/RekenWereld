import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/math/generate';
import { missions } from '../src/missions/getallenbos';
import { currentTask, reduce, startSession, starsFor, type SessionState } from '../src/state/session';

function freshSession(): SessionState {
  return startSession('appelmand', missions.appelmand.buildTasks(seededRng(1)));
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
