import { GETALLENBOS_MAP } from '../../missions/map';
import { getallenbos, missions } from '../../missions/getallenbos';
import type { Progress } from '../../state/progress';
import type { ResumePoint } from '../../state/resume';
import { collection, missionStatus, suggestedMission, toWorld } from '../../state/world';
import { bigButton, el } from '../dom';
import { mascot, setPose } from '../mascot';
import { reducedMotion } from '../motion';
import { playSound } from '../sound';
import { speak } from '../speech';
import { PICK_MISSION, PORTAL_LABEL } from '../texts';
import { thing } from '../visuals';
import { starRow } from '../widgets';
import type { Screen } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BADGE: Record<string, string> = { locked: '🔒', inProgress: '▶', completed: '✔', available: '' };

/**
 * Kaart van Het Getallenbos. Eén primaire actie: de missie waar de uil naar
 * wijst (gloed + 👇). Statussen zijn alleen beeld: slotje (dicht), ring die
 * zich vult per ronde (bezig), vinkje (klaar), sterren per ronde. Onderaan de
 * verzameling dieren (gevonden in kleur, nog te vinden als schaduw).
 */
export function mapScreen(
  progress: Progress,
  resume: ResumePoint | null,
  justUnlocked: readonly string[],
  onPick: (missionId: string) => void,
  onHome: () => void,
  onPortal: () => void,
): Screen {
  const order = toWorld(getallenbos.missionIds.map((id) => missions[id]));
  const suggested = suggestedMission(order, progress, resume);
  const map = el('div', { class: 'map', role: 'group', 'aria-label': getallenbos.name });
  map.append(drawBackground());

  const owl = mascot('point', 'map-owl');
  const timers: number[] = [];

  for (const id of getallenbos.missionIds) {
    const m = missions[id];
    const node = GETALLENBOS_MAP.nodes[id];
    const status = missionStatus(order, progress, resume, id);
    const roundsDone = progress[id]?.roundsDone ?? 0;
    const ring = el(
      'span',
      { class: 'node-ring', style: `--done:${roundsDone / m.rounds.length}` },
      el('span', { class: 'node-icon', 'aria-hidden': 'true' }, thing(node.icon)),
    );
    const button = el(
      'button',
      {
        type: 'button',
        class: ['mission-tile', 'node', `status-${status}`, id === suggested && 'suggested', justUnlocked.includes(id) && 'unlocking', status === 'completed' && 'done', status === 'locked' && 'locked']
          .filter(Boolean)
          .join(' '),
        style: `left:${node.x}%;top:${node.y}%`,
        'data-mission': id,
        'data-status': status,
        'aria-label': `${m.title}${status === 'locked' ? ' (op slot)' : ''}`,
      },
      ring,
      BADGE[status] ? el('span', { class: `node-badge badge-${status}`, 'aria-hidden': 'true' }, BADGE[status]) : null,
      starRow(roundsDone, m.rounds.length),
      id === suggested ? el('span', { class: 'point-down', 'aria-hidden': 'true' }, '👇') : null,
    );
    button.addEventListener('click', () => {
      if (status === 'locked') {
        // Nog dicht: het slotje schudt en de uil wijst nog eens naar de open missie.
        button.classList.remove('nope');
        void button.offsetWidth;
        button.classList.add('nope');
        playSound('locked');
        setPose(owl, 'wave', owl.classList.contains('flip'));
        timers.push(window.setTimeout(() => setPose(owl, 'point', owl.classList.contains('flip')), 900));
        return;
      }
      playSound('tap');
      speak(m.title);
      onPick(id);
    });
    map.append(button);
  }

  // De uil staat naast de aangewezen missie en wijst ernaar.
  const target = GETALLENBOS_MAP.nodes[suggested];
  const onRight = target.x < 50;
  owl.style.left = `${onRight ? target.x + 17 : target.x - 17}%`;
  owl.style.top = `${target.y - 4}%`;
  setPose(owl, 'point', onRight); // rechts van de missie → spiegelen zodat hij naar links wijst
  map.append(owl);

  if (justUnlocked.length) timers.push(window.setTimeout(() => playSound('unlock'), 500));

  const shelf = el('div', { class: 'collection', 'aria-label': 'Verzameling' });
  let group: HTMLElement | null = null;
  let last = '';
  for (const c of collection(getallenbos.missionIds.map((id) => missions[id]), progress)) {
    if (c.missionId !== last) {
      group = el('span', { class: 'collection-group' });
      shelf.append(group);
      last = c.missionId;
    }
    const animal = el('button', { type: 'button', class: c.found ? 'animal found' : 'animal', disabled: !c.found, 'aria-label': c.found ? 'Gevonden dier' : 'Nog te vinden' }, c.reward);
    animal.addEventListener('click', () => {
      animal.classList.remove('jump');
      void animal.offsetWidth;
      animal.classList.add('jump');
      playSound('collect');
    });
    group!.append(animal);
  }

  const home = bigButton('🏠', onHome, 'icon-button');
  home.setAttribute('aria-label', 'Terug');
  const portal = portalButton(onPortal, timers);
  speak(PICK_MISSION);

  return {
    el: el(
      'main',
      { class: 'screen map-screen select' },
      el('header', { class: 'topbar' }, home, el('h1', {}, el('span', { 'aria-hidden': 'true' }, `${getallenbos.emoji} `), getallenbos.name), portal),
      map,
      shelf,
    ),
    destroy() {
      timers.forEach((t) => window.clearTimeout(t));
    },
  };
}

/**
 * Thuisknop naar de spelletjesportal: een SVG-huisje zonder tekst. Alleen hier op de
 * wereldkaart (niet in een opdracht, niet bij de ouders). Eén tik: kort indrukken
 * (niet bij "Beperk beweging") en dan weg; dubbel tikken telt één keer.
 */
function portalButton(onPortal: () => void, timers: number[]): HTMLButtonElement {
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
    timers.push(window.setTimeout(onPortal, 220));
  });
  return button;
}

function houseSvg(): SVGSVGElement {
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

/** Pad, rivier en versiering als SVG (schaalt mee met de kaart). */
function drawBackground(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'map-bg');
  svg.setAttribute('aria-hidden', 'true');
  const decor = GETALLENBOS_MAP.decor
    .map(([emoji, x, y, size]) => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle">${emoji}</text>`)
    .join('');
  svg.innerHTML = `
    <path class="map-river" d="${GETALLENBOS_MAP.river}"/>
    <path class="map-trail-edge" d="${GETALLENBOS_MAP.trail}"/>
    <path class="map-trail" d="${GETALLENBOS_MAP.trail}"/>
    ${decor}`;
  return svg;
}
