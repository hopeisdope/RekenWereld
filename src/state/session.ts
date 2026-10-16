import { isCorrect, stepCount } from '../math/check';
import type { Task } from '../missions/types';

/**
 * Verloop van één missieronde als pure toestandsmachine:
 *
 *   asking --goed (laatste stap)--> correct --next--> asking (volgende) | finished
 *   asking --goed (tussenstap)----> asking (step + 1)     [ordenen]
 *   asking --fout-----------------> asking (met hint; missie gaat gewoon door)
 *
 * Antwoorden worden genegeerd als ze niet bij de huidige opdracht horen, als
 * de opdracht al goed is, of als hetzelfde foute antwoord nog eens komt. Zo
 * kan dubbel tikken nooit een opdracht overslaan of dubbel tellen.
 */
export type Phase = 'asking' | 'correct' | 'finished';

export interface SessionState {
  missionId: string;
  tasks: readonly Task[];
  index: number;
  /** Tussenstap binnen de opdracht (ordenen); anders 0. */
  step: number;
  phase: Phase;
  /** Foute antwoorden op de huidige (tussen)stap. */
  wrong: readonly number[];
  /** Aantal fouten bij de huidige opdracht (alle stappen samen). */
  mistakes: number;
  /** Toon een hint bij de huidige opdracht (na een fout antwoord). */
  showHint: boolean;
  /** Laatste reactie, voor de feedback. */
  feedback: 'correct' | 'step' | 'tryAgain' | null;
  /** Aantal opdrachten dat zonder fout goed was. */
  firstTry: number;
}

export type SessionEvent =
  | { type: 'answer'; taskId: string; value: number }
  | { type: 'next' };

export function startSession(missionId: string, tasks: readonly Task[], index = 0, firstTry = 0): SessionState {
  if (tasks.length === 0) throw new Error('missie zonder opdrachten');
  const i = Math.max(0, Math.min(index, tasks.length - 1));
  return { missionId, tasks, index: i, step: 0, phase: 'asking', wrong: [], mistakes: 0, showHint: false, feedback: null, firstTry };
}

export function currentTask(s: SessionState): Task {
  return s.tasks[s.index];
}

export function reduce(s: SessionState, e: SessionEvent): SessionState {
  switch (e.type) {
    case 'answer': {
      if (s.phase !== 'asking' || e.taskId !== currentTask(s).id || s.wrong.includes(e.value)) return s;
      const ex = currentTask(s).exercise;
      if (!isCorrect(ex, e.value, s.step)) {
        return { ...s, wrong: [...s.wrong, e.value], mistakes: s.mistakes + 1, showHint: true, feedback: 'tryAgain' };
      }
      if (s.step + 1 < stepCount(ex)) {
        return { ...s, step: s.step + 1, wrong: [], feedback: 'step' };
      }
      return { ...s, phase: 'correct', feedback: 'correct', firstTry: s.firstTry + (s.mistakes === 0 ? 1 : 0) };
    }
    case 'next': {
      if (s.phase !== 'correct') return s;
      if (s.index + 1 >= s.tasks.length) return { ...s, phase: 'finished', feedback: null };
      return { ...s, index: s.index + 1, step: 0, phase: 'asking', wrong: [], mistakes: 0, showHint: false, feedback: null };
    }
  }
}

/**
 * Sterren na afloop: altijd minstens 1 (meedoen telt), 3 als (bijna) alles in
 * één keer goed was. Bewust eenvoudig; geen straf voor fouten.
 */
export function starsFor(s: Pick<SessionState, 'firstTry' | 'tasks'>): 1 | 2 | 3 {
  const missed = s.tasks.length - s.firstTry;
  if (missed <= 1) return 3;
  if (s.firstTry * 2 >= s.tasks.length) return 2;
  return 1;
}
