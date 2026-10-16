/** Respecteer "Beperk beweging" (iPadOS: Toegankelijkheid → Beweging). */
export function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Wacht `ms`, of niet als beweging beperkt is. */
export function motionDelay(ms: number): number {
  return reducedMotion() ? 0 : ms;
}

/**
 * Laat `node` vanaf de plek van `from` naar zijn eigen plek vliegen (FLIP).
 * Puur visueel; bij beperkte beweging gebeurt er niets.
 */
export function flyFrom(node: HTMLElement, from: DOMRect, ms = 320): void {
  if (reducedMotion()) return;
  const to = node.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  if (!dx && !dy) return;
  node.animate([{ transform: `translate(${dx}px, ${dy}px) scale(1.15)` }, { transform: 'translate(0, 0) scale(1)' }], {
    duration: ms,
    easing: 'cubic-bezier(.2,.8,.3,1.2)',
  });
}
