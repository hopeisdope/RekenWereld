import { el } from '../dom';
import { pointerHand } from './pointer';
import type { AnswerView } from './types';

export interface JumpView extends AnswerView {
  min: number;
  max: number;
  start: number;
  answer: number;
}

/**
 * Rivier met genummerde stenen. De kikker staat op `start`; het kind tikt op de
 * steen waar de kikker uitkomt. Bij de hint lichten de stenen op de route op.
 */
export function numberLine(v: JumpView, lastWrong?: number): HTMLElement {
  const river = el('div', { class: 'river', role: 'group', 'aria-label': 'Getallenlijn' });
  const step = v.answer >= v.start ? 1 : -1;
  const frogAt = v.solved ? v.answer : v.start;

  for (let n = v.min; n <= v.max; n++) {
    const onPath = v.showHint && n !== v.start && (n - v.start) * step > 0 && (n - v.start) * step <= Math.abs(v.answer - v.start);
    const isWrong = v.wrong.includes(n);
    const stone = el(
      'button',
      {
        type: 'button',
        class: [
          'stone',
          n === v.start && 'start',
          onPath && 'path',
          isWrong && 'wrong',
          isWrong && n === lastWrong && 'shake',
          v.solved && n === v.answer && 'right',
        ]
          .filter(Boolean)
          .join(' '),
        disabled: isWrong || v.solved || n === v.start,
        'data-value': n,
        'aria-label': `Steen ${n}`,
      },
      onPath ? el('span', { class: 'hop' }, String(Math.abs(n - v.start))) : null,
      n === frogAt ? el('span', { class: v.solved ? 'frog landed' : 'frog', 'aria-hidden': 'true' }, '🐸') : null,
      el('span', { class: 'stone-number' }, String(n)),
      v.pointAt === n ? pointerHand() : null,
    );
    stone.addEventListener('click', () => v.onAnswer(n));
    river.append(stone);
  }
  return river;
}
