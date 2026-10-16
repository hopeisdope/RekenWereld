import type { Mission } from '../missions/types';
import type { Progress } from './progress';
import type { ResumePoint } from './resume';

/**
 * Status van een missie op de kaart:
 * - locked:     nog op slot (eerst de vorige missie, ronde 1)
 * - available:  open, nog niet begonnen
 * - inProgress: bezig (onderbroken ronde of nog niet alle rondes klaar)
 * - completed:  alle rondes klaar
 */
export type MissionStatus = 'locked' | 'available' | 'inProgress' | 'completed';

export interface WorldMission {
  id: string;
  rounds: number;
}

const done = (p: Progress, id: string) => p[id]?.roundsDone ?? 0;

/** Een missie gaat open als de vorige missie op de kaart minstens één ronde klaar heeft. */
export function isUnlocked(order: readonly WorldMission[], p: Progress, id: string): boolean {
  const i = order.findIndex((m) => m.id === id);
  if (i <= 0) return i === 0;
  return done(p, order[i - 1].id) >= 1 || done(p, id) > 0;
}

export function missionStatus(order: readonly WorldMission[], p: Progress, resume: ResumePoint | null, id: string): MissionStatus {
  if (!isUnlocked(order, p, id)) return 'locked';
  const m = order.find((x) => x.id === id)!;
  if (resume?.missionId === id) return 'inProgress';
  const d = done(p, id);
  if (d >= m.rounds) return 'completed';
  return d > 0 ? 'inProgress' : 'available';
}

/**
 * Welke missie wijst de uil aan? Eerst een onderbroken ronde, dan de open
 * missie met de minste voltooide rondes (bij gelijkspel de eerste op de kaart).
 * Zo wisselen de leerdoelen elkaar af in plaats van één missie eindeloos.
 */
export function suggestedMission(order: readonly WorldMission[], p: Progress, resume: ResumePoint | null = null): string {
  if (resume && isUnlocked(order, p, resume.missionId)) return resume.missionId;
  const open = order.filter((m) => isUnlocked(order, p, m.id) && done(p, m.id) < m.rounds);
  if (open.length === 0) return order[0].id;
  return open.reduce((best, m) => (done(p, m.id) < done(p, best.id) ? m : best)).id;
}

/** Missies die door deze voortgang nieuw open zijn gegaan (voor de ontgrendel-animatie). */
export function newlyUnlocked(order: readonly WorldMission[], before: Progress, after: Progress): string[] {
  return order.filter((m) => !isUnlocked(order, before, m.id) && isUnlocked(order, after, m.id)).map((m) => m.id);
}

/** Verzamelobjecten: per missie de beloning van elke voltooide ronde. */
export function collection(missions: readonly Mission[], p: Progress): { missionId: string; reward: string; found: boolean }[] {
  return missions.flatMap((m) => m.rounds.map((r, i) => ({ missionId: m.id, reward: r.reward, found: done(p, m.id) > i })));
}

export const toWorld = (missions: readonly Mission[]): WorldMission[] => missions.map((m) => ({ id: m.id, rounds: m.rounds.length }));
