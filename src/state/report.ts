import { SKILLS, type SkillId } from '../math/skills';
import type { Mission } from '../missions/types';
import { effectiveShift, recentRate, skillStatus, type LevelOverride, type SkillStats, type SkillStatus } from './mastery';
import type { Progress } from './progress';

/** Volgorde in het oudergedeelte: zoals de leerlijn opbouwt. */
export const SKILL_ORDER: readonly SkillId[] = ['count', 'recognize', 'build', 'missing', 'compare', 'order', 'add', 'subtract', 'split', 'makeTen'];

export interface SkillRow {
  skill: SkillId;
  goal: string;
  status: SkillStatus;
  attempts: number;
  /** Aantal recente opdrachten waarop het percentage is gebaseerd. */
  recentCount: number;
  /** Deel van de recente opdrachten in één keer goed (0–1). */
  recentRate: number;
  /** Niveau-aanpassing die nu gebruikt wordt. */
  shift: number;
  override: LevelOverride;
}

export interface ParentReport {
  rows: SkillRow[];
  /** Vaardigheden waar extra oefenen nuttig kan zijn. */
  needsPractice: SkillId[];
  mastered: SkillId[];
  missions: { id: string; title: string; roundsDone: number; rounds: number }[];
  animalsFound: number;
  animalsTotal: number;
}

/** Samenvatting voor ouders. Puur: zelfde invoer → zelfde rapport. */
export function parentReport(stats: SkillStats, overrides: Partial<Record<SkillId, LevelOverride>>, progress: Progress, missions: readonly Mission[]): ParentReport {
  const rows = SKILL_ORDER.map((skill) => {
    const stat = stats[skill];
    const override = overrides[skill] ?? 'auto';
    return {
      skill,
      goal: SKILLS[skill].goal,
      status: skillStatus(stat),
      attempts: stat?.attempts ?? 0,
      recentCount: stat?.recent.length ?? 0,
      recentRate: stat ? recentRate(stat) : 0,
      shift: effectiveShift(stat, override),
      override,
    };
  });
  const missionRows = missions.map((m) => ({ id: m.id, title: m.title, roundsDone: Math.min(progress[m.id]?.roundsDone ?? 0, m.rounds.length), rounds: m.rounds.length }));
  return {
    rows,
    needsPractice: rows.filter((r) => r.status === 'needsPractice').map((r) => r.skill),
    mastered: rows.filter((r) => r.status === 'mastered').map((r) => r.skill),
    missions: missionRows,
    animalsFound: missionRows.reduce((n, m) => n + m.roundsDone, 0),
    animalsTotal: missionRows.reduce((n, m) => n + m.rounds, 0),
  };
}
