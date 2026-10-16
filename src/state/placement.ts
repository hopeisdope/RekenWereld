/**
 * Toestand van een sleep-opdracht: voorwerpen van de voorraad in vakjes
 * leggen. Puur, zodat de regels (vol = niet meer leggen, vaste voorwerpen
 * blijven liggen) los te testen zijn.
 */
export interface Placement {
  /** Aantal vakjes in totaal. */
  capacity: number;
  /** Voorwerpen die al vast in de vakjes liggen (bv. aanvullen tot 10). */
  fixed: number;
  /** Door het kind gelegde voorwerpen. */
  placed: number;
  /** Voorwerpen die nog in de voorraad liggen. */
  tray: number;
}

export type PlaceResult = { ok: true; state: Placement } | { ok: false; reason: 'full' | 'empty-tray'; state: Placement };

export function createPlacement(capacity: number, fixed: number, tray: number): Placement {
  if (fixed > capacity) throw new RangeError('meer vaste voorwerpen dan vakjes');
  return { capacity, fixed, placed: 0, tray };
}

export const freeSlots = (p: Placement) => p.capacity - p.fixed - p.placed;

/** Leg één voorwerp in het eerste lege vakje. */
export function place(p: Placement): PlaceResult {
  if (p.tray <= 0) return { ok: false, reason: 'empty-tray', state: p };
  if (freeSlots(p) <= 0) return { ok: false, reason: 'full', state: p };
  return { ok: true, state: { ...p, placed: p.placed + 1, tray: p.tray - 1 } };
}

/** Haal een gelegd voorwerp terug naar de voorraad (vaste voorwerpen blijven liggen). */
export function takeBack(p: Placement): Placement {
  return p.placed > 0 ? { ...p, placed: p.placed - 1, tray: p.tray + 1 } : p;
}

/** Hoeveel vakjes en voorwerpen hoort er bij een opdracht? */
export function placementFor(operation: 'build' | 'makeTen', operands: readonly number[]): Placement {
  if (operation === 'makeTen') {
    const [filled] = operands;
    return createPlacement(10, filled, 10 - filled + 2);
  }
  const [n] = operands;
  const tray = Math.max(5, n + 3);
  return createPlacement(tray > 10 ? 20 : 10, 0, tray);
}
