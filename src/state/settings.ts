import type { SkillId } from '../math/skills';
import type { InteractionKind, PromptKind, Task } from '../missions/types';
import { parseOverrides, type LevelOverride } from './mastery';

/**
 * Sleutel van een voorbeeld: soort opdracht + bediening, bv. "makeTen/drag".
 * Dezelfde rekensoort met een andere bediening krijgt een eigen voorbeeld.
 */
export type DemoKey = `${PromptKind}/${InteractionKind}`;

export const demoKey = (task: Pick<Task, 'prompt' | 'interaction'>): DemoKey => `${task.prompt}/${task.interaction}`;

export function parseDemoKey(key: DemoKey): { prompt: PromptKind; interaction: InteractionKind } {
  const [prompt, interaction] = key.split('/') as [PromptKind, InteractionKind];
  return { prompt, interaction };
}

export interface Settings {
  /** Voorlezen en geluidjes aan/uit. */
  sound: boolean;
  /** Voorbeelden die al zijn voorgedaan en geoefend. */
  seenDemos: readonly DemoKey[];
  /** Niveau per vaardigheid, ingesteld door een ouder (ontbreekt = automatisch). */
  levelOverrides: Readonly<Partial<Record<SkillId, LevelOverride>>>;
  /** Gekozen voorleesstem (voiceURI); null = automatisch de beste lokale stem. */
  voiceURI: string | null;
  /** Voorleestempo. */
  speechRate: 'normal' | 'slow';
}

export const DEFAULT_SETTINGS: Settings = { sound: true, seenDemos: [], levelOverrides: {}, voiceURI: null, speechRate: 'normal' };

const PROMPTS = ['count', 'recognize', 'build', 'compare', 'order', 'missing', 'add', 'subtract', 'split', 'makeTen', 'jump', 'jumpBack'];
const INTERACTIONS = ['choice', 'numberline', 'sequence', 'drag'];

/**
 * Oude opslag (fase 1–2) bewaarde alleen de soort. Die bedieningen zijn gelijk
 * gebleven, behalve de getallenlijn: daarvan wordt het nieuwe voorbeeld getoond.
 */
const LEGACY: Record<string, DemoKey | null> = {
  count: 'count/choice',
  recognize: 'recognize/choice',
  compare: 'compare/choice',
  order: 'order/sequence',
  missing: 'missing/choice',
  add: 'add/choice',
  subtract: 'subtract/choice',
  split: 'split/choice',
  makeTen: 'makeTen/choice',
  jump: null,
  build: null,
};

function toKey(v: unknown): DemoKey | null {
  if (typeof v !== 'string') return null;
  if (v in LEGACY) return LEGACY[v];
  const [p, i] = v.split('/');
  return PROMPTS.includes(p) && INTERACTIONS.includes(i) ? (v as DemoKey) : null;
}

export function parseSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  const { sound, seenDemos, levelOverrides, voiceURI, speechRate } = raw as Record<string, unknown>;
  const keys = Array.isArray(seenDemos) ? seenDemos.map(toKey).filter((k): k is DemoKey => k !== null) : [];
  return {
    sound: typeof sound === 'boolean' ? sound : DEFAULT_SETTINGS.sound,
    seenDemos: [...new Set(keys)],
    levelOverrides: parseOverrides(levelOverrides),
    voiceURI: typeof voiceURI === 'string' && voiceURI.length > 0 && voiceURI.length < 300 ? voiceURI : null,
    speechRate: speechRate === 'slow' ? 'slow' : 'normal',
  };
}

export function markDemoSeen(s: Settings, key: DemoKey): Settings {
  return s.seenDemos.includes(key) ? s : { ...s, seenDemos: [...s.seenDemos, key] };
}

export function setLevelOverride(s: Settings, skill: SkillId, value: LevelOverride): Settings {
  const levelOverrides = { ...s.levelOverrides };
  if (value === 'auto') delete levelOverrides[skill];
  else levelOverrides[skill] = value;
  return { ...s, levelOverrides };
}
