import type { Task } from '../missions/types';
import { el } from './dom';

/** Eén pootafdruk. Het emoji 🐾 toont er twee, waardoor kinderen dubbel tellen. */
export const PAW = 'paw';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function pawSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('class', 'paw-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<ellipse cx="20" cy="27" rx="9.5" ry="8"/>' +
    '<ellipse cx="9" cy="16" rx="4" ry="5" transform="rotate(-20 9 16)"/>' +
    '<ellipse cx="16" cy="9" rx="4" ry="5.2" transform="rotate(-6 16 9)"/>' +
    '<ellipse cx="24" cy="9" rx="4" ry="5.2" transform="rotate(6 24 9)"/>' +
    '<ellipse cx="31" cy="16" rx="4" ry="5" transform="rotate(20 31 16)"/>';
  return svg;
}

/** Inhoud van één voorwerp: een emoji, of de eigen pootafdruk. */
export function thing(token: string): Node | string {
  return token === PAW ? pawSvg() : token;
}

/** Voorwerp per thema. */
export const THEME_EMOJI: Record<Task['theme'], [string, string]> = {
  paws: [PAW, PAW],
  apples: ['🍎', '🍏'],
  frog: ['🪨', '🪨'],
};

/**
 * n keer hetzelfde plaatje, in rijen van 10 met groepjes van 5 (zoals een
 * rekenrek). `numberFrom` zet getallen onder de plaatjes (hint);
 * `fadeFrom` maakt de plaatjes vanaf die index vaag (weggegeten/verstopt).
 */
export function items(emoji: string, n: number, numberFrom: number | null, extraClass = '', fadeFrom = Infinity): HTMLElement {
  const wrap = el('div', { class: `items ${extraClass}`, 'aria-label': `${n}` });
  let row: HTMLElement | null = null;
  let group: HTMLElement | null = null;
  for (let i = 0; i < n; i++) {
    if (i % 10 === 0) {
      row = el('div', { class: 'row' });
      wrap.append(row);
    }
    if (i % 5 === 0) {
      group = el('span', { class: 'group' });
      row!.append(group);
    }
    const faded = i >= fadeFrom;
    group!.append(
      el(
        'span',
        { class: faded ? 'item gone' : 'item', 'aria-hidden': 'true' },
        thing(emoji),
        numberFrom !== null && !faded ? el('span', { class: 'item-number' }, String(numberFrom + i)) : null,
      ),
    );
  }
  return wrap;
}

/** Tienveld (2 × 5): `filled` gevuld, de rest leeg; bij hint krijgen lege vakjes nummers. */
export function tenFrame(filled: number, emoji: string, hint: boolean): HTMLElement {
  const frame = el('div', { class: 'ten-frame', 'aria-label': `${filled} van de 10` });
  for (let i = 0; i < 10; i++) {
    const full = i < filled;
    frame.append(el('span', { class: full ? 'cell full' : 'cell empty' }, full ? thing(emoji) : hint ? String(i - filled + 1) : ''));
  }
  return frame;
}

/** Wat er boven de antwoorden te zien is. Begrijpelijk zonder te lezen. */
export function visual(task: Task, hint: boolean): HTMLElement {
  const [a, b] = task.exercise.operands;
  const [one, two] = THEME_EMOJI[task.theme];
  const concrete = task.support === 'concrete' || hint;
  switch (task.prompt) {
    case 'count':
      return el('div', { class: 'count-scene' }, items(one, a, hint ? 1 : null), el('span', { class: 'qmark', 'aria-hidden': 'true' }, '?'));
    case 'recognize':
    case 'build':
      return el(
        'div',
        { class: 'match-scene' },
        el('div', { class: 'sign', 'aria-label': `Getal ${a}` }, String(a)),
        hint && task.prompt === 'recognize' ? items('🔵', a, null, 'dots') : null,
      );
    case 'compare':
      return el('div', { class: 'compare-hint', 'aria-hidden': 'true' }, '⚖️');
    case 'order':
      return el('div', { class: 'order-hint', 'aria-hidden': 'true' });
    case 'missing': {
      const [start, gap, length] = task.exercise.operands;
      const row = el('div', { class: 'number-path' });
      for (let i = 0; i < length; i++) {
        if (i > 0) row.append(el('span', { class: hint ? 'plus-one show' : 'plus-one' }, hint ? '+1' : ''));
        row.append(
          el(
            'span',
            { class: i === gap ? 'path-tile gap' : 'path-tile' },
            concrete && task.theme === 'paws' ? el('span', { class: 'tile-paw', 'aria-hidden': 'true' }, pawSvg()) : null,
            el('span', { class: 'tile-number' }, i === gap ? '?' : String(start + i)),
          ),
        );
      }
      return row;
    }
    case 'add':
      return el(
        'div',
        { class: 'sum' },
        concrete ? el('div', { class: 'basket' }, items(one, a, hint ? 1 : null), el('span', { class: 'plus' }, '+'), items(two, b, hint ? a + 1 : null)) : null,
        el('div', { class: 'equation' }, `${a} + ${b} = ?`),
      );
    case 'subtract':
      return el(
        'div',
        { class: 'sum' },
        concrete ? el('div', { class: 'basket' }, items(one, a, hint ? 1 : null, '', a - b)) : null,
        el('div', { class: 'equation' }, `${a} − ${b} = ?`),
      );
    case 'split':
      return el(
        'div',
        { class: 'split-house' },
        el('div', { class: 'roof' }, String(a)),
        el(
          'div',
          { class: 'rooms' },
          el('div', { class: 'room' }, concrete ? items(one, b, null) : null, el('span', { class: 'room-number' }, String(b))),
          el('div', { class: 'room unknown' }, hint ? items(one, a - b, 1, 'ghost') : null, el('span', { class: 'room-number' }, '?')),
        ),
      );
    case 'makeTen':
      // Bij slepen zit het tienveld in de bediening zelf.
      return el('div', { class: 'sum' }, concrete && task.interaction !== 'drag' ? tenFrame(a, one, hint) : null, el('div', { class: 'equation' }, `${a} + ? = 10`));
    case 'jump':
    case 'jumpBack': {
      const forward = task.exercise.operation === 'add';
      const hops = el('span', { class: 'hops' });
      if (concrete) for (let i = 0; i < b; i++) hops.append(el('span', { class: 'hop-arc' }));
      return el(
        'div',
        { class: 'jump-scene' },
        el(
          'div',
          { class: `jump-card ${forward ? 'forward' : 'back'}`, 'aria-label': `${b} ${forward ? 'vooruit' : 'terug'}` },
          el('span', { class: 'arrow' }, forward ? '➡️' : '⬅️'),
          hops,
          el('span', { class: 'jump-count' }, String(b)),
        ),
        el('div', { class: 'equation' }, `${a} ${forward ? '+' : '−'} ${b} = ?`),
      );
    }
  }
}

/** Inhoud van een vergelijk-knop: een groepje voorwerpen (concreet) of het getal (abstract). */
export function compareLabel(task: Task, hint: boolean) {
  const [one] = THEME_EMOJI[task.theme];
  return (value: number): Node | string =>
    task.support === 'concrete' || hint ? el('span', { class: 'group-choice' }, items(one, value, hint ? 1 : null, 'small'), task.support === 'abstract' ? el('span', { class: 'group-number' }, String(value)) : null) : String(value);
}
