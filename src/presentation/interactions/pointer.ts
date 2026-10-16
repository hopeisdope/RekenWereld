import { el } from '../dom';

/** Wijzende hand die op en neer tikt; puur visueel. */
export function pointerHand(): HTMLElement {
  return el('span', { class: 'pointer-hand', 'aria-hidden': 'true' }, '👆');
}
