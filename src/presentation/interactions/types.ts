import type { Task } from '../../missions/types';

/** Toestand van de huidige opdracht, afgeleid uit de missiestatus. */
export interface InteractionView {
  /** Foute antwoorden bij de huidige (tussen)stap. */
  wrong: readonly number[];
  /** Laatste foute antwoord (voor een schudanimatie). */
  lastWrong?: number;
  /** Goed antwoord gegeven: alles vergrendeld. */
  solved: boolean;
  showHint: boolean;
  /** Tussenstap (ordenen). */
  step: number;
}

export interface InteractionContext {
  task: Task;
  /** Geef een antwoord door aan de missie (die controleert het). */
  submit(value: number): void;
  /** Kort geluidje of trilling bij een handeling (optioneel). */
  feedback?(kind: 'tap' | 'place' | 'drop-fail' | 'hop'): void;
  /** De bediening is veranderd (kikker geland, voorwerp gelegd): hand bijwerken. */
  changed?(): void;
}

/**
 * Een herbruikbare bedieningsvorm. Houdt zijn eigen toestand (bv. de plek van
 * de kikker) zolang de opdracht duurt; de missie roept `update` aan na elke
 * statuswijziging.
 */
export interface Interaction {
  el: HTMLElement;
  update(view: InteractionView): void;
  /**
   * Het element waarop het kind nu moet tikken om dichter bij het goede
   * antwoord te komen (knop, volgende appel, ➡️ of ✔). Gebruikt voor de
   * wijzende hand én voor het voordoen (de mascotte "tikt" erop).
   */
  hintTarget(): HTMLElement | null;
  destroy?(): void;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}
