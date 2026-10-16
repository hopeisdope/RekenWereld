import { el } from '../dom';
import { pointerHand } from './pointer';
import type { AnswerView } from './types';

/**
 * Rij grote antwoordknoppen. Standaard staat er een getal op; met `label`
 * kan een knop ook iets anders tonen (bv. een groepje voorwerpen).
 */
export function choiceButtons(
  choices: readonly number[],
  answer: number,
  view: AnswerView,
  lastWrong?: number,
  label: (value: number) => Node | string = String,
  extraClass = '',
): HTMLElement {
  const row = el('div', { class: `choices ${extraClass}`, role: 'group', 'aria-label': 'Antwoorden' });
  for (const value of choices) {
    const isWrong = view.wrong.includes(value);
    const isAnswer = view.solved && value === answer;
    const button = el(
      'button',
      {
        type: 'button',
        class: ['choice', isWrong && 'wrong', isWrong && value === lastWrong && 'shake', isAnswer && 'right'].filter(Boolean).join(' '),
        disabled: isWrong || view.solved,
        'data-value': value,
        'aria-label': String(value),
      },
      label(value),
      view.pointAt === value ? pointerHand() : null,
    );
    button.addEventListener('click', () => view.onAnswer(value));
    row.append(button);
  }
  return row;
}
