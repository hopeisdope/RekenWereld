import { missions } from '../missions/getallenbos';
import type { PromptKind } from '../missions/types';
import { parseProgress, recordResult, type Progress } from '../state/progress';
import { markDemoSeen, parseSettings, type Settings } from '../state/settings';
import { SCHEMA_VERSION, type Storage } from '../storage/storage';
import { missionScreen } from './screens/mission';
import { resultScreen } from './screens/result';
import { selectScreen } from './screens/select';
import { startScreen } from './screens/start';
import type { Screen } from './screens/types';
import { setSpeechEnabled } from './speech';

/** Schermnavigatie: start → missieselectie → missie → resultaat → missieselectie. */
export function startApp(ui: HTMLElement, storage: Storage, rng: () => number = Math.random): void {
  const saved = storage.load();
  let progress: Progress = parseProgress(saved?.progress);
  let settings: Settings = parseSettings(saved?.settings);
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
  const goMission = (id: string) => {
    const mission = missions[id];
    show(
      missionScreen(mission, rng, {
        seenDemos: () => settings.seenDemos,
        onDemoSeen: (kind: PromptKind) => {
          settings = markDemoSeen(settings, kind);
          save();
        },
        onFinish: (stars) => {
          progress = recordResult(progress, id, stars);
          save();
          show(resultScreen(mission, stars, () => goMission(id), goSelect));
        },
        onQuit: goSelect,
      }),
    );
  };

  goStart();
}
