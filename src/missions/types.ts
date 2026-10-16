import type { Exercise, Rng } from '../math/types';

/** Hoe het kind antwoordt. */
export type InteractionKind = 'choice' | 'numberline';

/** Wat er getoond wordt bij de opgave; de presentatielaag kiest de weergave. */
export type PromptKind = 'count' | 'recognize' | 'add' | 'jump';

export interface Task {
  id: string;
  prompt: PromptKind;
  interaction: InteractionKind;
  exercise: Exercise;
  /** Antwoordknoppen (alleen bij 'choice'), in willekeurige volgorde. */
  choices?: readonly number[];
  /** Bereik van de getallenlijn (alleen bij 'numberline'). */
  line?: { min: number; max: number };
}

export interface Mission {
  id: string;
  areaId: string;
  title: string;
  /** Korte uitleg voor op de missiekaart. */
  goal: string;
  emoji: string;
  /** Beloningssticker na afloop. */
  reward: string;
  /** Maakt een nieuwe set van 5–8 opdrachten. */
  buildTasks(rng: Rng): Task[];
}

export interface Area {
  id: string;
  name: string;
  emoji: string;
  missionIds: readonly string[];
}
