import { freeSlots, place, placementFor, takeBack, type Placement } from '../../state/placement';
import { el } from '../dom';
import { flyFrom, reducedMotion } from '../motion';
import { THEME_EMOJI, thing } from '../visuals';
import type { Interaction, InteractionContext, InteractionView } from './types';

/** Zo ver moet een vinger bewegen voordat het slepen is (anders is het een tik). */
const DRAG_THRESHOLD = 10;

/**
 * Voorwerpen in de mand of het tienveld leggen. Slepen mag, tikken ook
 * (tik op een voorwerp = leggen, tik op een gelegd voorwerp = terug).
 * Verkeerd losgelaten (naast de mand of de mand is vol) → het voorwerp
 * schudt en gaat terug naar zijn plek. ✔ bevestigt het aantal.
 */
export function dragInteraction(ctx: InteractionContext): Interaction {
  const { exercise, theme } = ctx.task;
  const op = exercise.operation === 'makeTen' ? 'makeTen' : 'build';
  const answer = exercise.answer;
  const [fixedEmoji, itemEmoji] = theme === 'apples' ? ['🍎', '🍏'] : [THEME_EMOJI[theme][0], THEME_EMOJI[theme][0]];
  let state: Placement = placementFor(op, exercise.operands);
  let view: InteractionView = { wrong: [], solved: false, showHint: false, step: 0 };
  let suppressClick = false;

  const zone = el('div', { class: `drop-zone ${state.capacity > 10 ? 'twenty' : ''}`, 'aria-label': 'Mand' });
  const slots: HTMLButtonElement[] = [];
  for (let i = 0; i < state.capacity; i++) {
    const slot = el('button', { type: 'button', class: 'slot', 'aria-label': `Vakje ${i + 1}` });
    slot.addEventListener('click', () => removeAt(i));
    slots.push(slot);
    zone.append(slot);
  }
  const tray = el('div', { class: 'tray', 'aria-label': 'Voorraad' });
  const confirm = el('button', { type: 'button', class: 'hop-button confirm', 'aria-label': 'Klaar' }, '✔');
  confirm.addEventListener('click', submit);

  function makeItem(): HTMLButtonElement {
    const item = el('button', { type: 'button', class: 'drag-item', 'aria-label': 'Voorwerp' }, thing(itemEmoji));
    item.addEventListener('click', () => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      placeFrom(item, item.getBoundingClientRect());
    });
    item.addEventListener('pointerdown', (e) => startDrag(item, e));
    return item;
  }
  for (let i = 0; i < state.tray; i++) tray.append(makeItem());
  // Net naast een voorwerp getikt (tussenruimte of rand van de voorraad): toch leggen. Zo
  // is de hele voorraadrij één groot tikdoel, ook waar de voorwerpen kleiner zijn dan 88 px.
  const trayRow = el('div', { class: 'tray-row' }, tray, confirm);
  trayRow.addEventListener('click', (e) => {
    const first = tray.querySelector<HTMLButtonElement>('.drag-item');
    if ((e.target !== tray && e.target !== trayRow) || !first || first.disabled) return;
    placeFrom(first, first.getBoundingClientRect());
  });

  function locked(): boolean {
    return view.solved;
  }

  /** Leg een voorwerp uit de voorraad in het eerste lege vakje. */
  function placeFrom(item: HTMLElement, from: DOMRect): void {
    if (locked()) return;
    const r = place(state);
    if (!r.ok) {
      reject(item);
      return;
    }
    state = r.state;
    item.remove();
    ctx.feedback?.('place');
    draw();
    const slot = slots[state.fixed + state.placed - 1];
    slot.classList.remove('pop');
    void slot.offsetWidth;
    slot.classList.add('pop');
    flyFrom(slot, from);
    ctx.changed?.();
  }

  /** Tik op een gelegd voorwerp: terug naar de voorraad. */
  function removeAt(i: number): void {
    if (locked() || i < state.fixed || i >= state.fixed + state.placed) return;
    const from = slots[state.fixed + state.placed - 1].getBoundingClientRect();
    state = takeBack(state);
    const item = makeItem();
    tray.append(item);
    draw();
    flyFrom(item, from);
    ctx.changed?.();
  }

  /** Mag niet (vol): schudden en blijven liggen. */
  function reject(item: HTMLElement): void {
    item.classList.remove('shake');
    void item.offsetWidth;
    item.classList.add('shake');
    zone.classList.remove('full-bump');
    void zone.offsetWidth;
    zone.classList.add('full-bump');
    ctx.feedback?.('drop-fail');
  }

  function startDrag(item: HTMLElement, e: PointerEvent): void {
    if (locked() || e.button > 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let ghost: HTMLElement | null = null;
    try {
      item.setPointerCapture(e.pointerId);
    } catch {
      /* oudere browsers */
    }

    const inside = (x: number, y: number) => {
      const r = zone.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    const move = (ev: PointerEvent) => {
      if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > DRAG_THRESHOLD) {
        ghost = el('span', { class: 'drag-ghost', 'aria-hidden': 'true' }, thing(itemEmoji));
        document.body.append(ghost);
        item.classList.add('lifted');
      }
      if (ghost) {
        ev.preventDefault();
        ghost.style.left = `${ev.clientX}px`;
        ghost.style.top = `${ev.clientY}px`;
        zone.classList.toggle('over', inside(ev.clientX, ev.clientY) && freeSlots(state) > 0);
      }
    };
    const end = (ev: PointerEvent, cancelled = false) => {
      item.removeEventListener('pointermove', move);
      item.removeEventListener('pointerup', up);
      item.removeEventListener('pointercancel', cancel);
      zone.classList.remove('over');
      if (!ghost) return; // geen sleep: de click-handler legt het voorwerp
      suppressClick = true;
      const g = ghost;
      const dropRect = g.getBoundingClientRect();
      item.classList.remove('lifted');
      if (!cancelled && inside(ev.clientX, ev.clientY) && freeSlots(state) > 0) {
        g.remove();
        placeFrom(item, dropRect);
      } else {
        // Verkeerd losgelaten: terug naar de voorraad.
        returnGhost(g, item);
        reject(item);
      }
      // Een click na het slepen wordt hierboven al afgehandeld.
      window.setTimeout(() => (suppressClick = false), 400);
    };
    const up = (ev: PointerEvent) => end(ev);
    const cancel = (ev: PointerEvent) => end(ev, true);
    item.addEventListener('pointermove', move);
    item.addEventListener('pointerup', up);
    item.addEventListener('pointercancel', cancel);
  }

  function returnGhost(ghost: HTMLElement, item: HTMLElement): void {
    if (reducedMotion()) {
      ghost.remove();
      return;
    }
    const to = item.getBoundingClientRect();
    ghost.style.transition = 'left .3s ease-out, top .3s ease-out';
    ghost.style.left = `${to.left + to.width / 2}px`;
    ghost.style.top = `${to.top + to.height / 2}px`;
    window.setTimeout(() => ghost.remove(), 320);
  }

  function submit(): void {
    if (locked() || state.placed === 0) return;
    if (view.wrong.includes(state.placed)) {
      reject(confirm);
      return;
    }
    ctx.submit(state.placed);
  }

  function draw(): void {
    slots.forEach((slot, i) => {
      const isFixed = i < state.fixed;
      const isPlaced = !isFixed && i < state.fixed + state.placed;
      slot.classList.toggle('fixed', isFixed);
      slot.classList.toggle('placed', isPlaced);
      slot.classList.toggle('empty', !isFixed && !isPlaced);
      slot.disabled = !isPlaced || view.solved;
      // Hint: tel mee met getallen; bij aanvullen tellen de lege/gelegde vakjes vanaf 1.
      const n = op === 'makeTen' ? i - state.fixed + 1 : i + 1;
      const number = view.showHint && !isFixed && (op === 'makeTen' || isPlaced) ? el('span', { class: 'slot-number' }, String(n)) : null;
      slot.replaceChildren(isFixed ? thing(fixedEmoji) : isPlaced ? thing(itemEmoji) : '', ...(number ? [number] : []));
    });
    zone.classList.toggle('solved', view.solved);
    confirm.disabled = view.solved || state.placed === 0;
    confirm.classList.toggle('ready', !view.solved && state.placed > 0);
    for (const item of tray.querySelectorAll<HTMLButtonElement>('.drag-item')) item.disabled = view.solved;
  }

  draw();

  return {
    el: el('div', { class: `drag-task drag-${op}` }, zone, trayRow),
    update(v) {
      view = v;
      draw();
    },
    hintTarget() {
      if (view.solved) return null;
      if (state.placed < answer) return tray.querySelector<HTMLElement>('.drag-item');
      if (state.placed > answer) return slots[state.fixed + state.placed - 1];
      return confirm;
    },
  };
}

