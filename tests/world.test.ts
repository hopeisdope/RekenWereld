import { describe, expect, it } from 'vitest';
import { getallenbos, missions } from '../src/missions/getallenbos';
import type { Progress } from '../src/state/progress';
import type { ResumePoint } from '../src/state/resume';
import { collection, isUnlocked, missionStatus, newlyUnlocked, suggestedMission, toWorld } from '../src/state/world';

const order = toWorld(getallenbos.missionIds.map((id) => missions[id]));
const prog = (v: number, a: number, r: number): Progress => ({
  voetstappen: { roundsDone: v, completed: v > 0, bestStars: 1, timesPlayed: v },
  appelmand: { roundsDone: a, completed: a > 0, bestStars: 1, timesPlayed: a },
  rivier: { roundsDone: r, completed: r > 0, bestStars: 1, timesPlayed: r },
});
const resumeIn = (missionId: string) => ({ missionId, round: 0, tasks: [], index: 1, firstTry: 0 }) as unknown as ResumePoint;

describe('wereldkaart: ontgrendelen en statussen', () => {
  it('aan het begin is alleen de eerste missie open', () => {
    expect(order.map((m) => missionStatus(order, {}, null, m.id))).toEqual(['available', 'locked', 'locked']);
  });

  it('ronde 1 van een missie opent de volgende missie', () => {
    expect(isUnlocked(order, prog(1, 0, 0), 'appelmand')).toBe(true);
    expect(isUnlocked(order, prog(1, 0, 0), 'rivier')).toBe(false);
    expect(isUnlocked(order, prog(1, 1, 0), 'rivier')).toBe(true);
  });

  it('bezig = onderbroken ronde of nog niet alle rondes; voltooid = alle rondes', () => {
    expect(missionStatus(order, prog(1, 0, 0), null, 'voetstappen')).toBe('inProgress');
    expect(missionStatus(order, prog(3, 0, 0), null, 'voetstappen')).toBe('completed');
    expect(missionStatus(order, prog(3, 0, 0), resumeIn('voetstappen'), 'voetstappen')).toBe('inProgress');
    expect(missionStatus(order, {}, resumeIn('voetstappen'), 'voetstappen')).toBe('inProgress');
    expect(missionStatus(order, prog(1, 0, 0), null, 'appelmand')).toBe('available');
  });

  it('nooit op slot als er al voortgang is (bv. oude opslag)', () => {
    expect(isUnlocked(order, { rivier: { roundsDone: 1, completed: true, bestStars: 1, timesPlayed: 1 } }, 'rivier')).toBe(true);
  });

  it('nieuw ontgrendeld na een ronde', () => {
    expect(newlyUnlocked(order, {}, prog(1, 0, 0))).toEqual(['appelmand']);
    expect(newlyUnlocked(order, prog(1, 0, 0), prog(2, 0, 0))).toEqual([]);
  });
});

describe('wereldkaart: welke missie wijst de uil aan', () => {
  it('eerst de onderbroken ronde', () => {
    expect(suggestedMission(order, prog(1, 1, 0), resumeIn('voetstappen'))).toBe('voetstappen');
  });

  it('daarna de open missie met de minste rondes (leerdoelen wisselen af)', () => {
    expect(suggestedMission(order, {})).toBe('voetstappen');
    expect(suggestedMission(order, prog(1, 0, 0))).toBe('appelmand');
    expect(suggestedMission(order, prog(1, 1, 0))).toBe('rivier');
    expect(suggestedMission(order, prog(1, 1, 1))).toBe('voetstappen');
    expect(suggestedMission(order, prog(2, 1, 1))).toBe('appelmand');
    expect(suggestedMission(order, prog(3, 3, 3))).toBe('voetstappen');
  });
});

describe('verzamelobjecten', () => {
  it('één dier per voltooide ronde, negen in totaal', () => {
    const all = collection(Object.values(missions), prog(1, 0, 3));
    expect(all).toHaveLength(9);
    expect(all.filter((c) => c.found).map((c) => c.reward)).toEqual(['🦊', '🦦', '🐟', '🦆']);
    expect(new Set(all.map((c) => c.reward)).size).toBe(9);
  });
});
