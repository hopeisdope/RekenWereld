import type { Area, Mission, TaskSpec } from './types';

/*
 * Leerlijnen van Het Getallenbos. Elke missie heeft drie rondes; elke ronde
 * heeft een eigen leerdoel en loopt van concreet (voorwerpen) naar abstract
 * (alleen getallen). Niveaus staan in src/math/skills.ts.
 */

const c = (skill: TaskSpec['skill'], level: number, extra: Partial<TaskSpec> = {}): TaskSpec => ({ skill, level, support: 'concrete', ...extra });
const a = (skill: TaskSpec['skill'], level: number, extra: Partial<TaskSpec> = {}): TaskSpec => ({ skill, level, support: 'abstract', ...extra });

/** Getallen herkennen, tellen, telrij, vergelijken en ordenen. */
export const voetstappen: Mission = {
  id: 'voetstappen',
  areaId: 'getallenbos',
  title: 'De verdwenen voetstappen',
  goal: 'Tellen, getallen herkennen, de telrij, vergelijken en ordenen tot 20.',
  emoji: '🐾',
  theme: 'paws',
  rounds: [
    // 1. Tellen en herkennen tot 10
    { reward: '🦊', specs: [c('count', 0), c('count', 1), c('recognize', 0), c('count', 1), c('recognize', 0), c('recognize', 0)] },
    // 2. Tot 20 en de telrij
    { reward: '🐿️', specs: [c('count', 2), c('recognize', 1), c('missing', 0), c('count', 2), c('missing', 0), a('missing', 1)] },
    // 3. Vergelijken en ordenen
    { reward: '🦌', specs: [c('compare', 0), c('compare', 1), c('order', 0), c('compare', 2), a('order', 0), a('order', 1)] },
  ],
};

/** Optellen, aftrekken, splitsen en aanvullen tot 10. */
export const appelmand: Mission = {
  id: 'appelmand',
  areaId: 'getallenbos',
  title: 'De appelmand',
  goal: 'Optellen en aftrekken tot 10, splitsen en aanvullen tot 10.',
  emoji: '🍎',
  theme: 'apples',
  rounds: [
    // 1. Hoeveelheid maken (slepen), dan optellen met appels, daarna alleen met getallen
    { reward: '🦔', specs: [c('build', 0), c('build', 1), c('add', 0), c('add', 1), a('add', 1), a('add', 1)] },
    // 2. Aftrekken (appels opeten)
    { reward: '🐛', specs: [c('subtract', 0), c('subtract', 0), c('subtract', 1), c('subtract', 1), a('subtract', 1), a('subtract', 1)] },
    // 3. Splitsen en aanvullen tot 10
    { reward: '🐞', specs: [c('split', 0), c('split', 1), a('split', 1), c('makeTen', 0, { interaction: 'drag' }), c('makeTen', 1, { interaction: 'drag' }), a('makeTen', 1)] },
  ],
};

const line10 = { min: 0, max: 10 };
const line20 = { min: 0, max: 20 };
const jump = (skill: 'add' | 'subtract', level: number, maxSecond: number, line: { min: number; max: number }, support: TaskSpec['support'] = 'concrete'): TaskSpec => ({
  skill,
  level,
  prompt: 'jump',
  interaction: 'numberline',
  tweak: { min: 1, maxSecond },
  line,
  support,
});

/** Vooruit en terug springen op de getallenlijn. */
export const rivier: Mission = {
  id: 'rivier',
  areaId: 'getallenbos',
  title: 'De rivier oversteken',
  goal: 'Optellen en aftrekken als sprongen op de getallenlijn tot 10 en tot 20.',
  emoji: '🐸',
  theme: 'frog',
  rounds: [
    // 1. Vooruit springen tot 10
    { reward: '🦦', specs: [jump('add', 1, 2, line10), jump('add', 1, 3, line10), jump('add', 1, 3, line10), jump('add', 1, 4, line10), jump('add', 1, 4, line10, 'abstract'), jump('add', 1, 4, line10, 'abstract')] },
    // 2. Vooruit en terug tot 10
    { reward: '🐟', specs: [jump('subtract', 1, 2, line10), jump('add', 1, 3, line10), jump('subtract', 1, 3, line10), jump('add', 1, 4, line10, 'abstract'), jump('subtract', 1, 4, line10, 'abstract'), jump('subtract', 1, 4, line10, 'abstract')] },
    // 3. Tot 20, zonder over het tiental
    { reward: '🦆', specs: [jump('add', 2, 3, line20), jump('subtract', 2, 3, line20), jump('add', 2, 5, line20), jump('subtract', 2, 5, line20), jump('add', 2, 5, line20, 'abstract'), jump('subtract', 2, 5, line20, 'abstract')] },
  ],
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
