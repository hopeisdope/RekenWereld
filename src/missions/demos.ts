import { choicesFor, levelOf } from '../math/skills';
import type { Exercise, Operation, Rng } from '../math/types';
import type { DemoKey } from '../state/settings';
import type { PromptKind, Task, Theme } from './types';

let counter = 0;

/**
 * Vaste, makkelijke voorbeelden; per soort drie, met verschillende antwoorden.
 * De mascotte doet er één voor, het kind probeert een ánder (geen herhaling van
 * hetzelfde getal), en geen van beide heeft het getal van de eerstvolgende opdracht.
 */
const EXAMPLES: Record<PromptKind, { op: Operation; operands: number[] }[]> = {
  count: [{ op: 'count', operands: [4] }, { op: 'count', operands: [3] }, { op: 'count', operands: [5] }],
  recognize: [{ op: 'recognize', operands: [7] }, { op: 'recognize', operands: [4] }, { op: 'recognize', operands: [9] }],
  build: [{ op: 'build', operands: [3] }, { op: 'build', operands: [2] }, { op: 'build', operands: [4] }],
  compare: [{ op: 'compare', operands: [2, 5] }, { op: 'compare', operands: [6, 3] }, { op: 'compare', operands: [1, 4] }],
  order: [{ op: 'order', operands: [3, 1, 2] }, { op: 'order', operands: [5, 6, 4] }, { op: 'order', operands: [2, 4, 3] }],
  missing: [{ op: 'missing', operands: [3, 2, 4] }, { op: 'missing', operands: [1, 1, 4] }, { op: 'missing', operands: [5, 2, 4] }],
  add: [{ op: 'add', operands: [2, 1] }, { op: 'add', operands: [1, 3] }, { op: 'add', operands: [2, 3] }],
  subtract: [{ op: 'subtract', operands: [4, 1] }, { op: 'subtract', operands: [5, 3] }, { op: 'subtract', operands: [3, 2] }],
  split: [{ op: 'split', operands: [5, 2] }, { op: 'split', operands: [4, 3] }, { op: 'split', operands: [6, 4] }],
  makeTen: [{ op: 'makeTen', operands: [8] }, { op: 'makeTen', operands: [7] }, { op: 'makeTen', operands: [9] }],
  jump: [{ op: 'add', operands: [2, 2] }, { op: 'add', operands: [3, 3] }, { op: 'add', operands: [1, 2] }],
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

/**
 * Voorbeeldopdracht voor een soort + bediening; telt niet mee voor de voortgang.
 * `avoid`: antwoorden die net al voorkwamen of zo meteen komen (geen herhaling).
 */
export function demoTask(key: DemoKey, rng: Rng, theme: Theme = 'paws', avoid: readonly number[] = []): Task {
  const [kind, interaction] = key.split('/') as [PromptKind, Task['interaction']];
  const options = EXAMPLES[kind];
  const { op, operands } = options.find((e) => !avoid.includes(answerOf(e.op, e.operands))) ?? options[0];
  const id = `demo-${kind}-${++counter}`;
  const exercise: Exercise = {
    id,
    operation: op,
    operands,
    answer: answerOf(op, operands),
    ...(op === 'order' ? { steps: [...operands].sort((x, y) => x - y) } : {}),
  };
  const base = { id, prompt: kind, exercise, support: 'concrete' as const, theme };
  if (interaction === 'numberline') return { ...base, interaction, line: { min: 0, max: 10 } };
  if (interaction === 'sequence' || interaction === 'drag') return { ...base, interaction };
  return { ...base, interaction: 'choice', choices: choicesFor(exercise, levelOf(SKILL_FOR[kind], 0), rng) };
}
