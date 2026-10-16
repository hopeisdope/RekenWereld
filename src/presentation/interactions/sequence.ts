import { el } from '../dom';
import { flyFrom } from '../motion';
import type { Interaction, InteractionContext, InteractionView } from './types';

/**
 * Ordenen: tik de getallen van klein naar groot. Elk goed getal vliegt naar
 * de volgende trede van de trap; de trap zelf laat "klein → groot" zien.
 */
export function sequenceInteraction(ctx: InteractionContext): Interaction {
  const { operands, steps = [] } = ctx.task.exercise;
  const stairs = el('div', { class: 'stairs', 'aria-label': 'Van klein naar groot' });
  const stairEls = operands.map((_, i) => el('div', { class: 'stair', style: `--h:${i}` }));
  stairs.append(...stairEls);

  const tiles = el('div', { class: 'choices tiles', role: 'group', 'aria-label': 'Getallen' });
  const tileEls = new Map<number, HTMLButtonElement>();
  let view: InteractionView = { wrong: [], solved: false, showHint: false, step: 0 };
  let placed = 0;

  for (const value of operands) {
    const tile = el('button', { type: 'button', class: 'choice tile', 'data-value': value, 'aria-label': String(value) }, String(value));
    tile.addEventListener('click', () => {
      if (view.solved || tile.classList.contains('used') || view.wrong.includes(value)) return;
      ctx.feedback?.('tap');
      ctx.submit(value);
    });
    tileEls.set(value, tile);
    tiles.append(tile);
  }

  return {
    el: el('div', { class: 'sequence' }, stairs, tiles),
    update(v) {
      view = v;
      const done = v.solved ? steps.length : v.step;
      for (let i = placed; i < done; i++) {
        const tile = tileEls.get(steps[i])!;
        const from = tile.getBoundingClientRect();
        tile.classList.add('used');
        tile.disabled = true;
        stairEls[i].textContent = String(steps[i]);
        stairEls[i].classList.add('filled');
        flyFrom(stairEls[i], from);
      }
      placed = done;
      stairEls.forEach((s, i) => s.classList.toggle('next', i === done && !v.solved));
      for (const [value, tile] of tileEls) {
        if (tile.classList.contains('used')) continue;
        const isWrong = v.wrong.includes(value);
        tile.classList.toggle('wrong', isWrong);
        tile.disabled = isWrong || v.solved;
        if (isWrong && value === v.lastWrong) {
          tile.classList.remove('shake');
          void tile.offsetWidth;
          tile.classList.add('shake');
        }
      }
    },
    hintTarget() {
      return view.solved ? null : (tileEls.get(steps[view.step]) ?? null);
    },
  };
}
