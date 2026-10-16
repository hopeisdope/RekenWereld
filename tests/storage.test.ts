import { describe, expect, it } from 'vitest';
import { createLocalStorage, SCHEMA_VERSION } from '../src/storage/storage';

function memoryStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe('opslag', () => {
  it('slaat op en laadt terug', () => {
    const s = createLocalStorage(memoryStore());
    const data = { schemaVersion: SCHEMA_VERSION, progress: { a: 1 }, updatedAt: 'x' };
    s.save(data);
    expect(s.load()).toEqual(data);
  });

  it('werkt zonder beschikbare opslag', () => {
    const s = createLocalStorage(null);
    s.save({ schemaVersion: SCHEMA_VERSION, progress: {}, updatedAt: 'x' });
    expect(s.load()).toBeNull();
  });

  it('negeert corrupte data', () => {
    const store = memoryStore();
    store.setItem('rekenwereld:v1', '{kapot');
    expect(createLocalStorage(store).load()).toBeNull();
  });
});
