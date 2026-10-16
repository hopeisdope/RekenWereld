import { bigButton, el } from '../dom';
import { mascot } from '../mascot';
import { playSound } from '../sound';
import { speak } from '../speech';
import { starRow } from '../widgets';
import type { Screen } from './types';

export interface ResultInfo {
  /** Het dier dat bij deze ronde hoort. */
  reward: string;
  /** Voltooide rondes van deze missie (na deze ronde). */
  roundsDone: number;
  totalRounds: number;
  /** Was dit een nieuwe ronde (nieuwe ster en nieuw dier)? */
  newRound: boolean;
  /** Iconen van missies die nu open zijn gegaan. */
  unlocked: readonly string[];
}

/**
 * Duidelijk einde van een missieronde: de uil juicht, het dier springt in
 * beeld, de nieuwe ster vliegt in de rij, een nieuwe plek op de kaart gaat
 * open. Eén grote ▶ terug naar de kaart; een klein 🔁 om opnieuw te spelen.
 * Er staat geen score of uitleg in tekst.
 */
export function resultScreen(info: ResultInfo, onAgain: () => void, onNext: () => void): Screen {
  speak(info.newRound ? 'Hoera! Je hebt een nieuwe vriend gevonden!' : 'Hoera! Goed gedaan!');
  const timer = window.setTimeout(() => playSound('finish'), 150);

  const next = bigButton(el('span', { class: 'play-triangle', 'aria-hidden': 'true' }), onNext, 'play-button next');
  next.setAttribute('aria-label', 'Verder naar de kaart');
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
        el(
          'div',
          { class: 'reward-row' },
          mascot('happy', 'result-owl'),
          el('div', { class: info.newRound ? 'reward new' : 'reward', role: 'img', 'aria-label': 'Beloning' }, info.reward),
        ),
        starRow(info.roundsDone, info.totalRounds, info.newRound ? info.roundsDone - 1 : -1),
        info.unlocked.length
          ? el('div', { class: 'unlocked', 'aria-label': 'Nieuwe missie open' }, el('span', { class: 'unlock-lock', 'aria-hidden': 'true' }, '🔓'), ...info.unlocked.map((icon) => el('span', { class: 'unlock-icon', 'aria-hidden': 'true' }, icon)))
          : null,
        el('div', { class: 'result-actions' }, again, next),
      ),
    ),
    destroy() {
      window.clearTimeout(timer);
    },
  };
}
