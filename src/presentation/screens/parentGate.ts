import { el } from '../dom';

const HOLD_MS = 2000;

/**
 * Toegang voor ouders: eerst 2 seconden een knop ingedrukt houden, daarna een
 * eenvoudige keersom (voor een kind in groep 3 niet op te lossen). Geen
 * wachtwoord, geen account. Verkeerd antwoord sluit gewoon weer.
 */
export function openParentGate(host: HTMLElement, rng: () => number, onPass: () => void): void {
  const close = () => overlay.remove();
  const closeBtn = el('button', { type: 'button', class: 'gate-close', 'aria-label': 'Sluiten' }, '✕');
  closeBtn.addEventListener('click', close);
  const body = el('div', { class: 'gate-body' });
  const overlay = el('div', { class: 'gate', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Voor ouders' }, el('div', { class: 'gate-card' }, closeBtn, el('h2', {}, 'Voor ouders'), body));
  host.append(overlay);

  // Stap 1: ingedrukt houden.
  const hold = el('button', { type: 'button', class: 'gate-hold' }, el('span', { class: 'gate-hold-fill' }), el('span', { class: 'gate-hold-label' }, 'Houd ingedrukt'));
  let timer: number | undefined;
  const start = (e: Event) => {
    e.preventDefault();
    hold.classList.add('holding');
    timer = window.setTimeout(askQuestion, HOLD_MS);
  };
  const stop = () => {
    hold.classList.remove('holding');
    window.clearTimeout(timer);
  };
  hold.addEventListener('pointerdown', start);
  hold.addEventListener('pointerup', stop);
  hold.addEventListener('pointerleave', stop);
  hold.addEventListener('pointercancel', stop);
  hold.addEventListener('contextmenu', (e) => e.preventDefault());
  body.append(el('p', {}, 'Houd de knop 2 seconden ingedrukt.'), hold);

  // Stap 2: keersom.
  function askQuestion(): void {
    const a = 6 + Math.floor(rng() * 4); // 6–9
    const b = 6 + Math.floor(rng() * 4);
    const answer = a * b;
    const options = new Set([answer]);
    for (let i = 0; options.size < 4; i++) {
      options.add(i < 40 ? answer + (Math.floor(rng() * 7) - 3) * (1 + Math.floor(rng() * 3)) : answer + options.size * 7);
    }
    const buttons = [...options].sort((x, y) => x - y).map((v) => {
      const btn = el('button', { type: 'button', class: 'gate-answer', 'data-value': v }, String(v));
      btn.addEventListener('click', () => {
        close();
        if (v === answer) onPass();
      });
      return btn;
    });
    body.replaceChildren(el('p', { class: 'gate-question' }, `Hoeveel is ${a} × ${b}?`), el('div', { class: 'gate-answers' }, ...buttons));
  }
}
