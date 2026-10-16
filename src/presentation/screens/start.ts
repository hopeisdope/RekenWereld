import { bigButton, el } from '../dom';
import { mascot } from '../mascot';
import { speak } from '../speech';
import { PLAY } from '../texts';
import type { Screen } from './types';

/**
 * Startscherm met één duidelijke actie: de grote speelknop. De mascotte wijst
 * ernaar. Het geluidsknopje is klein en zit in de hoek (voor ouders).
 */
export function startScreen(sound: boolean, onPlay: () => void, onToggleSound: () => boolean): Screen {
  const soundButton = bigButton(sound ? '🔊' : '🔇', () => {
    const on = onToggleSound();
    soundButton.textContent = on ? '🔊' : '🔇';
    soundButton.setAttribute('aria-pressed', String(on));
    if (on) speak(PLAY);
  }, 'icon-button small-corner');
  soundButton.setAttribute('aria-label', 'Geluid');
  soundButton.setAttribute('aria-pressed', String(sound));

  const play = bigButton(el('span', { class: 'play-triangle', 'aria-hidden': 'true' }), onPlay, 'play-button');
  play.setAttribute('aria-label', 'Spelen');

  return {
    el: el(
      'main',
      { class: 'screen start' },
      soundButton,
      el('h1', { class: 'title' }, 'RekenWereld'),
      el(
        'div',
        { class: 'play-row' },
        mascot('point', 'start-owl'),
        el('span', { class: 'point-right', 'aria-hidden': 'true' }, '👉'),
        play,
      ),
    ),
  };
}
