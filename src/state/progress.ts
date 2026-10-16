/** Voortgang per missie: alleen of hij gespeeld is en de beste score. */
export interface MissionProgress {
  completed: boolean;
  bestStars: 0 | 1 | 2 | 3;
  timesPlayed: number;
}

export type Progress = Readonly<Record<string, MissionProgress>>;

export function recordResult(p: Progress, missionId: string, stars: 1 | 2 | 3): Progress {
  const prev = p[missionId];
  return {
    ...p,
    [missionId]: {
      completed: true,
      bestStars: Math.max(prev?.bestStars ?? 0, stars) as MissionProgress['bestStars'],
      timesPlayed: (prev?.timesPlayed ?? 0) + 1,
    },
  };
}

/** Leest opgeslagen voortgang defensief in; onbekende of kapotte velden vallen weg. */
export function parseProgress(raw: unknown): Progress {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, MissionProgress> = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const { completed, bestStars, timesPlayed } = v as Record<string, unknown>;
    if (typeof completed !== 'boolean' || ![0, 1, 2, 3].includes(bestStars as number)) continue;
    out[id] = {
      completed,
      bestStars: bestStars as MissionProgress['bestStars'],
      timesPlayed: typeof timesPlayed === 'number' && timesPlayed >= 0 ? Math.floor(timesPlayed) : 0,
    };
  }
  return out;
}
