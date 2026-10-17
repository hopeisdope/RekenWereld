import type { SkillId } from '../math/skills';
import { skillOf, type Adaptation } from '../missions/build';
import { getallenbos, missions } from '../missions/getallenbos';
import { GETALLENBOS_MAP } from '../missions/map';
import { ADAPTIVE_RULES, effectiveShift, outcomeOf, parseSkillStats, recordSkill, skillStatus, type SkillStats } from '../state/mastery';
import { nextRound, parseProgress, recordResult, type Progress } from '../state/progress';
import { parentReport } from '../state/report';
import { parseResume, type ResumePoint } from '../state/resume';
import { DEFAULT_SETTINGS, markDemoSeen, parseSettings, setLevelOverride, type DemoKey, type Settings } from '../state/settings';
import { newlyUnlocked, toWorld } from '../state/world';
import { SCHEMA_VERSION, type Storage } from '../storage/storage';
import { mapScreen } from './screens/map';
import { missionScreen, type SoundKind } from './screens/mission';
import { parentScreen } from './screens/parent';
import { openParentGate } from './screens/parentGate';
import { resultScreen } from './screens/result';
import { startScreen } from './screens/start';
import type { Screen } from './screens/types';
import { setSoundEnabled } from './sound';
import { setSpeechEnabled } from './speech';

/** Schermnavigatie: start → kaart → missie → eindscherm → kaart; ouders via de start. */
export function startApp(
  ui: HTMLElement,
  storage: Storage,
  rng: () => number = Math.random,
  sound?: (kind: SoundKind) => void,
): void {
  // Elk deel wordt apart en defensief ingelezen: één kapot deel kost niet de rest.
  const saved = storage.load();
  let progress: Progress = parseProgress(saved?.progress);
  let settings: Settings = parseSettings(saved?.settings);
  let resume: ResumePoint | null = parseResume(saved?.resume);
  let stats: SkillStats = parseSkillStats(saved?.skills);
  let current: Screen | null = null;
  const allMissions = getallenbos.missionIds.map((id) => missions[id]);
  const order = toWorld(allMissions);

  const applySound = () => {
    setSpeechEnabled(settings.sound);
    setSoundEnabled(settings.sound);
  };
  applySound();

  function show(screen: Screen): void {
    current?.destroy?.();
    current = screen;
    ui.replaceChildren(screen.el);
    ui.scrollTo?.(0, 0);
  }

  function save(): void {
    storage.save({
      schemaVersion: SCHEMA_VERSION,
      progress: { ...progress },
      settings: { sound: settings.sound, seenDemos: [...settings.seenDemos], levelOverrides: { ...settings.levelOverrides } },
      resume: resume ?? undefined,
      skills: { ...stats },
      updatedAt: new Date().toISOString(),
    });
  }

  const toggleSound = () => {
    settings = { ...settings, sound: !settings.sound };
    applySound();
    save();
    return settings.sound;
  };

  /** Aanpassing aan het kind voor het maken van een ronde. */
  const adaptation = (): Adaptation => ({
    shift: (k) => effectiveShift(stats[k], settings.levelOverrides[k]),
    needsPractice: (k) => skillStatus(stats[k]) === 'needsPractice',
    maxTasks: ADAPTIVE_RULES.maxTasksPerRound,
  });

  const goStart = () => show(startScreen(settings.sound, () => goSelect(), toggleSound, () => openParentGate(ui, Math.random, goParents)));

  const goParents = () => {
    const report = parentReport(stats, settings.levelOverrides, progress, allMissions);
    show(
      parentScreen(report, storage.status(), settings.sound, {
        setOverride: (skill: SkillId, value) => {
          settings = setLevelOverride(settings, skill, value);
          save();
          goParents();
        },
        toggleSound,
        reset: () => {
          // Alles wissen behalve de geluidsinstelling.
          progress = {};
          stats = {};
          resume = null;
          settings = { ...DEFAULT_SETTINGS, sound: settings.sound };
          storage.clear();
          save();
          goStart();
        },
        close: goStart,
      }),
    );
  };

  const goSelect = (justUnlocked: readonly string[] = []) => show(mapScreen(progress, resume, justUnlocked, goMission, goStart));

  /** Missie openen: een onderbroken ronde gaat verder waar hij was, anders de volgende ronde. */
  const goMission = (id: string, replayRound?: number) => {
    const mission = missions[id];
    const resumeHere = replayRound === undefined && resume?.missionId === id && resume.round < mission.rounds.length ? resume : undefined;
    const round = replayRound ?? resumeHere?.round ?? nextRound(progress, id, mission.rounds.length);
    show(
      missionScreen(
        mission,
        round,
        rng,
        {
          seenDemos: () => settings.seenDemos,
          onDemoSeen: (key: DemoKey) => {
            settings = markDemoSeen(settings, key);
            save();
          },
          onProgress: (point) => {
            resume = point;
            save();
          },
          onTaskDone: (task, mistakes) => {
            const skill = skillOf(task);
            const override = settings.levelOverrides[skill];
            const before = effectiveShift(stats[skill], override);
            stats = recordSkill(stats, skill, outcomeOf(mistakes));
            const after = effectiveShift(stats[skill], override);
            save();
            return after !== before ? { skill, shift: after } : null;
          },
          onFinish: (stars) => {
            const before = progress;
            progress = recordResult(progress, id, stars, round, mission.rounds.length);
            save();
            const unlocked = newlyUnlocked(order, before, progress);
            show(
              resultScreen(
                {
                  reward: mission.rounds[round].reward,
                  roundsDone: progress[id].roundsDone,
                  totalRounds: mission.rounds.length,
                  newRound: progress[id].roundsDone > (before[id]?.roundsDone ?? 0),
                  unlocked: unlocked.map((u) => GETALLENBOS_MAP.nodes[u].icon),
                },
                () => goMission(id, round),
                () => goSelect(unlocked),
              ),
            );
          },
          onQuit: () => goSelect(),
          sound: (kind) => sound?.(kind),
        },
        resumeHere,
        adaptation(),
      ),
    );
  };

  goStart();
}
