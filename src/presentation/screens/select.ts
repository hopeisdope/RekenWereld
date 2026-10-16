import { getallenbos, missions } from '../../missions/getallenbos';
import type { Progress } from '../../state/progress';
import { bigButton, el } from '../dom';
import { speak } from '../speech';
import { mascotBubble } from './mascot';
import type { Screen } from './types';

export function starRow(earned: number, total = 3): HTMLElement {
  const row = el('span', { class: 'stars', 'aria-label': `${earned} van de ${total} sterren` });
  for (let i = 0; i < total; i++) row.append(el('span', { class: i < earned ? 'star on' : 'star', 'aria-hidden': 'true' }, '⭐'));
  return row;
}

export function selectScreen(progress: Progress, onPick: (missionId: string) => void, onBack: () => void): Screen {
  const list = el('div', { class: 'mission-list' });
  for (const id of getallenbos.missionIds) {
    const m = missions[id];
    const p = progress[id];
    list.append(
      bigButton(
        [
          el('span', { class: 'mission-emoji', 'aria-hidden': 'true' }, m.emoji),
          el('span', { class: 'mission-text' }, el('strong', {}, m.title), el('span', { class: 'goal' }, m.goal)),
          starRow(p?.bestStars ?? 0),
        ],
        () => {
          speak(m.title);
          onPick(id);
        },
        'mission-card',
      ),
    );
  }
  return {
    el: el(
      'main',
      { class: 'screen select' },
      el('header', { class: 'topbar' }, bigButton('🏠', onBack, 'icon-button'), el('h1', {}, `${getallenbos.emoji} ${getallenbos.name}`), el('span', { class: 'spacer' })),
      el('div', { class: 'card' }, mascotBubble('Kies een missie!'), list),
    ),
  };
}
