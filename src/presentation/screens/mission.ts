import type { Mission, Task } from '../../missions/types';
import { currentTask, reduce, startSession, starsFor, type SessionEvent, type SessionState } from '../../state/session';
import { bigButton, el } from '../dom';
import { choiceButtons } from '../interactions/choices';
import { numberLine } from '../interactions/numberline';
import type { AnswerView } from '../interactions/types';
import { speak, stopSpeaking } from '../speech';
import { hintText, praise, promptText, retry } from '../texts';
import { mascotBubble } from './mascot';
import type { Screen } from './types';

/** Na een goed antwoord even vieren, dan automatisch door. */
const CELEBRATE_MS = 1400;
/** Tikken vlak na het tonen van een nieuwe opdracht negeren (dubbeltik-beveiliging). */
const INPUT_GUARD_MS = 400;

export function missionScreen(
  mission: Mission,
  rng: () => number,
  onFinish: (stars: 1 | 2 | 3) => void,
  onQuit: () => void,
): Screen {
  let state: SessionState = startSession(mission.id, mission.buildTasks(rng));
  let readyAt = 0;
  let lastWrong: number | undefined;
  let feedbackLine = '';
  let timer: number | undefined;

  const progressDots = el('div', { class: 'dots', 'aria-hidden': 'true' });
  const body = el('div', { class: 'card mission-card-body' });
  const root = el(
    'main',
    { class: `screen mission mission-${mission.id}` },
    el(
      'header',
      { class: 'topbar' },
      bigButton('🏠', onQuit, 'icon-button'),
      progressDots,
      bigButton('🔊', () => speak(spokenText()), 'icon-button'),
    ),
    body,
  );

  function spokenText(): string {
    const task = currentTask(state);
    if (state.phase === 'correct') return feedbackLine;
    return state.showHint ? `${feedbackLine} ${hintText(task)}` : promptText(task);
  }

  function dispatch(event: SessionEvent): void {
    const next = reduce(state, event);
    if (next === state) return; // genegeerd (dubbeltik, al beantwoord, ...)
    const prev = state;
    state = next;

    if (state.phase === 'finished') {
      onFinish(starsFor(state));
      return;
    }
    if (event.type === 'answer') {
      lastWrong = state.phase === 'asking' ? event.value : undefined;
      feedbackLine = state.feedback === 'correct' ? praise(rng) : retry(rng);
      speak(spokenText());
    }
    if (state.phase === 'correct') {
      timer = window.setTimeout(() => dispatch({ type: 'next' }), CELEBRATE_MS);
    }
    if (state.index !== prev.index) {
      lastWrong = undefined;
      feedbackLine = '';
      readyAt = performance.now() + INPUT_GUARD_MS;
      speak(promptText(currentTask(state)));
    }
    render();
  }

  function answer(value: number): void {
    if (performance.now() < readyAt) return;
    dispatch({ type: 'answer', taskId: currentTask(state).id, value });
  }

  function render(): void {
    const task = currentTask(state);
    progressDots.replaceChildren(
      ...state.tasks.map((_, i) =>
        el('span', { class: i < state.index || (i === state.index && state.phase === 'correct') ? 'dot done' : i === state.index ? 'dot now' : 'dot' }),
      ),
    );
    const view: AnswerView = { wrong: state.wrong, solved: state.phase === 'correct', showHint: state.showHint, onAnswer: answer };

    const bubble = mascotBubble(
      el('p', { class: 'prompt' }, promptText(task)),
      feedbackLine ? el('p', { class: state.feedback === 'correct' ? 'feedback good' : 'feedback retry' }, feedbackLine) : '',
      state.showHint && state.phase === 'asking' ? el('p', { class: 'hint' }, `💡 ${hintText(task)}`) : '',
    );
    body.replaceChildren(
      bubble,
      el('div', { class: 'visual' }, visual(task, state.showHint)),
      el('div', { class: 'answers' }, answers(task, view)),
      state.phase === 'correct' ? el('div', { class: 'celebrate', 'aria-hidden': 'true' }, '⭐') : '',
    );
  }

  function answers(task: Task, view: AnswerView): HTMLElement {
    const { exercise } = task;
    if (task.interaction === 'numberline' && task.line) {
      return numberLine({ ...view, ...task.line, start: exercise.operands[0], answer: exercise.answer }, lastWrong);
    }
    return choiceButtons(task.choices ?? [], exercise.answer, view, lastWrong);
  }

  readyAt = performance.now() + INPUT_GUARD_MS;
  render();
  speak(promptText(currentTask(state)));

  return {
    el: root,
    destroy() {
      window.clearTimeout(timer);
      stopSpeaking();
    },
  };
}

/** Wat er boven de antwoorden te zien is, per soort opdracht. */
function visual(task: Task, hint: boolean): HTMLElement {
  const [a, b] = task.exercise.operands;
  switch (task.prompt) {
    case 'count':
      return items('🐾', a, hint ? 1 : null);
    case 'recognize':
      return hint ? items('🔵', a, null, 'dots') : el('div', { class: 'big-question', 'aria-hidden': 'true' }, '❓');
    case 'add':
      return el(
        'div',
        { class: 'sum' },
        el('div', { class: 'basket' }, items('🍎', a, hint ? 1 : null), el('span', { class: 'plus' }, '+'), items('🍏', b, hint ? a + 1 : null)),
        el('div', { class: 'equation' }, `${a} + ${b} = ?`),
      );
    case 'jump':
      return el('div', { class: 'equation' }, `${a} ${task.exercise.operation === 'add' ? '+' : '−'} ${b} = ?`);
  }
}

/** n keer hetzelfde plaatje, in rijen van 10 met groepjes van 5 (zoals een rekenrek). */
function items(emoji: string, n: number, numberFrom: number | null, extraClass = ''): HTMLElement {
  const wrap = el('div', { class: `items ${extraClass}`, 'aria-label': `${n}` });
  let row: HTMLElement | null = null;
  let group: HTMLElement | null = null;
  for (let i = 0; i < n; i++) {
    if (i % 10 === 0) {
      row = el('div', { class: 'row' });
      wrap.append(row);
    }
    if (i % 5 === 0) {
      group = el('span', { class: 'group' });
      row!.append(group);
    }
    group!.append(
      el(
        'span',
        { class: 'item', 'aria-hidden': 'true' },
        emoji,
        numberFrom !== null ? el('span', { class: 'item-number' }, String(numberFrom + i)) : null,
      ),
    );
  }
  return wrap;
}
