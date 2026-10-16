import { expectedAt } from '../../math/check';
import { buildRoundTasks } from '../../missions/build';
import { demoTask } from '../../missions/demos';
import type { Mission, PromptKind, Task } from '../../missions/types';
import { demoNeeded, shouldPointAtAnswer } from '../../state/guidance';
import { currentTask, reduce, startSession, starsFor, type SessionState } from '../../state/session';
import { bigButton, el } from '../dom';
import { choiceButtons } from '../interactions/choices';
import { numberLine } from '../interactions/numberline';
import { sequenceTiles } from '../interactions/sequence';
import type { AnswerView } from '../interactions/types';
import { speak, stopSpeaking } from '../speech';
import { DEMO_TRY, DEMO_WATCH, hintText, praise, promptText, retry } from '../texts';
import { compareLabel, visual } from '../visuals';
import type { Screen } from './types';

/** Na een goed antwoord even vieren, dan automatisch door. */
const CELEBRATE_MS = 1400;
/** Tikken vlak na het tonen van een nieuwe opdracht negeren (dubbeltik-beveiliging). */
const INPUT_GUARD_MS = 400;
/** Voorbeeld: zo lang wijst de hand voordat de mascotte "tikt". */
const DEMO_POINT_MS = 1600;
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

export function missionScreen(mission: Mission, round: number, rng: () => number, cb: MissionCallbacks): Screen {
  let session: SessionState = startSession(mission.id, buildRoundTasks(mission, round, rng));
  let practice: SessionState | null = null;
  let mode: Mode = 'task';
  let readyAt = 0;
  let lastWrong: number | undefined;
  let feedbackLine = '';
  let idlePoint = false;
  /** Bij het voordoen: welke waarde de hand nu aanwijst. */
  let demoPoint: number | undefined;
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
  const home = bigButton('🏠', cb.onQuit, 'icon-button');
  home.setAttribute('aria-label', 'Stoppen');
  const root = el(
    'main',
    { class: `screen mission mission-${mission.id}` },
    el('header', { class: 'topbar' }, home, progressDots, el('span', { class: 'topbar-right' }, helpButton, bigButton('🔊', () => speak(spokenText()), 'icon-button'))),
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
    practice = startSession('demo', [demoTask(kind, rng, mission.theme)]);
    resetTaskUi();
    render();
    speak(spokenText());
    demoStep(kind);
  }

  /** De mascotte wijst en "tikt" stap voor stap (ordenen heeft meerdere stappen). */
  function demoStep(kind: PromptKind): void {
    const p = practice!;
    const value = expectedAt(currentTask(p).exercise, p.step);
    demoPoint = value;
    render();
    later(DEMO_POINT_MS, () => {
      practice = reduce(practice!, { type: 'answer', taskId: currentTask(p).id, value });
      demoPoint = undefined;
      if (practice.phase === 'asking') {
        render();
        later(400, () => demoStep(kind));
        return;
      }
      feedbackLine = praise(rng);
      render();
      later(CELEBRATE_MS, () => {
        // Nu het kind: een nieuw voorbeeld van dezelfde soort, met andere knopvolgorde.
        mode = 'demo-try';
        practice = startSession('demo', [demoTask(kind, rng, mission.theme)]);
        resetTaskUi();
        render();
        speak(spokenText());
        armIdlePointer();
      });
    });
  }

  function finishDemo(): void {
    cb.onDemoSeen(currentTask(practice!).prompt);
    mode = 'task';
    practice = null;
    resetTaskUi();
    render();
    speak(promptText(currentTask(session)));
  }

  function armIdlePointer(): void {
    const s = active();
    const marker = `${s.index}:${s.step}`;
    later(IDLE_POINT_MS, () => {
      const now = active();
      if (mode === 'demo-try' && now.phase === 'asking' && `${now.index}:${now.step}` === marker) {
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
    demoPoint = undefined;
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

    lastWrong = next.feedback === 'tryAgain' ? value : undefined;
    idlePoint = false;
    if (next.feedback === 'step') {
      feedbackLine = '';
      render();
      if (mode === 'demo-try') armIdlePointer();
      return;
    }
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

    const expected = expectedAt(task.exercise, s.step);
    const pointAt =
      mode === 'demo-watch' ? demoPoint : idlePoint || (!solved && shouldPointAtAnswer(s.wrong.length, optionCount(task, s))) ? expected : undefined;
    const view: AnswerView = { wrong: s.wrong, solved, showHint: s.showHint, pointAt, onAnswer: answer };

    const mood = solved ? 'happy' : s.feedback === 'tryAgain' ? 'think' : '';
    const badge = mode === 'demo-watch' ? '👀' : mode === 'demo-try' ? '🙋' : '';

    body.className = `card mission-card-body mode-${mode} prompt-${task.prompt}`;
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
      el('div', { class: 'answers' }, answers(task, s, view)),
      ...(solved ? [celebration()] : []),
    );
  }

  function answers(task: Task, s: SessionState, view: AnswerView): HTMLElement {
    const { exercise } = task;
    if (task.interaction === 'numberline' && task.line) {
      return numberLine({ ...view, ...task.line, start: exercise.operands[0], answer: exercise.answer }, lastWrong);
    }
    if (task.interaction === 'sequence') {
      return sequenceTiles(exercise.operands, exercise.steps!.slice(0, s.phase === 'correct' ? exercise.steps!.length : s.step), view, lastWrong);
    }
    if (task.prompt === 'compare') {
      return choiceButtons(task.choices ?? [], exercise.answer, view, lastWrong, compareLabel(task, s.showHint), 'groups');
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

/** Aantal opties waaruit gekozen kan worden (voor het besluit om de hand te tonen). */
function optionCount(task: Task, s: SessionState): number {
  if (task.interaction === 'numberline' && task.line) return task.line.max - task.line.min;
  if (task.interaction === 'sequence') return task.exercise.operands.length - s.step;
  return task.choices?.length ?? 0;
}

/** Sterren die uit het midden wegspringen bij een goed antwoord. */
function celebration(): HTMLElement {
  const wrap = el('div', { class: 'celebrate', 'aria-hidden': 'true' });
  for (let i = 0; i < 6; i++) wrap.append(el('span', { class: `spark s${i}` }, i % 2 ? '✨' : '⭐'));
  return wrap;
}
