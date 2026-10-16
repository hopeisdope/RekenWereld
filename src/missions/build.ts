import { choicesFor, exerciseKey, generateExercise, levelOf } from '../math/skills';
import type { Exercise, Rng } from '../math/types';
import type { InteractionKind, Mission, Task, TaskSpec } from './types';

let counter = 0;
const nextId = () => `task-${++counter}`;

/** Standaard bediening per vaardigheid. */
function defaultInteraction(spec: TaskSpec): InteractionKind {
  if (spec.skill === 'order') return 'sequence';
  if (spec.skill === 'build') return 'drag';
  return 'choice';
}

/** Maakt één opdracht volgens `spec`; `seen` voorkomt dubbele opgaven binnen een ronde. */
export function buildTask(spec: TaskSpec, mission: Pick<Mission, 'theme'>, rng: Rng, seen = new Set<string>()): Task {
  const lv = { ...levelOf(spec.skill, spec.level), ...spec.tweak };
  let ex: Exercise = generateExercise(spec.skill, lv, rng);
  for (let i = 0; i < 30 && seen.has(exerciseKey(ex)); i++) ex = generateExercise(spec.skill, lv, rng);
  seen.add(exerciseKey(ex));

  const interaction = spec.interaction ?? defaultInteraction(spec);
  const task: Task = {
    id: nextId(),
    prompt: spec.prompt ?? spec.skill,
    interaction,
    exercise: ex,
    support: spec.support ?? 'concrete',
    theme: mission.theme,
  };
  if (interaction === 'choice') task.choices = choicesFor(ex, lv, rng);
  if (interaction === 'numberline') task.line = spec.line ?? { min: 0, max: lv.max };
  return task;
}

/** Alle opdrachten van ronde `round` (0-gebaseerd) van een missie. */
export function buildRoundTasks(mission: Mission, round: number, rng: Rng): Task[] {
  const r = mission.rounds[Math.max(0, Math.min(round, mission.rounds.length - 1))];
  const seen = new Set<string>();
  return r.specs.map((spec) => buildTask(spec, mission, rng, seen));
}
