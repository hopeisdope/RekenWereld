import { getallenbos } from '../../missions/getallenbos';
import { bigButton, el } from '../dom';
import { speak } from '../speech';
import { MASCOT } from '../texts';
import { mascotBubble } from './mascot';
import type { Screen } from './types';

export function startScreen(onOpenArea: () => void): Screen {
  const greeting = `Hoi! Ik ben ${MASCOT.name}. Gaan we samen naar ${getallenbos.name.toLowerCase()}?`;
  const area = bigButton(
    [el('span', { class: 'area-emoji', 'aria-hidden': 'true' }, getallenbos.emoji), el('span', {}, getallenbos.name)],
    () => {
      speak(`Op naar ${getallenbos.name.toLowerCase()}!`);
      onOpenArea();
    },
    'big-button area-button',
  );
  return {
    el: el(
      'main',
      { class: 'screen start' },
      el('h1', { class: 'title' }, 'RekenWereld'),
      el('div', { class: 'card' }, mascotBubble(greeting), area),
    ),
  };
}
