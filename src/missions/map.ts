/**
 * Indeling van de kaart van Het Getallenbos (coördinaten in procenten van een
 * vierkante kaart). Alleen data; tekenen gebeurt in presentation/screens/map.ts.
 */
export interface MapNode {
  x: number;
  y: number;
  /** Groot icoon op de kaart (zonder tekst herkenbaar). */
  icon: string;
}

export interface AreaMap {
  nodes: Readonly<Record<string, MapNode>>;
  /** SVG-pad (viewBox 0 0 100 100) van het wandelpad langs de missies. */
  trail: string;
  /** SVG-pad van de rivier. */
  river: string;
  /** Losse versiering: [emoji, x, y, grootte]. */
  decor: readonly (readonly [string, number, number, number])[];
}

export const GETALLENBOS_MAP: AreaMap = {
  nodes: {
    voetstappen: { x: 24, y: 76, icon: '🐾' },
    appelmand: { x: 72, y: 56, icon: '🧺' },
    rivier: { x: 32, y: 28, icon: '🐸' },
  },
  trail: 'M 10 96 C 14 88, 18 82, 24 76 C 36 66, 56 72, 72 56 C 84 44, 58 36, 32 28',
  river: 'M -5 14 C 20 4, 40 24, 60 12 S 90 6, 105 16 L 105 26 C 88 18, 72 26, 58 22 S 22 18, -5 26 Z',
  decor: [
    ['🌲', 8, 52, 9],
    ['🌳', 86, 80, 10],
    ['🌲', 92, 34, 8],
    ['🍄', 48, 88, 5],
    ['🌼', 56, 48, 4],
    ['🌳', 86, 62, 8],
    ['🪨', 14, 34, 5],
    ['🌲', 60, 90, 7],
  ],
};
