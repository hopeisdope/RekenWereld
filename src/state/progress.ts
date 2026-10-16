/** Voortgang per missie: hoeveel rondes klaar zijn en de beste score. */
export interface MissionProgress {
  /** Aantal voltooide rondes (0–3). Ronde i is voltooid als roundsDone > i. */
  roundsDone: number;
  completed: boolean;
  bestStars: 0 | 1 | 2 | 3;
  timesPlayed: number;
}

export type Progress = Readonly<Record<string, MissionProgress>>;

/**
 * Een ronde is gespeeld. Een nieuwe ronde telt alleen als het de eerstvolgende
 * is; opnieuw spelen van een oude ronde verandert de voortgang niet (wel het
 * aantal keer spelen en de beste score).
 */
export function recordResult(p: Progress, missionId: string, stars: 1 | 2 | 3, round = 0, totalRounds = 1): Progress {
  const prev = p[missionId];
  const roundsDone = Math.min(totalRounds, Math.max(prev?.roundsDone ?? 0, round === (prev?.roundsDone ?? 0) ? round + 1 : 0));
  return {
    ...p,
    [missionId]: {
      roundsDone,
      completed: roundsDone >= 1,
      bestStars: Math.max(prev?.bestStars ?? 0, stars) as MissionProgress['bestStars'],
      timesPlayed: (prev?.timesPlayed ?? 0) + 1,
    },
  };
}

/** Leest opgeslagen voortgang defensief in; ook het oude formaat (fase 1) zonder rondes. */
export function parseProgress(raw: unknown): Progress {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, MissionProgress> = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const { completed, bestStars, timesPlayed, roundsDone } = v as Record<string, unknown>;
    if (typeof completed !== 'boolean' || ![0, 1, 2, 3].includes(bestStars as number)) continue;
    const rounds = typeof roundsDone === 'number' && roundsDone >= 0 ? Math.min(3, Math.floor(roundsDone)) : completed ? 1 : 0;
    out[id] = {
      roundsDone: rounds,
      completed: completed || rounds > 0,
      bestStars: bestStars as MissionProgress['bestStars'],
      timesPlayed: typeof timesPlayed === 'number' && timesPlayed >= 0 ? Math.floor(timesPlayed) : 0,
    };
  }
  return out;
}

/** Welke ronde speelt het kind als het op deze missie tikt? De eerstvolgende; alles klaar → herhalen, rondgaand. */
export function nextRound(p: Progress, missionId: string, totalRounds: number): number {
  const prev = p[missionId];
  const done = prev?.roundsDone ?? 0;
  if (done < totalRounds) return done;
  return (prev?.timesPlayed ?? 0) % totalRounds;
}
