import { makeAddition, makeChoices, makeCount, makeRecognize, randInt } from '../math/generate';
import type { Exercise, Rng } from '../math/types';
import type { Area, Mission, Task } from './types';

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

const key = (ex: Exercise) => `${ex.operation}:${ex.operands.join(',')}`;

/**
 * Maakt een opgave met `make`, maar probeert opnieuw als die gelijk is aan een
 * eerdere opgave in dezelfde missie, zodat een missie gevarieerd blijft.
 */
function unique(seen: Set<string>, make: () => Exercise): Exercise {
  let ex = make();
  for (let i = 0; i < 20 && seen.has(key(ex)); i++) ex = make();
  seen.add(key(ex));
  return ex;
}

function choiceTask(rng: Rng, prompt: Task['prompt'], exercise: Exercise, min: number, max: number, count: number): Task {
  return {
    id: nextId('task'),
    prompt,
    interaction: 'choice',
    exercise,
    choices: makeChoices(rng, exercise.answer, { count, min, max }),
  };
}

/** Getallen herkennen en tellen tot 20. */
export const voetstappen: Mission = {
  id: 'voetstappen',
  areaId: 'getallenbos',
  title: 'De verdwenen voetstappen',
  goal: 'Tel de voetstappen en zoek de getallen.',
  emoji: '🐾',
  reward: '🦊',
  buildTasks(rng) {
    const seen = new Set<string>();
    const count = (min: number, max: number) =>
      choiceTask(rng, 'count', unique(seen, () => makeCount(rng, min, max)), 1, 20, 3);
    const recognize = (min: number, max: number) =>
      choiceTask(rng, 'recognize', unique(seen, () => makeRecognize(rng, min, max)), 0, 20, 4);
    // Van makkelijk naar moeilijker: eerst tot 10, dan tot 20.
    return [count(3, 8), recognize(1, 10), count(5, 10), recognize(11, 20), count(11, 15), count(12, 20)];
  },
};

/** Eenvoudige optelsommen tot 10. */
export const appelmand: Mission = {
  id: 'appelmand',
  areaId: 'getallenbos',
  title: 'De appelmand',
  goal: 'Hoeveel appels zitten er samen in de mand?',
  emoji: '🍎',
  reward: '🦔',
  buildTasks(rng) {
    const seen = new Set<string>();
    const add = (max: number) =>
      choiceTask(rng, 'add', unique(seen, () => makeAddition(rng, { max, minOperand: 1 })), 0, 10, 3);
    return [add(5), add(5), add(7), add(8), add(10), add(10)];
  },
};

/** Een sprong van `start` met `jump` stappen vooruit (+) of terug (−) op 0..max. */
function makeJump(rng: Rng, max: number, direction: 'add' | 'subtract', maxJump: number): Exercise {
  const jump = randInt(rng, 1, maxJump);
  const start = direction === 'add' ? randInt(rng, 0, max - jump) : randInt(rng, jump, max);
  const answer = direction === 'add' ? start + jump : start - jump;
  return { id: nextId('ex'), operation: direction, operands: [start, jump], answer };
}

/** Vooruit en terug springen op een getallenlijn van 0 tot 10. */
export const rivier: Mission = {
  id: 'rivier',
  areaId: 'getallenbos',
  title: 'De rivier oversteken',
  goal: 'Spring met de kikker over de stenen.',
  emoji: '🐸',
  reward: '🦦',
  buildTasks(rng) {
    const seen = new Set<string>();
    const line = { min: 0, max: 10 };
    const jump = (dir: 'add' | 'subtract', maxJump: number) => unique(seen, () => makeJump(rng, line.max, dir, maxJump));
    const exercises = [jump('add', 2), jump('add', 3), jump('add', 4), jump('subtract', 2), jump('add', 4), jump('subtract', 3)];
    return exercises.map((exercise) => ({ id: nextId('task'), prompt: 'jump', interaction: 'numberline', exercise, line }));
  },
};

export const getallenbos: Area = {
  id: 'getallenbos',
  name: 'Het Getallenbos',
  emoji: '🌳',
  missionIds: [voetstappen.id, appelmand.id, rivier.id],
};

export const missions: Readonly<Record<string, Mission>> = {
  [voetstappen.id]: voetstappen,
  [appelmand.id]: appelmand,
  [rivier.id]: rivier,
};
