import { el } from '../dom';
import type { Interaction, InteractionContext, InteractionView } from './types';

export interface ChoiceOptions {
  /** Inhoud van een knop; standaard het getal. */
  label?: (value: number) => Node | string;
  extraClass?: string;
}

/**
 * Grote antwoordknoppen. Direct na een tik krijgt de knop een "ingedrukt"
 * toestand; daarna groen (goed) of grijs en schudden (fout). Na een goed
 * antwoord zijn alle knoppen vergrendeld, zodat een tweede tik niets doet.
 */
export function choiceInteraction(ctx: InteractionContext, opts: ChoiceOptions = {}): Interaction {
  const { exercise, choices = [] } = ctx.task;
  const label = opts.label ?? String;
  const row = el('div', { class: `choices ${opts.extraClass ?? ''}`, role: 'group', 'aria-label': 'Antwoorden' });
  const buttons = new Map<number, HTMLButtonElement>();
  let view: InteractionView = { wrong: [], solved: false, showHint: false, step: 0 };

  for (const value of choices) {
    const button = el('button', { type: 'button', class: 'choice', 'data-value': value, 'aria-label': String(value) }, label(value));
    button.addEventListener('click', () => {
      if (view.solved || view.wrong.includes(value)) return;
      button.classList.add('pressed');
      ctx.feedback?.('tap');
      ctx.submit(value);
      button.classList.remove('pressed');
    });
    buttons.set(value, button);
    row.append(button);
  }

  return {
    el: row,
    update(v) {
      view = v;
      for (const [value, button] of buttons) {
        const isWrong = v.wrong.includes(value);
        button.classList.toggle('wrong', isWrong);
        button.classList.toggle('right', v.solved && value === exercise.answer);
        button.disabled = isWrong || v.solved;
        if (isWrong && value === v.lastWrong) {
          button.classList.remove('shake');
          void button.offsetWidth; // animatie opnieuw starten
          button.classList.add('shake');
        }
      }
      // Bij een hint krijgen keuzes met voorwerpen (vergelijken) getallen erbij.
      if (opts.label) for (const [value, button] of buttons) button.replaceChildren(label(value));
    },
    hintTarget() {
      return view.solved ? null : (buttons.get(exercise.answer) ?? null);
    },
  };
}
