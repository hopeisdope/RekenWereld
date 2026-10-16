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

/** De opdracht in woorden; wordt getoond én voorgelezen. */
export function promptText(task: Task): string {
  const [a, b] = task.exercise.operands;
  switch (task.prompt) {
    case 'count':
      return 'Hoeveel voetstappen tel je?';
    case 'recognize':
      return `Zoek hetzelfde getal: ${numberWord(a)}.`;
    case 'add':
      return 'Hoeveel appels zijn het samen?';
    case 'jump':
      return task.exercise.operation === 'add'
        ? `De kikker zit op ${a}. Spring ${numberWord(b)} ${b === 1 ? 'steen' : 'stenen'} vooruit.`
        : `De kikker zit op ${a}. Spring ${numberWord(b)} ${b === 1 ? 'steen' : 'stenen'} terug.`;
  }
}

/** Hint na een fout antwoord: vriendelijk en concreet. */
export function hintText(task: Task): string {
  switch (task.prompt) {
    case 'count':
      return 'Tel ze één voor één. De getallen helpen je.';
    case 'recognize':
      return `Kijk goed naar het bordje: ${numberWord(task.exercise.answer)}.`;
    case 'add':
      return 'Tel alle appels samen. De getallen helpen je.';
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
