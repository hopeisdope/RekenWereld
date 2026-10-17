import { describe, expect, it } from 'vitest';
import { createLocalStorage, migrate, SCHEMA_VERSION } from '../src/storage/storage';

function memoryStore() {
  const m = new Map<string, string>();
  return {
    map: m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
const data = (n: number) => ({ schemaVersion: SCHEMA_VERSION, progress: { n }, updatedAt: 'x' });

describe('opslag', () => {
  it('slaat op en laadt terug (heropenen na afsluiten)', () => {
    const store = memoryStore();
    expect(createLocalStorage(store).save(data(1))).toBe(true);
    expect(createLocalStorage(store).load()).toEqual(data(1)); // nieuwe instantie = app opnieuw geopend
  });

  it('werkt zonder beschikbare opslag en meldt dat opslaan niet lukt', () => {
    const s = createLocalStorage(null);
    expect(s.save(data(1))).toBe(false);
    expect(s.load()).toBeNull();
    expect(s.status().lastSaveOk).toBe(false);
  });

  it('opslag vol of geblokkeerd: geen crash, status zegt het', () => {
    const store = { ...memoryStore(), setItem: () => { throw new Error('QuotaExceededError'); } };
    const s = createLocalStorage(store);
    expect(s.save(data(1))).toBe(false);
    expect(s.status().lastSaveOk).toBe(false);
  });

  it('kapotte data zonder reservekopie: opnieuw beginnen, kapotte data apart bewaard', () => {
    const store = memoryStore();
    store.setItem('rekenwereld:v1', '{kapot');
    const s = createLocalStorage(store);
    expect(s.load()).toBeNull();
    expect(s.status().recovered).toBe('reset');
    expect(store.map.get('rekenwereld:v1:corrupt')).toBe('{kapot');
  });

  it('kapotte data met reservekopie: vorige goede stand terug', () => {
    const store = memoryStore();
    const s = createLocalStorage(store);
    s.save(data(1));
    s.save(data(2)); // reservekopie = stand 1
    store.setItem('rekenwereld:v1', '{"schemaVersion":2,"prog'); // halverwege kapot
    const fresh = createLocalStorage(store);
    expect(fresh.load()).toEqual(data(1));
    expect(fresh.status().recovered).toBe('backup');
  });

  it('migreert schema 1 (fase 1–4) zonder verlies', () => {
    const v1 = { schemaVersion: 1, progress: { rivier: { completed: true, bestStars: 2 } }, settings: { sound: false }, updatedAt: 'x' };
    expect(migrate(v1)).toEqual({ ...v1, schemaVersion: 2, skills: {} });
    const store = memoryStore();
    store.setItem('rekenwereld:v1', JSON.stringify(v1));
    expect(createLocalStorage(store).load()?.progress).toEqual(v1.progress);
  });

  it('onbekende of nieuwere versie en data zonder voortgang worden niet gebruikt', () => {
    expect(migrate({ schemaVersion: 99, progress: {} })).toBeNull();
    expect(migrate({ schemaVersion: 2 })).toBeNull();
    expect(migrate('tekst')).toBeNull();
  });

  it('wissen verwijdert ook reservekopie en kapotte kopie', () => {
    const store = memoryStore();
    const s = createLocalStorage(store);
    s.save(data(1));
    s.save(data(2));
    s.clear();
    expect(store.map.size).toBe(0);
    expect(s.load()).toBeNull();
  });
});
