import { choicesFor, levelOf } from '../math/skills';
import type { Exercise, Operation, Rng } from '../math/types';
import type { PromptKind, Task, Theme } from './types';

let counter = 0;

/** Vaste, makkelijke voorbeelden. De mascotte doet er één voor, het kind probeert er één. */
const EXAMPLES: Record<PromptKind, { op: Operation; operands: number[] }> = {
  count: { op: 'count', operands: [4] },
  recognize: { op: 'recognize', operands: [7] },
  build: { op: 'build', operands: [3] },
  compare: { op: 'compare', operands: [2, 5] },
  order: { op: 'order', operands: [3, 1, 2] },
  missing: { op: 'missing', operands: [3, 2, 4] },
  add: { op: 'add', operands: [2, 1] },
  subtract: { op: 'subtract', operands: [4, 1] },
  split: { op: 'split', operands: [5, 2] },
  makeTen: { op: 'makeTen', operands: [8] },
  jump: { op: 'add', operands: [2, 2] },
};

const SKILL_FOR: Record<PromptKind, Parameters<typeof levelOf>[0]> = {
  count: 'count',
  recognize: 'recognize',
  build: 'build',
  compare: 'compare',
  order: 'order',
  missing: 'missing',
  add: 'add',
  subtract: 'subtract',
  split: 'split',
  makeTen: 'makeTen',
  jump: 'add',
};

function answerOf(op: Operation, o: number[]): number {
  switch (op) {
    case 'compare':
    case 'order':
      return Math.max(...o);
    case 'missing':
      return o[0] + o[1];
    case 'add':
      return o[0] + o[1];
    case 'subtract':
    case 'split':
      return o[0] - o[1];
    case 'makeTen':
      return 10 - o[0];
    default:
      return o[0];
  }
}

/** Voorbeeldopdracht voor een soort; telt niet mee voor de voortgang. */
export function demoTask(kind: PromptKind, rng: Rng, theme: Theme = 'paws'): Task {
  const { op, operands } = EXAMPLES[kind];
  const id = `demo-${kind}-${++counter}`;
  const exercise: Exercise = {
    id,
    operation: op,
    operands,
    answer: answerOf(op, operands),
    ...(op === 'order' ? { steps: [...operands].sort((x, y) => x - y) } : {}),
  };
  const base = { id, prompt: kind, exercise, support: 'concrete' as const, theme };
  if (kind === 'jump') return { ...base, interaction: 'numberline', line: { min: 0, max: 10 } };
  if (kind === 'order') return { ...base, interaction: 'sequence' };
  if (kind === 'build') return { ...base, interaction: 'drag' };
  return { ...base, interaction: 'choice', choices: choicesFor(exercise, levelOf(SKILL_FOR[kind], 0), rng) };
}
