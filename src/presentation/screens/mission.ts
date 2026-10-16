import { demoTask } from '../../missions/demos';
import type { Mission, PromptKind, Task } from '../../missions/types';
import { demoNeeded, shouldPointAtAnswer } from '../../state/guidance';
import { currentTask, reduce, startSession, starsFor, type SessionState } from '../../state/session';
import { bigButton, el } from '../dom';
import { choiceButtons } from '../interactions/choices';
import { numberLine } from '../interactions/numberline';
import type { AnswerView } from '../interactions/types';
import { speak, stopSpeaking } from '../speech';
import { DEMO_TRY, DEMO_WATCH, hintText, praise, promptText, retry } from '../texts';
import type { Screen } from './types';

/** Na een goed antwoord even vieren, dan automatisch door. */
const CELEBRATE_MS = 1400;
/** Tikken vlak na het tonen van een nieuwe opdracht negeren (dubbeltik-beveiliging). */
const INPUT_GUARD_MS = 400;
/** Voorbeeld: zo lang wijst de hand voordat de mascotte "tikt". */
const DEMO_POINT_MS = 2000;
/** Zelf proberen: na zo lang niets doen wijst de hand het antwoord aan. */
const IDLE_POINT_MS = 5000;

export interface MissionCallbacks {
  /** Soorten opdrachten waarvan het voorbeeld al gezien is. */
  seenDemos(): readonly PromptKind[];
  onDemoSeen(kind: PromptKind): void;
  onFinish(stars: 1 | 2 | 3): void;
  onQuit(): void;
}

/**
 * Modus van het scherm:
 * - task:       gewone opdracht uit de missie
 * - demo-watch: de mascotte doet een voorbeeld voor (niet aanraakbaar)
 * - demo-try:   het kind probeert hetzelfde soort voorbeeld zelf
 */
type Mode = 'task' | 'demo-watch' | 'demo-try';

export function missionScreen(mission: Mission, rng: () => number, cb: MissionCallbacks): Screen {
  let session: SessionState = startSession(mission.id, mission.buildTasks(rng));
  let practice: SessionState | null = null;
  let mode: Mode = 'task';
  let readyAt = 0;
  let lastWrong: number | undefined;
  let feedbackLine = '';
  let idlePoint = false;
  const timers = new Set<number>();

  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  const clearTimers = () => {
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
  };

  const progressDots = el('div', { class: 'dots', 'aria-hidden': 'true' });
  const body = el('div', { class: 'card mission-card-body' });
  const helpButton = bigButton('❓', () => mode === 'task' && session.phase === 'asking' && startDemo(currentTask(session).prompt), 'icon-button help');
  helpButton.setAttribute('aria-label', 'Voordoen');
  const root = el(
    'main',
    { class: `screen mission mission-${mission.id}` },
    el(
      'header',
      { class: 'topbar' },
      bigButton('🏠', cb.onQuit, 'icon-button'),
      progressDots,
      el('span', { class: 'topbar-right' }, helpButton, bigButton('🔊', () => speak(spokenText()), 'icon-button')),
    ),
    body,
  );

  /** De sessie die nu getoond wordt: oefening (voorbeeld) of de echte missie. */
  const active = (): SessionState => (mode === 'task' ? session : practice!);

  function spokenText(): string {
    const s = active();
    const task = currentTask(s);
    if (mode === 'demo-watch') return `${DEMO_WATCH} ${promptText(task)}`;
    if (s.phase === 'correct') return feedbackLine;
    if (s.showHint) return `${feedbackLine} ${hintText(task)}`;
    return mode === 'demo-try' ? `${DEMO_TRY} ${promptText(task)}` : promptText(task);
  }

  // ---------- Voorbeeld voordoen en zelf proberen ----------

  function startDemo(kind: PromptKind): void {
    clearTimers();
    mode = 'demo-watch';
    practice = startSession('demo', [demoTask(kind, rng)]);
    resetTaskUi();
    render();
    speak(spokenText());

    later(DEMO_POINT_MS, () => {
      // De mascotte "tikt" op het goede antwoord.
      const task = currentTask(practice!);
      practice = reduce(practice!, { type: 'answer', taskId: task.id, value: task.exercise.answer });
      feedbackLine = praise(rng);
      render();
      later(CELEBRATE_MS, () => {
        // Nu het kind: een nieuw voorbeeld van dezelfde soort, met andere knopvolgorde.
        mode = 'demo-try';
        practice = startSession('demo', [demoTask(kind, rng)]);
        resetTaskUi();
        render();
        speak(spokenText());
        armIdlePointer();
      });
    });
  }

  function finishDemo(): void {
    const kind = currentTask(practice!).prompt;
    cb.onDemoSeen(kind);
    mode = 'task';
    practice = null;
    resetTaskUi();
    render();
    speak(promptText(currentTask(session)));
  }

  function armIdlePointer(): void {
    const s = active();
    const index = s.index;
    later(IDLE_POINT_MS, () => {
      if (mode === 'demo-try' && active().phase === 'asking' && active().index === index) {
        idlePoint = true;
        render();
      }
    });
  }

  // ---------- Opdrachten ----------

  function resetTaskUi(): void {
    lastWrong = undefined;
    feedbackLine = '';
    idlePoint = false;
    readyAt = performance.now() + INPUT_GUARD_MS;
  }

  /** Toon de huidige opdracht, of eerst een voorbeeld als dit soort opdracht nieuw is. */
  function showCurrent(): void {
    const kind = demoNeeded(currentTask(session), cb.seenDemos());
    if (kind) {
      startDemo(kind);
      return;
    }
    resetTaskUi();
    render();
    speak(promptText(currentTask(session)));
  }

  function answer(value: number): void {
    if (mode === 'demo-watch' || performance.now() < readyAt) return;
    const s = active();
    const next = reduce(s, { type: 'answer', taskId: currentTask(s).id, value });
    if (next === s) return; // genegeerd: dubbeltik, al beantwoord, zelfde foute keuze

    if (mode === 'demo-try') practice = next;
    else session = next;

    lastWrong = next.phase === 'asking' ? value : undefined;
    feedbackLine = next.feedback === 'correct' ? praise(rng) : retry(rng);
    speak(spokenText());
    render();

    if (next.phase !== 'correct') return;
    if (mode === 'demo-try') {
      later(CELEBRATE_MS, finishDemo);
      return;
    }
    later(CELEBRATE_MS, () => {
      session = reduce(session, { type: 'next' });
      if (session.phase === 'finished') {
        cb.onFinish(starsFor(session));
        return;
      }
      showCurrent();
    });
  }

  // ---------- Weergave ----------

  function render(): void {
    const s = active();
    const task = currentTask(s);
    const solved = s.phase === 'correct';

    progressDots.replaceChildren(
      ...session.tasks.map((_, i) =>
        el('span', {
          class:
            i < session.index || (i === session.index && session.phase === 'correct' && mode === 'task')
              ? 'dot done'
              : i === session.index
                ? 'dot now'
                : 'dot',
        }),
      ),
    );
    helpButton.disabled = mode !== 'task';

    const optionCount = task.interaction === 'numberline' && task.line ? task.line.max - task.line.min : (task.choices?.length ?? 0);
    const pointAt =
      mode === 'demo-watch' || idlePoint || (!solved && shouldPointAtAnswer(s.wrong.length, optionCount)) ? task.exercise.answer : undefined;
    const view: AnswerView = { wrong: s.wrong, solved, showHint: s.showHint, pointAt, onAnswer: answer };

    const mood = solved ? 'happy' : s.feedback === 'tryAgain' ? 'think' : '';
    const badge = mode === 'demo-watch' ? '👀' : mode === 'demo-try' ? '🙋' : '';

    body.className = `card mission-card-body mode-${mode}`;
    body.replaceChildren(
      el(
        'div',
        { class: 'mascot-row' },
        el('span', { class: `mascot ${mood}`, 'aria-hidden': 'true' }, '🦉'),
        badge ? el('span', { class: 'mode-badge', 'aria-hidden': 'true' }, badge) : null,
        el(
          'div',
          { class: 'caption', 'aria-live': 'polite' },
          el('p', { class: 'prompt' }, promptText(task)),
          feedbackLine ? el('p', { class: s.feedback === 'correct' ? 'feedback good' : 'feedback retry' }, feedbackLine) : null,
          s.showHint && !solved ? el('p', { class: 'hint' }, `💡 ${hintText(task)}`) : null,
        ),
      ),
      el('div', { class: 'visual' }, visual(task, s.showHint)),
      el('div', { class: 'answers' }, answers(task, view)),
      ...(solved ? [celebration()] : []),
    );
  }

  function answers(task: Task, view: AnswerView): HTMLElement {
    const { exercise } = task;
    if (task.interaction === 'numberline' && task.line) {
      return numberLine({ ...view, ...task.line, start: exercise.operands[0], answer: exercise.answer }, lastWrong);
    }
    return choiceButtons(task.choices ?? [], exercise.answer, view, lastWrong);
  }

  showCurrent();

  return {
    el: root,
    destroy() {
      clearTimers();
      stopSpeaking();
    },
  };
}

/** Sterren die uit het midden wegspringen bij een goed antwoord. */
function celebration(): HTMLElement {
  const wrap = el('div', { class: 'celebrate', 'aria-hidden': 'true' });
  for (let i = 0; i < 6; i++) wrap.append(el('span', { class: `spark s${i}` }, i % 2 ? '✨' : '⭐'));
  return wrap;
}

/** Wat er boven de antwoorden te zien is, per soort opdracht. Begrijpelijk zonder te lezen. */
function visual(task: Task, hint: boolean): HTMLElement {
  const [a, b] = task.exercise.operands;
  switch (task.prompt) {
    case 'count':
      return el('div', { class: 'count-scene' }, items('🐾', a, hint ? 1 : null), el('span', { class: 'qmark', 'aria-hidden': 'true' }, '?'));
    case 'recognize':
      // Het getal staat op een bordje; het kind zoekt hetzelfde getal tussen de knoppen.
      return el(
        'div',
        { class: 'match-scene' },
        el('div', { class: 'sign', 'aria-label': `Getal ${a}` }, String(a)),
        hint ? items('🔵', a, null, 'dots') : null,
      );
    case 'add':
      return el(
        'div',
        { class: 'sum' },
        el('div', { class: 'basket' }, items('🍎', a, hint ? 1 : null), el('span', { class: 'plus' }, '+'), items('🍏', b, hint ? a + 1 : null)),
        el('div', { class: 'equation' }, `${a} + ${b} = ?`),
      );
    case 'jump': {
      const forward = task.exercise.operation === 'add';
      const hops = el('span', { class: 'hops' });
      for (let i = 0; i < b; i++) hops.append(el('span', { class: 'hop-arc' }));
      return el(
        'div',
        { class: 'jump-scene' },
        el(
          'div',
          { class: `jump-card ${forward ? 'forward' : 'back'}`, 'aria-label': `${b} ${forward ? 'vooruit' : 'terug'}` },
          el('span', { class: 'arrow' }, forward ? '➡️' : '⬅️'),
          hops,
          el('span', { class: 'jump-count' }, String(b)),
        ),
        el('div', { class: 'equation' }, `${a} ${forward ? '+' : '−'} ${b} = ?`),
      );
    }
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
