import { isConsistent } from '../math/skills';
import type { Task } from '../missions/types';
import type { SessionState } from './session';

/**
 * Een onderbroken missieronde, zodat het kind later verder kan waar het was
 * (na 🏠, na het sluiten van de app of een herstart van de iPad).
 */
export interface ResumePoint {
  missionId: string;
  round: number;
  tasks: readonly Task[];
  index: number;
  firstTry: number;
}

export function snapshot(s: SessionState, round: number): ResumePoint {
  // Een goed beantwoorde opdracht telt als gedaan: hervat bij de volgende.
  const index = s.phase === 'correct' ? s.index + 1 : s.index;
  return { missionId: s.missionId, round, tasks: s.tasks, index, firstTry: s.firstTry };
}

/** Leest een opgeslagen hervatpunt defensief in; alles wat niet klopt → null. */
export function parseResume(raw: unknown): ResumePoint | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.missionId !== 'string' || !Array.isArray(r.tasks) || r.tasks.length === 0) return null;
  const index = Number(r.index);
  const round = Number(r.round);
  const firstTry = Number(r.firstTry);
  if (![index, round, firstTry].every((n) => Number.isInteger(n) && n >= 0)) return null;
  if (index >= r.tasks.length) return null;
  const tasks = r.tasks as Task[];
  const valid = tasks.every(
    (t) =>
      t &&
      typeof t.id === 'string' &&
      typeof t.prompt === 'string' &&
      typeof t.interaction === 'string' &&
      t.exercise &&
      Array.isArray(t.exercise.operands) &&
      isConsistent(t.exercise) &&
      (t.interaction !== 'choice' || (Array.isArray(t.choices) && t.choices.includes(t.exercise.answer))),
  );
  if (!valid) return null;
  return { missionId: r.missionId, round, tasks, index, firstTry: Math.min(firstTry, index) };
}
