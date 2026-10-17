import type { SkillId } from '../math/skills';

/**
 * Voortgang en eenvoudige adaptiviteit per vaardigheid.
 *
 * Elke afgeronde opdracht levert één uitkomst op:
 *   clean     = in één keer goed
 *   struggled = één fout
 *   hard      = twee of meer fouten (de hand wees het antwoord aan)
 *
 * De regels zijn bewust eenvoudig, deterministisch (zelfde uitkomsten → zelfde
 * niveau) en staan allemaal in ADAPTIVE_RULES. Eén goed of fout antwoord
 * verandert nooit het niveau of de status "beheerst".
 */
export type Outcome = 'clean' | 'struggled' | 'hard';

export interface AdaptiveRules {
  /** Aantal recente uitkomsten dat per vaardigheid bewaard wordt. */
  window: number;
  /** Zoveel opdrachten op rij foutloos → één niveau moeilijker. */
  promoteAfter: number;
  /** Zoveel "moeilijke" opdrachten op rij → één niveau makkelijker. */
  demoteAfter: number;
  /** Grenzen van de automatische aanpassing t.o.v. de leerlijn. */
  minShift: number;
  maxShift: number;
  /** Beheerst: minstens zoveel opdrachten in het venster ... */
  masteryMinAttempts: number;
  /** ... en minstens dit deel daarvan foutloos. */
  masteryRate: number;
  /** Extra oefenen nuttig: minstens zoveel opdrachten en minder dan dit deel foutloos. */
  practiceMinAttempts: number;
  practiceRate: number;
  /** Maximaal aantal opdrachten in een ronde, inclusief extra herhaling. */
  maxTasksPerRound: number;
}

export const ADAPTIVE_RULES: AdaptiveRules = {
  window: 8,
  promoteAfter: 5,
  demoteAfter: 2,
  minShift: -2,
  maxShift: 1,
  masteryMinAttempts: 6,
  masteryRate: 0.8,
  practiceMinAttempts: 4,
  practiceRate: 0.5,
  maxTasksPerRound: 8,
};

export interface SkillStat {
  /** Totaal aantal afgeronde opdrachten. */
  attempts: number;
  /** Totaal aantal foutloze opdrachten. */
  clean: number;
  /** Recente uitkomsten (oudste eerst), maximaal `window`. */
  recent: readonly Outcome[];
  /** Foutloze opdrachten op rij. */
  cleanStreak: number;
  /** Moeilijke opdrachten op rij. */
  hardStreak: number;
  /** Automatische niveau-aanpassing t.o.v. de leerlijn (minShift..maxShift). */
  shift: number;
}

export type SkillStats = Readonly<Partial<Record<SkillId, SkillStat>>>;

export const EMPTY_STAT: SkillStat = { attempts: 0, clean: 0, recent: [], cleanStreak: 0, hardStreak: 0, shift: 0 };

export function outcomeOf(mistakes: number): Outcome {
  return mistakes === 0 ? 'clean' : mistakes === 1 ? 'struggled' : 'hard';
}

/** Verwerk één afgeronde opdracht. Puur. */
export function recordOutcome(stat: SkillStat = EMPTY_STAT, outcome: Outcome, rules: AdaptiveRules = ADAPTIVE_RULES): SkillStat {
  let { cleanStreak, hardStreak, shift } = stat;
  if (outcome === 'clean') {
    cleanStreak += 1;
    hardStreak = 0;
  } else if (outcome === 'hard') {
    hardStreak += 1;
    cleanStreak = 0;
  } else {
    cleanStreak = 0;
    hardStreak = 0;
  }
  if (cleanStreak >= rules.promoteAfter && shift < rules.maxShift) {
    shift += 1;
    cleanStreak = 0; // op het nieuwe niveau opnieuw bewijzen
  }
  if (hardStreak >= rules.demoteAfter && shift > rules.minShift) {
    shift -= 1;
    hardStreak = 0;
  }
  return {
    attempts: stat.attempts + 1,
    clean: stat.clean + (outcome === 'clean' ? 1 : 0),
    recent: [...stat.recent, outcome].slice(-rules.window),
    cleanStreak,
    hardStreak,
    shift,
  };
}

export function recordSkill(stats: SkillStats, skill: SkillId, outcome: Outcome, rules: AdaptiveRules = ADAPTIVE_RULES): SkillStats {
  return { ...stats, [skill]: recordOutcome(stats[skill], outcome, rules) };
}

export type SkillStatus = 'notStarted' | 'practicing' | 'needsPractice' | 'mastered';

/** Deel van de recente opdrachten dat foutloos was. */
export function recentRate(stat: SkillStat): number {
  return stat.recent.length ? stat.recent.filter((o) => o === 'clean').length / stat.recent.length : 0;
}

/**
 * Status voor het oudergedeelte. "Beheerst" vraagt een reeks opdrachten, nooit
 * één antwoord; "extra oefenen" kijkt ook naar meerdere opdrachten.
 */
export function skillStatus(stat: SkillStat | undefined, rules: AdaptiveRules = ADAPTIVE_RULES): SkillStatus {
  if (!stat || stat.attempts === 0) return 'notStarted';
  const rate = recentRate(stat);
  if (stat.recent.length >= rules.masteryMinAttempts && rate >= rules.masteryRate && stat.shift >= 0) return 'mastered';
  // Al makkelijker gemaakt (= minstens twee moeilijke opdrachten op rij) of te weinig foutloos.
  if (stat.shift < 0 || (stat.recent.length >= rules.practiceMinAttempts && rate < rules.practiceRate)) return 'needsPractice';
  return 'practicing';
}

/** Instelling van een ouder per vaardigheid; 'auto' volgt de regels. */
export type LevelOverride = 'auto' | 'easier' | 'harder';

/** De niveau-aanpassing die echt gebruikt wordt: de ouderinstelling gaat voor. */
export function effectiveShift(stat: SkillStat | undefined, override: LevelOverride = 'auto'): number {
  if (override === 'easier') return -1;
  if (override === 'harder') return 1;
  return stat?.shift ?? 0;
}

const OUTCOMES: readonly Outcome[] = ['clean', 'struggled', 'hard'];
const SKILL_IDS: readonly SkillId[] = ['recognize', 'count', 'build', 'compare', 'order', 'missing', 'add', 'subtract', 'split', 'makeTen'];

/** Leest opgeslagen statistieken defensief in; onbekende of kapotte velden vallen weg of worden begrensd. */
export function parseSkillStats(raw: unknown, rules: AdaptiveRules = ADAPTIVE_RULES): SkillStats {
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Record<SkillId, SkillStat>> = {};
  for (const id of SKILL_IDS) {
    const v = (raw as Record<string, unknown>)[id];
    if (!v || typeof v !== 'object') continue;
    const r = v as Record<string, unknown>;
    const int = (x: unknown, min: number, max: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.max(min, Math.min(max, Math.floor(x))) : min);
    const attempts = int(r.attempts, 0, 1e6);
    const recent = Array.isArray(r.recent) ? r.recent.filter((o): o is Outcome => OUTCOMES.includes(o as Outcome)).slice(-rules.window) : [];
    out[id] = {
      attempts,
      clean: Math.min(int(r.clean, 0, 1e6), attempts),
      recent,
      cleanStreak: int(r.cleanStreak, 0, rules.promoteAfter),
      hardStreak: int(r.hardStreak, 0, rules.demoteAfter),
      shift: typeof r.shift === 'number' && Number.isFinite(r.shift) ? Math.max(rules.minShift, Math.min(rules.maxShift, Math.round(r.shift))) : 0,
    };
  }
  return out;
}

export function parseOverrides(raw: unknown): Partial<Record<SkillId, LevelOverride>> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Record<SkillId, LevelOverride>> = {};
  for (const id of SKILL_IDS) {
    const v = (raw as Record<string, unknown>)[id];
    if (v === 'easier' || v === 'harder') out[id] = v;
  }
  return out;
}
