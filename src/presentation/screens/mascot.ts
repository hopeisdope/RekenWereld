import { el } from '../dom';
import { MASCOT } from '../texts';

/** Uil Ollie met een tekstballon. */
export function mascotBubble(...content: (Node | string)[]): HTMLElement {
  return el(
    'div',
    { class: 'mascot-row' },
    el('span', { class: 'mascot', role: 'img', 'aria-label': MASCOT.name }, MASCOT.emoji),
    el('div', { class: 'bubble', 'aria-live': 'polite' }, ...content),
  );
}
