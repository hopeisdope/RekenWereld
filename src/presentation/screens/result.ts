import type { Mission } from '../../missions/types';
import { bigButton, el } from '../dom';
import { speak } from '../speech';
import { mascotBubble } from './mascot';
import { starRow } from './select';
import type { Screen } from './types';

const CHEERS: Record<1 | 2 | 3, string> = {
  1: 'Goed gewerkt! Oefenen maakt je sterk.',
  2: 'Heel goed gedaan!',
  3: 'Fantastisch! Jij bent een rekenheld!',
};

export function resultScreen(mission: Mission, stars: 1 | 2 | 3, onAgain: () => void, onBack: () => void): Screen {
  const text = `Missie gelukt! ${CHEERS[stars]} Je hebt een nieuwe vriend gevonden.`;
  speak(text);
  return {
    el: el(
      'main',
      { class: 'screen result' },
      el(
        'div',
        { class: 'card' },
        el('h1', {}, 'Hoera! 🎉'),
        mascotBubble(text),
        starRow(stars),
        el('div', { class: 'reward', role: 'img', 'aria-label': 'Beloning' }, mission.reward),
        el(
          'div',
          { class: 'result-actions' },
          bigButton('🔁 Nog een keer', onAgain, 'big-button secondary'),
          bigButton('🌳 Terug naar het bos', onBack),
        ),
      ),
    ),
  };
}
