/** Versie van het opgeslagen schema; ophogen bij een migratie. */
export const SCHEMA_VERSION = 2;
/** De sleutel blijft gelijk over versies heen; de versie staat in de data. */
const KEY = 'rekenwereld:v1';
/** Kopie van de vorige goede stand, voor herstel als de hoofdsleutel kapot is. */
const BACKUP_KEY = 'rekenwereld:backup';

export interface SaveData {
  schemaVersion: number;
  /** Ingevuld door de spelstatus-module; hier bewust generiek. */
  progress: Record<string, unknown>;
  /** Instellingen, gezien voorbeelden, niveau-instellingen van ouders. */
  settings?: Record<string, unknown>;
  /** Onderbroken missieronde om te hervatten. */
  resume?: unknown;
  /** Pogingen en resultaten per vaardigheid (schema 2). */
  skills?: unknown;
  updatedAt: string;
}

export interface StorageStatus {
  /** Lukte de laatste poging tot opslaan? */
  lastSaveOk: boolean;
  /** Wat er bij het laden gebeurde: niets bijzonders, hersteld uit reservekopie, of opnieuw begonnen. */
  recovered: 'none' | 'backup' | 'reset';
}

export interface Storage {
  load(): SaveData | null;
  /** Geeft false als opslaan niet lukte (vol, privé-modus, geblokkeerd). */
  save(data: SaveData): boolean;
  clear(): void;
  status(): StorageStatus;
}

type KV = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Zet oudere opgeslagen data om naar het huidige schema; onbekend of nieuwer → null. */
export function migrate(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (!d.progress || typeof d.progress !== 'object') return null;
  if (d.schemaVersion === SCHEMA_VERSION) return d as unknown as SaveData;
  if (d.schemaVersion === 1) {
    // Fase 1–4: zelfde velden, nog geen statistieken per vaardigheid.
    return { ...(d as unknown as SaveData), schemaVersion: SCHEMA_VERSION, skills: {} };
  }
  return null;
}

/**
 * localStorage-implementatie die nooit gooit (privé-modus, volle opslag) en
 * zichzelf herstelt: kapotte data → reservekopie → anders schoon beginnen.
 * Kapotte data wordt niet stil overschreven maar apart bewaard.
 */
export function createLocalStorage(store: KV | null = safeLocalStorage()): Storage {
  let lastSaveOk = true;
  let recovered: StorageStatus['recovered'] = 'none';

  const read = (key: string): SaveData | null => {
    try {
      const raw = store?.getItem(key);
      return raw ? migrate(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  };

  return {
    load() {
      let hasMain: boolean;
      try {
        hasMain = !!store?.getItem(KEY);
      } catch {
        return null;
      }
      const main = read(KEY);
      if (main) return main;
      const backup = read(BACKUP_KEY);
      if (hasMain) {
        try {
          store?.setItem(`${KEY}:corrupt`, store.getItem(KEY) ?? '');
        } catch {
          /* niet erg */
        }
        recovered = backup ? 'backup' : 'reset';
      }
      return backup;
    },
    save(data) {
      try {
        const previous = store?.getItem(KEY);
        if (previous && read(KEY)) store?.setItem(BACKUP_KEY, previous);
        store?.setItem(KEY, JSON.stringify(data));
        lastSaveOk = !!store;
      } catch {
        // Opslag vol of geblokkeerd: het spel blijft werken, alleen niet bewaard.
        lastSaveOk = false;
      }
      return lastSaveOk;
    },
    clear() {
      for (const key of [KEY, BACKUP_KEY, `${KEY}:corrupt`]) {
        try {
          store?.removeItem(key);
        } catch {
          /* negeren */
        }
      }
      recovered = 'none';
    },
    status() {
      return { lastSaveOk, recovered };
    },
  };
}

function safeLocalStorage(): KV | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
