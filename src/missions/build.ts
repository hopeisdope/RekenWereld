import { choicesFor, exerciseKey, generateExercise, levelOf, SKILLS, type SkillId } from '../math/skills';
import type { Exercise, Rng } from '../math/types';
import type { InteractionKind, Mission, Task, TaskSpec } from './types';

let counter = 0;
const nextId = () => `task-${++counter}`;

/**
 * Aanpassing aan het kind (zie state/mastery.ts). Zonder aanpassing volgt de
 * ronde precies de leerlijn.
 */
export interface Adaptation {
  /** Niveau-verschuiving t.o.v. de leerlijn (negatief = makkelijker). */
  shift(skill: SkillId): number;
  /** Is extra herhaling nuttig voor deze vaardigheid? */
  needsPractice(skill: SkillId): boolean;
  /** Maximaal aantal opdrachten per ronde. */
  maxTasks: number;
}

/** De vaardigheid van een opdracht (de bewerking heet hetzelfde als de vaardigheid). */
export function skillOf(task: Pick<Task, 'spec' | 'exercise'>): SkillId {
  return task.spec?.skill ?? task.exercise.operation;
}

/** Standaard bediening per vaardigheid. */
function defaultInteraction(spec: TaskSpec): InteractionKind {
  if (spec.skill === 'order') return 'sequence';
  if (spec.skill === 'build') return 'drag';
  return 'choice';
}

/** Het niveau dat echt gebruikt wordt: leerlijn + aanpassing, binnen de bestaande niveaus. */
export function adaptedLevel(spec: TaskSpec, shift: number): number {
  return Math.max(0, Math.min(SKILLS[spec.skill].levels.length - 1, spec.level + shift));
}

/**
 * Maakt één opdracht volgens `spec`; `seen` voorkomt dubbele opgaven binnen een
 * ronde. Bij een negatieve aanpassing worden altijd voorwerpen getoond.
 */
export function buildTask(
  spec: TaskSpec,
  mission: Pick<Mission, 'theme'>,
  rng: Rng,
  seen = new Set<string>(),
  shift = 0,
  avoidAnswers: readonly number[] = [],
): Task {
  const lv = { ...levelOf(spec.skill, adaptedLevel(spec, shift)), ...spec.tweak };
  // Op een getallenlijn blijft het antwoord altijd op de lijn.
  if (spec.line) lv.max = Math.min(lv.max, spec.line.max);
  // Niet hetzelfde getal als de opdracht ervoor/erna, en liefst geen dubbele opgave in de ronde.
  // Is dat samen onmogelijk (heel klein niveau), dan gaat "ander getal" voor.
  const newNumber = (e: Exercise) => !avoidAnswers.includes(e.answer);
  const ok = (e: Exercise) => newNumber(e) && !seen.has(exerciseKey(e));
  let ex: Exercise = generateExercise(spec.skill, lv, rng);
  for (let i = 0; i < 60 && !ok(ex); i++) ex = generateExercise(spec.skill, lv, rng);
  for (let i = 0; i < 60 && !newNumber(ex); i++) ex = generateExercise(spec.skill, lv, rng);
  seen.add(exerciseKey(ex));

  const interaction = spec.interaction ?? defaultInteraction(spec);
  const task: Task = {
    id: nextId(),
    prompt: spec.prompt ?? spec.skill,
    interaction,
    exercise: ex,
    support: shift < 0 ? 'concrete' : (spec.support ?? 'concrete'),
    theme: mission.theme,
    spec,
  };
  if (interaction === 'choice') task.choices = choicesFor(ex, lv, rng);
  if (interaction === 'numberline') task.line = spec.line ?? { min: 0, max: lv.max };
  return task;
}

/**
 * Extra herhaling: voor elke vaardigheid in de ronde waarbij oefenen nuttig is,
 * komt er een concrete opdracht op het makkelijkste niveau van die ronde bij,
 * direct na de laatste opdracht van die vaardigheid (tot `maxTasks`).
 */
export function withRepetition(specs: readonly TaskSpec[], adapt?: Adaptation): TaskSpec[] {
  const out = [...specs];
  if (!adapt) return out;
  const skills = [...new Set(specs.map((s) => s.skill))].filter((k) => adapt.needsPractice(k));
  for (const skill of skills) {
    if (out.length >= adapt.maxTasks) break;
    const ofSkill = out.filter((s) => s.skill === skill);
    const easiest = ofSkill.reduce((a, b) => (b.level < a.level ? b : a));
    const last = out.map((s) => s.skill).lastIndexOf(skill);
    out.splice(last + 1, 0, { ...easiest, support: 'concrete' });
  }
  return out;
}

/** Alle opdrachten van ronde `round` (0-gebaseerd) van een missie. */
export function buildRoundTasks(mission: Mission, round: number, rng: Rng, adapt?: Adaptation): Task[] {
  const r = mission.rounds[Math.max(0, Math.min(round, mission.rounds.length - 1))];
  const seen = new Set<string>();
  const tasks: Task[] = [];
  for (const spec of withRepetition(r.specs, adapt)) {
    const prev = tasks[tasks.length - 1];
    tasks.push(buildTask(spec, mission, rng, seen, adapt?.shift(spec.skill) ?? 0, prev ? [prev.exercise.answer] : []));
  }
  return tasks;
}

/**
 * Na een niveau-wijziging midden in een ronde: maak de nog komende opdrachten
 * van die vaardigheid opnieuw op het nieuwe niveau. Eerdere opdrachten blijven.
 */
export function rebuildUpcoming(tasks: readonly Task[], fromIndex: number, skill: SkillId, mission: Pick<Mission, 'theme'>, rng: Rng, shift: number): Task[] {
  const seen = new Set(tasks.map((t) => exerciseKey(t.exercise)));
  const out = [...tasks];
  for (let i = fromIndex; i < out.length; i++) {
    const t = out[i];
    if (!t.spec || t.spec.skill !== skill) continue;
    const neighbours = [out[i - 1], out[i + 1]].filter(Boolean).map((n) => n.exercise.answer);
    out[i] = buildTask(t.spec, mission, rng, seen, shift, neighbours);
  }
  return out;
}
