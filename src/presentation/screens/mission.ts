import { buildRoundTasks, rebuildUpcoming, type Adaptation } from '../../missions/build';
import type { SkillId } from '../../math/skills';
import { demoTask } from '../../missions/demos';
import type { Mission, Task } from '../../missions/types';
import { demoNeeded, shouldPointAtAnswer } from '../../state/guidance';
import { snapshot, type ResumePoint } from '../../state/resume';
import { currentTask, reduce, replaceUpcoming, startSession, starsFor, type SessionState } from '../../state/session';
import type { DemoKey } from '../../state/settings';
import { bigButton, el } from '../dom';
import { choiceInteraction } from '../interactions/choices';
import { dragInteraction } from '../interactions/drag';
import { PointingHand } from '../interactions/hand';
import { numberLineInteraction } from '../interactions/numberline';
import { sequenceInteraction } from '../interactions/sequence';
import type { Interaction, InteractionContext } from '../interactions/types';
import { mascot as owlSvg, setPose } from '../mascot';
import { speak, stopSpeaking } from '../speech';
import { DEMO_TRY, DEMO_WATCH, hintText, praise, promptText, retry } from '../texts';
import { compareLabel, visual } from '../visuals';
import type { Screen } from './types';

/** Na een goed antwoord even vieren, dan automatisch door. */
const CELEBRATE_MS = 1400;
/** Tikken vlak na het tonen van een nieuwe opdracht negeren (dubbeltik-beveiliging). */
const INPUT_GUARD_MS = 400;
/** Voorbeeld: zo lang wijst de hand voordat de mascotte "tikt". */
const DEMO_POINT_MS = 1200;
/** Zelf proberen: na zo lang niets doen wijst de hand de volgende tik aan. */
const IDLE_POINT_MS = 5000;

export type SoundKind = 'tap' | 'place' | 'drop-fail' | 'hop' | 'correct' | 'retry';

export interface MissionCallbacks {
  /** Voorbeelden die al gezien zijn. */
  seenDemos(): readonly DemoKey[];
  onDemoSeen(key: DemoKey): void;
  /** Tussenstand voor hervatten (null = niets te hervatten). */
  onProgress(point: ResumePoint | null): void;
  onFinish(stars: 1 | 2 | 3): void;
  onQuit(): void;
  sound?(kind: SoundKind): void;
  /**
   * Een opdracht is goed afgerond (met zoveel fouten). Geeft de nieuwe
   * niveau-aanpassing terug als die daardoor veranderde, anders null.
   */
  onTaskDone?(task: Task, mistakes: number): { skill: SkillId; shift: number } | null;
}

/**
 * Modus van het scherm:
 * - task:       gewone opdracht uit de missie
 * - demo-watch: de mascotte doet een voorbeeld voor (kind kijkt)
 * - demo-try:   het kind probeert hetzelfde soort voorbeeld zelf
 */
type Mode = 'task' | 'demo-watch' | 'demo-try';

export function missionScreen(mission: Mission, round: number, rng: () => number, cb: MissionCallbacks, resume?: ResumePoint, adapt?: Adaptation): Screen {
  let session: SessionState = resume
    ? startSession(mission.id, resume.tasks, resume.index, resume.firstTry)
    : startSession(mission.id, buildRoundTasks(mission, round, rng, adapt));
  let practice: SessionState | null = null;
  let mode: Mode = 'task';
  let readyAt = 0;
  let lastWrong: number | undefined;
  let feedbackLine = '';
  let idlePoint = false;
  /** De mascotte tikt (voorbeeld): dan geen invoerbeveiliging. */
  let demoActing = false;
  let interaction: Interaction | null = null;
  let shownTaskId = '';
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

  // ---------- Vaste opbouw ----------

  const progressDots = el('div', { class: 'dots', 'aria-hidden': 'true' });
  const helpButton = bigButton('❓', () => mode === 'task' && session.phase === 'asking' && startDemo(demoNeededKey(currentTask(session))), 'icon-button help');
  helpButton.setAttribute('aria-label', 'Voordoen');
  const home = bigButton('🏠', quit, 'icon-button');
  home.setAttribute('aria-label', 'Stoppen');

  const mascot = owlSvg('idle', 'mission-owl');
  const badge = el('span', { class: 'mode-badge', 'aria-hidden': 'true' });
  const caption = el('div', { class: 'caption', 'aria-live': 'polite' });
  const visualBox = el('div', { class: 'visual' });
  const answersBox = el('div', { class: 'answers' });
  const celebrate = el('div', { class: 'celebrate', 'aria-hidden': 'true' });
  const body = el('div', { class: 'card mission-card-body' }, el('div', { class: 'mascot-row' }, mascot, badge, caption), visualBox, answersBox, celebrate);
  const hand = new PointingHand(body);

  const root = el(
    'main',
    { class: `screen mission mission-${mission.id}` },
    el('header', { class: 'topbar' }, home, progressDots, el('span', { class: 'topbar-right' }, helpButton, bigButton('🔊', () => speak(spokenText()), 'icon-button'))),
    body,
  );

  /** De sessie die nu getoond wordt: oefening (voorbeeld) of de echte missie. */
  const active = (): SessionState => (mode === 'task' ? session : practice!);
  const demoNeededKey = (task: Task): DemoKey => demoNeeded(task, []) as DemoKey;

  function spokenText(): string {
    const s = active();
    const task = currentTask(s);
    if (mode === 'demo-watch') return `${DEMO_WATCH} ${promptText(task)}`;
    if (s.phase === 'correct') return feedbackLine;
    if (s.showHint) return `${feedbackLine} ${hintText(task)}`;
    return mode === 'demo-try' ? `${DEMO_TRY} ${promptText(task)}` : promptText(task);
  }

  function quit(): void {
    cb.onProgress(snapshot(session, round));
    cb.onQuit();
  }

  // ---------- Voorbeeld voordoen en zelf proberen ----------

  function startDemo(key: DemoKey): void {
    clearTimers();
    mode = 'demo-watch';
    // Het voorbeeld heeft niet hetzelfde getal als de opdracht die erna komt.
    practice = startSession('demo', [demoTask(key, rng, mission.theme, [currentTask(session).exercise.answer])]);
    resetTaskUi();
    render();
    speak(spokenText());
    later(600, () => demoTap(key));
  }

  /** De mascotte wijst de volgende tik aan en "tikt" erop, tot het voorbeeld klaar is. */
  function demoTap(key: DemoKey): void {
    if (mode !== 'demo-watch') return;
    const target = interaction?.hintTarget() ?? null;
    hand.pointAt(target);
    if (!target) {
      later(300, () => demoTap(key)); // bv. de kikker springt nog
      return;
    }
    later(DEMO_POINT_MS, () => {
      demoActing = true;
      target.click();
      demoActing = false;
      if (practice!.phase === 'asking') {
        later(350, () => demoTap(key));
        return;
      }
      hand.pointAt(null);
      later(CELEBRATE_MS, () => {
        // Nu het kind: een ánder voorbeeld van dezelfde soort (ander getal dan net en dan straks).
        mode = 'demo-try';
        const shown = currentTask(practice!).exercise.answer;
        practice = startSession('demo', [demoTask(key, rng, mission.theme, [shown, currentTask(session).exercise.answer])]);
        resetTaskUi();
        render();
        speak(spokenText());
        armIdlePointer();
      });
    });
  }

  function finishDemo(): void {
    cb.onDemoSeen(demoNeededKey(currentTask(practice!)));
    mode = 'task';
    practice = null;
    resetTaskUi();
    render();
    speak(promptText(currentTask(session)));
  }

  /** Doet het kind een tijdje niets, dan wijst de hand de volgende tik aan. */
  function armIdlePointer(): void {
    const marker = `${mode}:${active().index}:${active().step}:${active().wrong.length}`;
    later(IDLE_POINT_MS, () => {
      const now = active();
      if (mode === 'demo-try' && now.phase === 'asking' && `${mode}:${now.index}:${now.step}:${now.wrong.length}` === marker) {
        idlePoint = true;
        updateHand();
        later(1000, updateHand);
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

  /** Toon de huidige opdracht, of eerst een voorbeeld als deze bediening nieuw is. */
  function showCurrent(): void {
    const key = demoNeeded(currentTask(session), cb.seenDemos());
    if (key) {
      startDemo(key);
      return;
    }
    resetTaskUi();
    render();
    speak(promptText(currentTask(session)));
  }

  /** Antwoord vanuit een bedieningsvorm. */
  function submit(value: number): void {
    if (mode === 'demo-watch' && !demoActing) return;
    if (!demoActing && performance.now() < readyAt) return;
    const s = active();
    const next = reduce(s, { type: 'answer', taskId: currentTask(s).id, value });
    if (next === s) return; // genegeerd: dubbeltik, al beantwoord, zelfde foute keuze

    if (mode === 'task') session = next;
    else practice = next;

    lastWrong = next.feedback === 'tryAgain' ? value : undefined;
    idlePoint = false;
    if (next.feedback === 'step') {
      feedbackLine = '';
      render();
      if (mode === 'demo-try') armIdlePointer();
      return;
    }
    feedbackLine = next.feedback === 'correct' ? praise(rng) : retry(rng);
    cb.sound?.(next.feedback === 'correct' ? 'correct' : 'retry');
    if (mode !== 'demo-watch') speak(spokenText());
    render();

    if (next.phase !== 'correct') {
      if (mode === 'demo-try') armIdlePointer();
      return;
    }
    if (mode === 'demo-try') {
      later(CELEBRATE_MS, finishDemo);
      return;
    }
    if (mode === 'demo-watch') return; // demoTap gaat verder
    // Voortgang per vaardigheid; bij een niveauwijziging de komende opdrachten aanpassen.
    const change = cb.onTaskDone?.(currentTask(session), session.mistakes);
    if (change) session = replaceUpcoming(session, rebuildUpcoming(session.tasks, session.index + 1, change.skill, mission, rng, change.shift));
    cb.onProgress(snapshot(session, round));
    later(CELEBRATE_MS, () => {
      session = reduce(session, { type: 'next' });
      if (session.phase === 'finished') {
        cb.onProgress(null);
        cb.onFinish(starsFor(session));
        return;
      }
      showCurrent();
    });
  }

  // ---------- Weergave ----------

  function makeInteraction(task: Task): Interaction {
    const ctx: InteractionContext = { task, submit, feedback: (k) => cb.sound?.(k), changed: () => updateHand() };
    switch (task.interaction) {
      case 'numberline':
        return numberLineInteraction(ctx);
      case 'sequence':
        return sequenceInteraction(ctx);
      case 'drag':
        return dragInteraction(ctx);
      case 'choice':
        return task.prompt === 'compare'
          ? choiceInteraction(ctx, { label: (v) => compareLabel(task, active().showHint)(v), extraClass: 'groups' })
          : choiceInteraction(ctx);
    }
  }

  function render(): void {
    const s = active();
    const task = currentTask(s);
    const solved = s.phase === 'correct';

    // Nieuwe opdracht (of voorbeeld): bedieningsvorm opnieuw opbouwen.
    if (task.id !== shownTaskId) {
      interaction?.destroy?.();
      interaction = makeInteraction(task);
      answersBox.replaceChildren(interaction.el);
      shownTaskId = task.id;
    }

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

    setPose(mascot, solved ? 'happy' : s.feedback === 'tryAgain' ? 'think' : mode === 'demo-watch' ? 'point' : 'idle');
    badge.textContent = mode === 'demo-watch' ? '👀' : mode === 'demo-try' ? '🙋' : '';
    caption.replaceChildren(
      el('p', { class: 'prompt' }, promptText(task)),
      ...(feedbackLine ? [el('p', { class: s.feedback === 'correct' ? 'feedback good' : 'feedback retry' }, feedbackLine)] : []),
      ...(s.showHint && !solved ? [el('p', { class: 'hint' }, `💡 ${hintText(task)}`)] : []),
    );
    body.className = `card mission-card-body mode-${mode} prompt-${task.prompt} interaction-${task.interaction} ${solved ? 'solved' : 'awaiting'}`;
    visualBox.replaceChildren(visual(task, s.showHint));
    interaction!.update({ wrong: s.wrong, lastWrong, solved, showHint: s.showHint, step: s.step });

    celebrate.replaceChildren();
    if (solved) for (let i = 0; i < 6; i++) celebrate.append(el('span', { class: `spark s${i}` }, i % 2 ? '✨' : '⭐'));
    updateHand();
  }

  /** Hand tonen: tijdens voordoen, na lang niets doen, of na herhaalde fouten. */
  function updateHand(): void {
    if (mode === 'demo-watch') return; // demoTap bepaalt waar de hand staat
    const s = active();
    const task = currentTask(s);
    const show = s.phase === 'asking' && (idlePoint || shouldPointAtAnswer(s.mistakes, optionCount(task, s)));
    hand.pointAt(show ? (interaction?.hintTarget() ?? null) : null);
  }

  showCurrent();

  return {
    el: root,
    destroy() {
      clearTimers();
      interaction?.destroy?.();
      hand.destroy();
      stopSpeaking();
    },
  };
}

/** Aantal opties waaruit gekozen kan worden (voor het besluit om de hand te tonen). */
function optionCount(task: Task, s: SessionState): number {
  if (task.interaction === 'numberline' || task.interaction === 'drag') return 10;
  if (task.interaction === 'sequence') return task.exercise.operands.length - s.step;
  return task.choices?.length ?? 0;
}
