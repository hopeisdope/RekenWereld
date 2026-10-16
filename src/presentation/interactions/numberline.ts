import { el } from '../dom';
import { motionDelay } from '../motion';
import type { Interaction, InteractionContext, InteractionView } from './types';

const HOP_MS = 260;

/**
 * Getallenlijn als rivier met stenen. De kikker begint op het startgetal.
 * Het kind springt met grote ⬅️/➡️-knoppen één steen per tik (geen precieze
 * beweging nodig), of tikt een steen aan: de kikker springt er dan stap voor
 * stap heen, zodat het tellen zichtbaar blijft. ✔ bevestigt.
 *
 * Er wordt nooit iets vanzelf voorgedaan: alle sprongen komen van het kind
 * (of van de mascotte in het voorbeeld met een ander getal), zodat de
 * animatie het antwoord niet verraadt. Na een fout springt de kikker terug.
 */
export function numberLineInteraction(ctx: InteractionContext): Interaction {
  const { line = { min: 0, max: 10 }, exercise } = ctx.task;
  const [start] = exercise.operands;
  const answer = exercise.answer;
  const count = line.max - line.min + 1;
  const pct = (n: number) => `${((n - line.min + 0.5) / count) * 100}%`;

  /** Bezochte stenen vanaf de start; de laatste is waar de kikker zit. */
  let path: number[] = [start];
  let busy = false;
  let view: InteractionView = { wrong: [], solved: false, showHint: false, step: 0 };
  const timers = new Set<number>();
  const pos = () => path[path.length - 1];

  const stones = el('div', { class: 'stones' });
  const stoneEls = new Map<number, HTMLButtonElement>();
  for (let n = line.min; n <= line.max; n++) {
    const stone = el(
      'button',
      {
        type: 'button',
        class: ['stone', n === start && 'start', n % 5 === 0 && 'five', n % 10 === 0 && 'ten'].filter(Boolean).join(' '),
        'data-value': n,
        'aria-label': `Steen ${n}`,
      },
      el('span', { class: 'stone-number' }, String(n)),
    );
    stone.addEventListener('click', () => walkTo(n));
    stoneEls.set(n, stone);
    stones.append(stone);
  }
  const frog = el('span', { class: 'frog', 'aria-hidden': 'true' }, '🐸');
  const arcs = el('div', { class: 'arcs', 'aria-hidden': 'true' });
  const river = el('div', { class: `river ${count > 11 ? 'long' : ''}` }, arcs, stones, frog);

  const back = el('button', { type: 'button', class: 'hop-button back', 'aria-label': 'Terug springen' }, '⬅️');
  const confirm = el('button', { type: 'button', class: 'hop-button confirm', 'aria-label': 'Klaar' }, '✔');
  const forward = el('button', { type: 'button', class: 'hop-button forward', 'aria-label': 'Vooruit springen' }, '➡️');
  back.addEventListener('click', () => hop(-1));
  forward.addEventListener('click', () => hop(1));
  confirm.addEventListener('click', submit);
  const controls = el('div', { class: 'hop-controls' }, back, confirm, forward);

  function later(ms: number, fn: () => void) {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, motionDelay(ms));
    timers.add(id);
  }

  function hop(dir: 1 | -1): void {
    if (busy || view.solved) return;
    const next = pos() + dir;
    if (next < line.min || next > line.max) return;
    // Terug over het eigen spoor haalt de laatste sprong weg; anders een nieuwe sprong.
    if (path.length >= 2 && path[path.length - 2] === next) path.pop();
    else path.push(next);
    ctx.feedback?.('hop');
    draw();
    if (!busy) ctx.changed?.();
  }

  /** Steen aangetikt: spring er stap voor stap heen. */
  function walkTo(target: number): void {
    if (busy || view.solved || target === pos()) return;
    const dir = target > pos() ? 1 : -1;
    const step = () => {
      busy = false;
      hop(dir);
      if (pos() !== target) {
        busy = true; // tijdens het springen geen andere tikken
        draw();
        later(HOP_MS, step);
      }
    };
    step();
  }

  function submit(): void {
    if (busy || view.solved || pos() === start) return;
    if (view.wrong.includes(pos())) {
      // Al eerder geprobeerd: laat zien dat het niet klopt en spring terug.
      bounceBack();
      return;
    }
    ctx.submit(pos());
  }

  function bounceBack(): void {
    frog.classList.remove('oops');
    void frog.offsetWidth;
    frog.classList.add('oops');
    ctx.feedback?.('drop-fail');
    busy = true;
    later(500, () => {
      path = [start];
      busy = false;
      draw();
      ctx.changed?.();
    });
  }

  function draw(): void {
    frog.style.left = pct(pos());
    frog.classList.toggle('landed', view.solved);
    arcs.replaceChildren(
      ...path.slice(1).map((to, i) => {
        const from = path[i];
        return el('span', { class: to > from ? 'arc fwd' : 'arc bwd', style: `left:${pct(Math.min(from, to))};width:${100 / count}%` }, el('span', { class: 'arc-num' }, String(i + 1)));
      }),
    );
    const hintPath = new Set<number>();
    if (view.showHint && !view.solved) {
      const dir = answer > start ? 1 : -1;
      for (let n = start + dir; n !== answer + dir; n += dir) hintPath.add(n);
    }
    for (const [n, stone] of stoneEls) {
      stone.classList.toggle('path', hintPath.has(n));
      stone.classList.toggle('here', n === pos());
      stone.classList.toggle('right', view.solved && n === answer);
      stone.disabled = view.solved;
    }
    back.disabled = view.solved || pos() <= line.min;
    forward.disabled = view.solved || pos() >= line.max;
    confirm.disabled = view.solved || pos() === start;
    confirm.classList.toggle('ready', !view.solved && pos() !== start);
  }

  return {
    el: el('div', { class: 'numberline' }, river, controls),
    update(v) {
      const newWrong = v.lastWrong !== undefined && v.lastWrong !== view.lastWrong;
      view = v;
      if (newWrong && v.lastWrong === pos()) bounceBack();
      draw();
    },
    hintTarget() {
      if (busy || view.solved) return null;
      if (pos() < answer) return forward;
      if (pos() > answer) return back;
      return confirm;
    },
    destroy() {
      timers.forEach((id) => window.clearTimeout(id));
    },
  };
}
