import type { PromptKind } from '../missions/types';

export interface Settings {
  /** Voorlezen aan/uit. */
  sound: boolean;
  /** Soorten opdrachten waarvan het voorbeeld al is voorgedaan en geoefend. */
  seenDemos: readonly PromptKind[];
}

export const DEFAULT_SETTINGS: Settings = { sound: true, seenDemos: [] };

const KINDS: readonly PromptKind[] = ['count', 'recognize', 'build', 'compare', 'order', 'missing', 'add', 'subtract', 'split', 'makeTen', 'jump'];

export function parseSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  const { sound, seenDemos } = raw as Record<string, unknown>;
  return {
    sound: typeof sound === 'boolean' ? sound : DEFAULT_SETTINGS.sound,
    seenDemos: Array.isArray(seenDemos) ? KINDS.filter((k) => seenDemos.includes(k)) : [],
  };
}

export function markDemoSeen(s: Settings, kind: PromptKind): Settings {
  return s.seenDemos.includes(kind) ? s : { ...s, seenDemos: [...s.seenDemos, kind] };
}
