import { makeChoices } from '../math/generate';
import type { Exercise, Rng } from '../math/types';
import type { PromptKind, Task } from './types';

let counter = 0;

/**
 * Vaste, makkelijke voorbeeldopdracht per soort. De mascotte doet hem voor,
 * daarna probeert het kind hem zelf. Telt niet mee voor de sterren.
 */
export function demoTask(kind: PromptKind, rng: Rng): Task {
  const id = `demo-${kind}-${++counter}`;
  const ex = (operation: Exercise['operation'], operands: number[], answer: number): Exercise => ({ id, operation, operands, answer });
  switch (kind) {
    case 'count':
      return { id, prompt: kind, interaction: 'choice', exercise: ex('count', [4], 4), choices: makeChoices(rng, 4, { count: 3, min: 1, max: 20 }) };
    case 'recognize':
      return { id, prompt: kind, interaction: 'choice', exercise: ex('recognize', [7], 7), choices: makeChoices(rng, 7, { count: 4, min: 0, max: 20 }) };
    case 'add':
      return { id, prompt: kind, interaction: 'choice', exercise: ex('add', [2, 1], 3), choices: makeChoices(rng, 3, { count: 3, min: 0, max: 10 }) };
    case 'jump':
      return { id, prompt: kind, interaction: 'numberline', exercise: ex('add', [2, 2], 4), line: { min: 0, max: 10 } };
  }
}
