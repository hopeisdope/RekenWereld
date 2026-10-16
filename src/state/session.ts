import { isCorrect } from '../math/check';
import type { Task } from '../missions/types';

/**
 * Verloop van één missie als pure toestandsmachine:
 *
 *   asking --goed--> correct --next--> asking (volgende opdracht) | finished
 *   asking --fout--> asking (met hint; missie gaat gewoon door)
 *
 * Antwoorden worden genegeerd als ze niet bij de huidige opdracht horen of als
 * de opdracht al goed is beantwoord. Zo kan dubbel tikken nooit een opdracht
 * overslaan.
 */
export type Phase = 'asking' | 'correct' | 'finished';

export interface SessionState {
  missionId: string;
  tasks: readonly Task[];
  index: number;
  phase: Phase;
  /** Foute antwoorden op de huidige opdracht (worden uitgeschakeld in de UI). */
  wrong: readonly number[];
  /** Toon een hint bij de huidige opdracht (na een fout antwoord). */
  showHint: boolean;
  /** Laatste reactie, voor de feedbacktekst. */
  feedback: 'correct' | 'tryAgain' | null;
  /** Aantal opdrachten dat in één keer goed was. */
  firstTry: number;
}

export type SessionEvent =
  | { type: 'answer'; taskId: string; value: number }
  | { type: 'next' };

export function startSession(missionId: string, tasks: readonly Task[]): SessionState {
  if (tasks.length === 0) throw new Error('missie zonder opdrachten');
  return { missionId, tasks, index: 0, phase: 'asking', wrong: [], showHint: false, feedback: null, firstTry: 0 };
}

export function currentTask(s: SessionState): Task {
  return s.tasks[s.index];
}

export function reduce(s: SessionState, e: SessionEvent): SessionState {
  switch (e.type) {
    case 'answer': {
      if (s.phase !== 'asking' || e.taskId !== currentTask(s).id || s.wrong.includes(e.value)) return s;
      if (isCorrect(currentTask(s).exercise, e.value)) {
        return { ...s, phase: 'correct', feedback: 'correct', firstTry: s.firstTry + (s.wrong.length === 0 ? 1 : 0) };
      }
      return { ...s, wrong: [...s.wrong, e.value], showHint: true, feedback: 'tryAgain' };
    }
    case 'next': {
      if (s.phase !== 'correct') return s;
      if (s.index + 1 >= s.tasks.length) return { ...s, phase: 'finished', feedback: null };
      return { ...s, index: s.index + 1, phase: 'asking', wrong: [], showHint: false, feedback: null };
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
