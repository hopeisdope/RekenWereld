import type { Mission } from '../../missions/types';
import { bigButton, el } from '../dom';
import { speak } from '../speech';
import { starRow } from './select';
import type { Screen } from './types';

const CHEERS: Record<1 | 2 | 3, string> = {
  1: 'Goed gewerkt! Oefenen maakt je sterk.',
  2: 'Heel goed gedaan!',
  3: 'Fantastisch! Jij bent een rekenheld!',
};

/**
 * Beloning: sterren en een nieuw dier. Eén grote knop om verder te gaan
 * (terug naar de missies), een klein knopje om opnieuw te spelen.
 */
export function resultScreen(mission: Mission, stars: 1 | 2 | 3, onAgain: () => void, onNext: () => void): Screen {
  speak(`Missie gelukt! ${CHEERS[stars]}`);

  const next = bigButton(el('span', { class: 'play-triangle', 'aria-hidden': 'true' }), onNext, 'play-button next');
  next.setAttribute('aria-label', 'Verder');
  const again = bigButton('🔁', onAgain, 'icon-button again');
  again.setAttribute('aria-label', 'Nog een keer');

  const confetti = el('div', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < 10; i++) confetti.append(el('span', { class: `c c${i}` }, ['🎉', '⭐', '✨', '🎈'][i % 4]));

  return {
    el: el(
      'main',
      { class: 'screen result' },
      el(
        'div',
        { class: 'card' },
        confetti,
        el('div', { class: 'reward-row' }, el('span', { class: 'mascot happy', 'aria-hidden': 'true' }, '🦉'), el('div', { class: 'reward', role: 'img', 'aria-label': 'Beloning' }, mission.reward)),
        starRow(stars),
        el('div', { class: 'result-actions' }, again, next),
      ),
    ),
  };
}
