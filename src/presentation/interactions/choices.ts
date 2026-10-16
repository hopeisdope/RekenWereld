import { el } from '../dom';
import { pointerHand } from './pointer';
import type { AnswerView } from './types';

/** Rij grote antwoordknoppen met getallen. */
export function choiceButtons(choices: readonly number[], answer: number, view: AnswerView, lastWrong?: number): HTMLElement {
  const row = el('div', { class: 'choices', role: 'group', 'aria-label': 'Antwoorden' });
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
      },
      String(value),
      view.pointAt === value ? pointerHand() : null,
    );
    button.addEventListener('click', () => view.onAnswer(value));
    row.append(button);
  }
  return row;
}
