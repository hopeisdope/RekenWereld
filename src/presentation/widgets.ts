import { el } from './dom';

/** Rij sterren: gouden voor verdiend, vaag/grijs voor nog niet. `fresh` = net verdiend (animatie). */
export function starRow(earned: number, total = 3, fresh = -1): HTMLElement {
  const row = el('span', { class: 'stars', 'aria-label': `${earned} van de ${total} sterren` });
  for (let i = 0; i < total; i++) {
    row.append(el('span', { class: ['star', i < earned && 'on', i === fresh && 'fresh'].filter(Boolean).join(' '), 'aria-hidden': 'true' }, '⭐'));
  }
  return row;
}
