import { getallenbos, missions } from '../../missions/getallenbos';
import { suggestedMission } from '../../state/guidance';
import type { Progress } from '../../state/progress';
import { bigButton, el } from '../dom';
import { speak } from '../speech';
import { PICK_MISSION } from '../texts';
import type { Screen } from './types';

export function starRow(earned: number, total = 3): HTMLElement {
  const row = el('span', { class: 'stars', 'aria-label': `${earned} van de ${total} sterren` });
  for (let i = 0; i < total; i++) row.append(el('span', { class: i < earned ? 'star on' : 'star', 'aria-hidden': 'true' }, '⭐'));
  return row;
}

/** Tijdelijke illustraties van emoji en vormen, per missie herkenbaar zonder tekst. */
const SCENES: Record<string, () => HTMLElement> = {
  voetstappen: () =>
    el(
      'div',
      { class: 'scene scene-voetstappen' },
      el('span', { class: 'paw p1' }, '🐾'),
      el('span', { class: 'paw p2' }, '🐾'),
      el('span', { class: 'paw p3' }, '🐾'),
      el('span', { class: 'scene-tree' }, '🌳'),
    ),
  appelmand: () =>
    el(
      'div',
      { class: 'scene scene-appelmand' },
      el('span', { class: 'apple a1' }, '🍎'),
      el('span', { class: 'apple a2' }, '🍏'),
      el('span', { class: 'apple a3' }, '🍎'),
      el('span', { class: 'basket-emoji' }, '🧺'),
    ),
  rivier: () =>
    el(
      'div',
      { class: 'scene scene-rivier' },
      el('span', { class: 'rock r1' }),
      el('span', { class: 'rock r2' }),
      el('span', { class: 'rock r3' }),
      el('span', { class: 'scene-frog' }, '🐸'),
    ),
};

/**
 * Missieselectie: drie grote plaatjes. Tikken start de missie meteen. De
 * hand wijst de eerstvolgende missie aan; sterren tonen wat al gelukt is.
 */
export function selectScreen(progress: Progress, onPick: (missionId: string) => void, onBack: () => void): Screen {
  const suggested = suggestedMission(getallenbos.missionIds, progress);
  const grid = el('div', { class: 'mission-grid' });
  for (const id of getallenbos.missionIds) {
    const m = missions[id];
    const p = progress[id];
    const tile = bigButton(
      [
        SCENES[id](),
        starRow(p?.roundsDone ?? 0, m.rounds.length),
        el('span', { class: 'tile-title' }, m.title),
        id === suggested ? el('span', { class: 'point-down', 'aria-hidden': 'true' }, '👇') : null,
      ],
      () => {
        speak(m.title);
        onPick(id);
      },
      ['mission-tile', `tile-${id}`, id === suggested && 'suggested', p?.completed && 'done'].filter(Boolean).join(' '),
    );
    tile.setAttribute('aria-label', m.title);
    tile.dataset.mission = id;
    grid.append(tile);
  }

  const home = bigButton('🏠', onBack, 'icon-button');
  home.setAttribute('aria-label', 'Terug');
  speak(PICK_MISSION);

  return {
    el: el(
      'main',
      { class: 'screen select' },
      el(
        'header',
        { class: 'topbar' },
        home,
        el('h1', {}, el('span', { 'aria-hidden': 'true' }, `${getallenbos.emoji} `), getallenbos.name),
        el('span', { class: 'mascot', 'aria-hidden': 'true' }, '🦉'),
      ),
      grid,
    ),
  };
}
