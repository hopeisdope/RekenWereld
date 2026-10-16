import { GETALLENBOS_MAP } from '../../missions/map';
import { getallenbos, missions } from '../../missions/getallenbos';
import type { Progress } from '../../state/progress';
import type { ResumePoint } from '../../state/resume';
import { collection, missionStatus, suggestedMission, toWorld } from '../../state/world';
import { bigButton, el } from '../dom';
import { mascot, setPose } from '../mascot';
import { playSound } from '../sound';
import { speak } from '../speech';
import { PICK_MISSION } from '../texts';
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
      el('span', { class: 'node-icon', 'aria-hidden': 'true' }, node.icon),
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
  speak(PICK_MISSION);

  return {
    el: el(
      'main',
      { class: 'screen map-screen select' },
      el('header', { class: 'topbar' }, home, el('h1', {}, el('span', { 'aria-hidden': 'true' }, `${getallenbos.emoji} `), getallenbos.name), el('span', { class: 'spacer' })),
      map,
      shelf,
    ),
    destroy() {
      timers.forEach((t) => window.clearTimeout(t));
    },
  };
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
