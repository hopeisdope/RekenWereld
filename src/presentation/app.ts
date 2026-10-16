import { missions } from '../missions/getallenbos';
import { parseProgress, recordResult, type Progress } from '../state/progress';
import { SCHEMA_VERSION, type Storage } from '../storage/storage';
import { missionScreen } from './screens/mission';
import { resultScreen } from './screens/result';
import { selectScreen } from './screens/select';
import { startScreen } from './screens/start';
import type { Screen } from './screens/types';

/** Schermnavigatie: start → missieselectie → missie → resultaat → missieselectie. */
export function startApp(ui: HTMLElement, storage: Storage, rng: () => number = Math.random): void {
  let progress: Progress = parseProgress(storage.load()?.progress);
  let current: Screen | null = null;

  function show(screen: Screen): void {
    current?.destroy?.();
    current = screen;
    ui.replaceChildren(screen.el);
    window.scrollTo(0, 0);
  }

  function save(): void {
    storage.save({ schemaVersion: SCHEMA_VERSION, progress: { ...progress }, updatedAt: new Date().toISOString() });
  }

  const goStart = () => show(startScreen(goSelect));
  const goSelect = () => show(selectScreen(progress, goMission, goStart));
  const goMission = (id: string) => {
    const mission = missions[id];
    show(
      missionScreen(
        mission,
        rng,
        (stars) => {
          progress = recordResult(progress, id, stars);
          save();
          show(resultScreen(mission, stars, () => goMission(id), goSelect));
        },
        goSelect,
      ),
    );
  };

  goStart();
}
