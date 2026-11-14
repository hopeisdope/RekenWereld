import { el } from './dom';
import { reducedMotion } from './motion';
import { playSound } from './sound';
import { PORTAL_LABEL } from './texts';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Terug naar de spelletjesportal op de root van hetzelfde domein
 * (https://hopeisdope.github.io/).
 *
 * LET OP: dit is de enige uitzondering op de padregel uit CLAUDE.md. Hier wordt bewust
 * níet `import.meta.env.BASE_URL` gebruikt, want die wijst naar /RekenWereld/ zelf;
 * de portal staat op de root van de origin.
 */
export function portalUrl(origin: string): string {
  return `${origin}/`;
}

/** Minimale vorm van `window.location` (voor tests). */
export type PortalLocation = Pick<Location, 'origin' | 'assign'>;

/** Verlaat de app richting de portal. Voortgang moet vóór deze aanroep bewaard zijn. */
export function goToPortal(loc: PortalLocation = window.location): void {
  loc.assign(portalUrl(loc.origin));
}

/**
 * Thuisknop naar de spelletjesportal: een SVG-huisje zonder tekst. Alleen op het
 * beginscherm en de wereldkaart (niet in een opdracht, niet bij de ouders). Eén tik:
 * kort indrukken (niet bij "Beperk beweging") en dan weg; dubbel tikken telt één keer.
 */
export function portalButton(onPortal: () => void): HTMLButtonElement {
  const button = el('button', { type: 'button', class: 'portal-button', 'aria-label': PORTAL_LABEL, 'data-portal': '' });
  button.append(houseSvg());
  let gone = false;
  button.addEventListener('click', () => {
    if (gone) return;
    gone = true;
    playSound('tap');
    if (reducedMotion()) {
      onPortal();
      return;
    }
    button.classList.add('leaving');
    window.setTimeout(onPortal, 220);
  });
  return button;
}

export function houseSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('class', 'house-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = `
    <rect x="42" y="12" width="7" height="14" rx="1" fill="#8a5a3b"/>
    <path d="M32 6 L59 30 L5 30 Z" fill="#e2553f" stroke="#a8322a" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="11" y="29" width="42" height="28" rx="2" fill="#ffd27a" stroke="#c9963a" stroke-width="2.5"/>
    <rect x="27" y="38" width="11" height="19" rx="5.5" fill="#7a4a2c"/>
    <circle cx="35" cy="48" r="1.4" fill="#ffd27a"/>
    <rect x="15" y="35" width="8" height="8" rx="1.5" fill="#8fd3ff" stroke="#c9963a" stroke-width="1.5"/>
    <rect x="42" y="35" width="8" height="8" rx="1.5" fill="#8fd3ff" stroke="#c9963a" stroke-width="1.5"/>`;
  return svg;
}

/** Tandwiel (SVG): terug naar het beginscherm. */
export function gearSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('class', 'gear-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const teeth = Array.from({ length: 8 }, (_, i) => `<rect x="27" y="4" width="10" height="14" rx="2.5" transform="rotate(${i * 45} 32 32)"/>`).join('');
  svg.innerHTML = `
    <g fill="#6b7a8c">${teeth}<circle cx="32" cy="32" r="20"/></g>
    <circle cx="32" cy="32" r="8" fill="#fff"/>`;
  return svg;
}
