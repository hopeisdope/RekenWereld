import { missions } from '../missions/getallenbos';
import { nextRound, parseProgress, recordResult, type Progress } from '../state/progress';
import { parseResume, type ResumePoint } from '../state/resume';
import { markDemoSeen, parseSettings, type DemoKey, type Settings } from '../state/settings';
import { SCHEMA_VERSION, type Storage } from '../storage/storage';
import { missionScreen, type SoundKind } from './screens/mission';
import { resultScreen } from './screens/result';
import { selectScreen } from './screens/select';
import { startScreen } from './screens/start';
import type { Screen } from './screens/types';
import { setSpeechEnabled } from './speech';

/** Schermnavigatie: start → missieselectie → missie → resultaat → missieselectie. */
export function startApp(
  ui: HTMLElement,
  storage: Storage,
  rng: () => number = Math.random,
  sound?: (kind: SoundKind) => void,
): void {
  const saved = storage.load();
  let progress: Progress = parseProgress(saved?.progress);
  let settings: Settings = parseSettings(saved?.settings);
  let resume: ResumePoint | null = parseResume(saved?.resume);
  let current: Screen | null = null;
  setSpeechEnabled(settings.sound);

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
      settings: { sound: settings.sound, seenDemos: [...settings.seenDemos] },
      resume: resume ?? undefined,
      updatedAt: new Date().toISOString(),
    });
  }

  const toggleSound = () => {
    settings = { ...settings, sound: !settings.sound };
    setSpeechEnabled(settings.sound);
    save();
    return settings.sound;
  };

  const goStart = () => show(startScreen(settings.sound, goSelect, toggleSound));
  const goSelect = () => show(selectScreen(progress, goMission, goStart));
  /** Missie openen: een onderbroken ronde gaat verder waar hij was, anders de volgende ronde. */
  const goMission = (id: string, replayRound?: number) => {
    const mission = missions[id];
    const resumeHere = replayRound === undefined && resume?.missionId === id && resume.round < mission.rounds.length ? resume : undefined;
    const round = replayRound ?? resumeHere?.round ?? nextRound(progress, id, mission.rounds.length);
    show(
      missionScreen(mission, round, rng, {
        seenDemos: () => settings.seenDemos,
        onDemoSeen: (key: DemoKey) => {
          settings = markDemoSeen(settings, key);
          save();
        },
        onProgress: (point) => {
          resume = point;
          save();
        },
        onFinish: (stars) => {
          progress = recordResult(progress, id, stars, round, mission.rounds.length);
          save();
          show(resultScreen(mission.rounds[round].reward, stars, () => goMission(id, round), goSelect));
        },
        onQuit: goSelect,
        sound: (kind) => sound?.(kind),
      }, resumeHere),
    );
  };

  goStart();
}
