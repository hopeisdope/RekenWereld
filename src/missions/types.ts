import type { SkillId, SkillLevel } from '../math/skills';
import type { Exercise } from '../math/types';

/** Hoe het kind antwoordt. */
export type InteractionKind = 'choice' | 'numberline' | 'sequence' | 'drag';

/**
 * Soort opdracht zoals het kind hem ziet; bepaalt de weergave en welk
 * voorbeeld wordt voorgedaan. Meestal gelijk aan de vaardigheid; 'jump' is
 * vooruit springen (optellen) en 'jumpBack' terug springen (aftrekken) op de
 * getallenlijn: elk een eigen voorbeeld.
 */
export type PromptKind = SkillId | 'jump' | 'jumpBack';

/**
 * Ondersteuning: 'concrete' toont voorwerpen bij de getallen; 'abstract'
 * alleen getallen. Bij een fout komen de voorwerpen altijd terug als hint.
 */
export type Support = 'concrete' | 'abstract';

/** Thema van de missie: welke voorwerpen er geteld/getoond worden. */
export type Theme = 'paws' | 'apples' | 'frog';

export interface Task {
  id: string;
  prompt: PromptKind;
  interaction: InteractionKind;
  exercise: Exercise;
  support: Support;
  theme: Theme;
  /** Antwoordknoppen (bij 'choice'), in willekeurige volgorde. */
  choices?: readonly number[];
  /** Bereik van de getallenlijn (bij 'numberline'). */
  line?: { min: number; max: number };
  /** De geplande opdracht waaruit deze is gemaakt (om bij aanpassing opnieuw te maken). */
  spec?: TaskSpec;
}

/** Eén geplande opdracht in een ronde. */
export interface TaskSpec {
  skill: SkillId;
  /** Index in SKILLS[skill].levels. */
  level: number;
  /** Kleine aanpassing op het niveau (bv. kleinere sprongen). */
  tweak?: Partial<SkillLevel>;
  prompt?: PromptKind;
  interaction?: InteractionKind;
  support?: Support;
  line?: { min: number; max: number };
}

export interface Round {
  /** Verzamelobject (dier) dat het kind vindt na deze ronde. */
  reward: string;
  specs: readonly TaskSpec[];
}

export interface Mission {
  id: string;
  areaId: string;
  title: string;
  /** Korte uitleg voor ouders; niet nodig voor het kind. */
  goal: string;
  emoji: string;
  theme: Theme;
  rounds: readonly Round[];
}

export interface Area {
  id: string;
  name: string;
  emoji: string;
  missionIds: readonly string[];
}
