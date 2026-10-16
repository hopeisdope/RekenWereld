/** Versie van het opgeslagen schema; ophogen bij een migratie. */
export const SCHEMA_VERSION = 1;
const KEY = 'rekenwereld:v1';

export interface SaveData {
  schemaVersion: number;
  /** Ingevuld door de spelstatus-module; hier bewust generiek. */
  progress: Record<string, unknown>;
  /** Instellingen en welke uitleg al gezien is (optioneel; toegevoegd in fase 1.5). */
  settings?: Record<string, unknown>;
  /** Onderbroken missieronde om te hervatten (optioneel; fase 3). */
  resume?: unknown;
  updatedAt: string;
}

export interface Storage {
  load(): SaveData | null;
  save(data: SaveData): void;
  clear(): void;
}

/** localStorage-implementatie die nooit gooit (privé-modus, volle opslag). */
export function createLocalStorage(store: Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'> | null = safeLocalStorage()): Storage {
  return {
    load() {
      try {
        const raw = store?.getItem(KEY);
        if (!raw) return null;
        const data = JSON.parse(raw) as SaveData;
        return data.schemaVersion === SCHEMA_VERSION ? data : null;
      } catch {
        return null;
      }
    },
    save(data) {
      try {
        store?.setItem(KEY, JSON.stringify(data));
      } catch {
        /* opslag vol of geblokkeerd: spel blijft werken zonder opslaan */
      }
    },
    clear() {
      try {
        store?.removeItem(KEY);
      } catch {
        /* negeren */
      }
    },
  };
}

function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
