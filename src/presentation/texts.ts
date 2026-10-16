import type { Task } from '../missions/types';

const WORDS = [
  'nul', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien',
  'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien', 'twintig',
];

/** Getal als woord (0–20); daarbuiten de cijfers. */
export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}

export const MASCOT = { emoji: '🦉', name: 'Uil Ollie' };

/** Voorwerp per thema, voor teksten. */
const THING: Record<Task['theme'], [string, string]> = {
  paws: ['voetstap', 'voetstappen'],
  apples: ['appel', 'appels'],
  frog: ['steen', 'stenen'],
};

/** De opdracht in woorden; alleen ondersteuning (klein getoond en optioneel voorgelezen). */
export function promptText(task: Task): string {
  const [a, b] = task.exercise.operands;
  const many = THING[task.theme][1];
  switch (task.prompt) {
    case 'count':
      return `Hoeveel ${many} tel je?`;
    case 'recognize':
      return `Zoek hetzelfde getal: ${numberWord(a)}.`;
    case 'build':
      return `Leg ${numberWord(a)} ${a === 1 ? THING[task.theme][0] : many} in de mand.`;
    case 'compare':
      return 'Waar zijn er meer? Tik erop.';
    case 'order':
      return 'Tik de getallen van klein naar groot.';
    case 'missing':
      return 'Welk getal ontbreekt?';
    case 'add':
      return `${a} plus ${b}. Hoeveel ${many} zijn het samen?`;
    case 'subtract':
      return `${a} min ${b}. Hoeveel ${many} blijven er over?`;
    case 'split':
      return `${numberWord(a)} is ${numberWord(b)} en ...?`;
    case 'makeTen':
      return `Hoeveel erbij om tien te maken?`;
    case 'jump':
      return task.exercise.operation === 'add'
        ? `De kikker zit op ${a}. Spring ${numberWord(b)} ${b === 1 ? 'steen' : 'stenen'} vooruit.`
        : `De kikker zit op ${a}. Spring ${numberWord(b)} ${b === 1 ? 'steen' : 'stenen'} terug.`;
  }
}

/** Hint na een fout antwoord; de echte hint is altijd visueel. */
export function hintText(task: Task): string {
  switch (task.prompt) {
    case 'count':
    case 'add':
    case 'subtract':
      return 'Tel ze één voor één. De getallen helpen je.';
    case 'recognize':
      return `Kijk goed naar het bordje: ${numberWord(task.exercise.answer)}.`;
    case 'build':
      return 'Tel mee terwijl je legt.';
    case 'compare':
      return 'Tel beide groepjes.';
    case 'order':
      return 'Begin met het kleinste getal.';
    case 'missing':
      return 'Tel de rij hardop: steeds één verder.';
    case 'split':
      return 'Tel de appels die nog verstopt zijn.';
    case 'makeTen':
      return 'Tel de lege plekjes.';
    case 'jump':
      return 'Volg de gele stenen en tel de sprongen.';
  }
}

const PRAISE = ['Goed zo!', 'Super!', 'Knap gedaan!', 'Helemaal goed!', 'Wauw, prima!'];
const RETRY = ['Bijna! Probeer het nog eens.', 'Kijk nog eens goed.', 'Nog een keer proberen?'];

export function praise(rng: () => number = Math.random): string {
  return PRAISE[Math.floor(rng() * PRAISE.length)];
}

export function retry(rng: () => number = Math.random): string {
  return RETRY[Math.floor(rng() * RETRY.length)];
}

/** Gesproken (optioneel) bij het voordoen en zelf proberen van een voorbeeld. */
export const DEMO_WATCH = 'Kijk, ik doe het voor!';
export const DEMO_TRY = 'Nu jij!';
export const PICK_MISSION = 'Tik op een plaatje om te spelen.';
export const PLAY = 'Tik op de grote knop om te spelen!';
