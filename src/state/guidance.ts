import type { Task } from '../missions/types';
import type { Progress } from './progress';
import { demoKey, type DemoKey } from './settings';

/**
 * Moet er vóór deze opdracht eerst een voorbeeld worden voorgedaan?
 * Alleen de eerste keer dat een soort opdracht voorkomt en zolang het kind
 * dat voorbeeld nog niet heeft gezien.
 */
export function demoNeeded(task: Task, seen: readonly DemoKey[]): DemoKey | null {
  const key = demoKey(task);
  return seen.includes(key) ? null : key;
}

/** Welke missie wijst de mascotte aan? De eerste die nog niet gespeeld is. */
export function suggestedMission(missionIds: readonly string[], progress: Progress): string {
  return missionIds.find((id) => !progress[id]?.completed) ?? missionIds[0];
}

/**
 * Na hoeveel foute pogingen wijst de hand het goede antwoord aan, zodat het
 * kind nooit vastloopt. Bij weinig keuzes is dat niet nodig.
 */
export function shouldPointAtAnswer(wrongAttempts: number, optionCount: number): boolean {
  return wrongAttempts >= 2 && optionCount > 3;
}
