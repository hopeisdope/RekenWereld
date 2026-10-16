import { el } from '../dom';
import { pointerHand } from './pointer';
import type { AnswerView } from './types';

/**
 * Ordenen: tik de getallen van klein naar groot. Elk goed getal schuift naar
 * de volgende trede van de trap; de trap zelf laat zien "klein → groot".
 */
export function sequenceTiles(numbers: readonly number[], placed: readonly number[], view: AnswerView, lastWrong?: number): HTMLElement {
  const stairs = el('div', { class: 'stairs', 'aria-label': 'Van klein naar groot' });
  numbers.forEach((_, i) => {
    const value = placed[i];
    stairs.append(
      el(
        'div',
        { class: ['stair', value !== undefined && 'filled', i === placed.length && !view.solved && 'next'].filter(Boolean).join(' '), style: `--h:${i}` },
        value !== undefined ? String(value) : '',
      ),
    );
  });

  const tiles = el('div', { class: 'choices tiles', role: 'group', 'aria-label': 'Getallen' });
  for (const value of numbers) {
    const used = placed.includes(value);
    const isWrong = view.wrong.includes(value);
    const tile = el(
      'button',
      {
        type: 'button',
        class: ['choice', 'tile', used && 'used', isWrong && 'wrong', isWrong && value === lastWrong && 'shake'].filter(Boolean).join(' '),
        disabled: used || isWrong || view.solved,
        'data-value': value,
        'aria-label': String(value),
      },
      String(value),
      view.pointAt === value && !used ? pointerHand() : null,
    );
    tile.addEventListener('click', () => view.onAnswer(value));
    tiles.append(tile);
  }
  return el('div', { class: 'sequence' }, stairs, tiles);
}
