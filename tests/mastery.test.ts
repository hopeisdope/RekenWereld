import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/math/generate';
import { levelOf } from '../src/math/skills';
import { adaptedLevel, buildRoundTasks, rebuildUpcoming, skillOf, withRepetition, type Adaptation } from '../src/missions/build';
import { missions } from '../src/missions/getallenbos';
import {
  ADAPTIVE_RULES,
  EMPTY_STAT,
  effectiveShift,
  outcomeOf,
  parseSkillStats,
  recordOutcome,
  skillStatus,
  type Outcome,
  type SkillStat,
} from '../src/state/mastery';
import { parentReport } from '../src/state/report';
import { replaceUpcoming, startSession } from '../src/state/session';
import { DEFAULT_SETTINGS, parseSettings, setLevelOverride } from '../src/state/settings';

const run = (outcomes: Outcome[], start: SkillStat = EMPTY_STAT) => outcomes.reduce((s, o) => recordOutcome(s, o), start);
const many = (o: Outcome, n: number) => Array<Outcome>(n).fill(o);

describe('adaptieve regels', () => {
  it('uitkomst uit het aantal fouten', () => {
    expect([0, 1, 2, 5].map(outcomeOf)).toEqual(['clean', 'struggled', 'hard', 'hard']);
  });

  it('één goed of fout antwoord verandert nooit het niveau of de status "beheerst"', () => {
    expect(run(['clean']).shift).toBe(0);
    expect(run(['hard']).shift).toBe(0);
    expect(skillStatus(run(['clean']))).toBe('practicing');
    expect(skillStatus(run(['hard']))).toBe('practicing');
  });

  it('moeilijker pas na 5 opdrachten op rij foutloos', () => {
    expect(run(many('clean', 4)).shift).toBe(0);
    expect(run(many('clean', 5)).shift).toBe(1);
    // Een fout tussendoor zet de teller terug.
    expect(run([...many('clean', 4), 'struggled', ...many('clean', 4)]).shift).toBe(0);
  });

  it('nooit meer dan één niveau boven de leerlijn', () => {
    expect(run(many('clean', 30)).shift).toBe(ADAPTIVE_RULES.maxShift);
  });

  it('makkelijker na 2 moeilijke opdrachten op rij, tot maximaal 2 niveaus', () => {
    expect(run(['hard']).shift).toBe(0);
    expect(run(['hard', 'hard']).shift).toBe(-1);
    expect(run(['hard', 'clean', 'hard']).shift).toBe(0);
    expect(run(many('hard', 20)).shift).toBe(ADAPTIVE_RULES.minShift);
  });

  it('reproduceerbaar: dezelfde reeks uitkomsten geeft altijd dezelfde toestand', () => {
    const rng = seededRng(42);
    const options: Outcome[] = ['clean', 'struggled', 'hard'];
    const seq = Array.from({ length: 200 }, () => options[Math.floor(rng() * 3)]);
    expect(run(seq)).toEqual(run(seq));
    expect(JSON.parse(JSON.stringify(run(seq)))).toEqual(run(seq));
  });

  it('beheerst vraagt minstens 6 recente opdrachten met 80% foutloos', () => {
    expect(skillStatus(run(many('clean', 5)))).toBe('practicing');
    expect(skillStatus(run([...many('clean', 5), 'struggled']))).toBe('mastered'); // 5/6 = 83%
    expect(skillStatus(run([...many('clean', 4), 'hard', 'hard']))).not.toBe('mastered');
  });

  it('extra oefenen nuttig bij weinig foutloze opdrachten of na makkelijker maken', () => {
    expect(skillStatus(run(['hard', 'struggled', 'struggled', 'clean']))).toBe('needsPractice');
    expect(skillStatus(run(['struggled', 'clean', 'clean', 'clean']))).toBe('practicing');
    expect(skillStatus(undefined)).toBe('notStarted');
    expect(skillStatus(run(['hard', 'hard']))).toBe('needsPractice'); // al makkelijker gemaakt
    expect(skillStatus(run(['hard']))).toBe('practicing'); // één fout is nooit genoeg
  });

  it('ouderinstelling gaat voor de automatische aanpassing', () => {
    const s = run(['hard', 'hard']);
    expect(effectiveShift(s)).toBe(-1);
    expect(effectiveShift(s, 'harder')).toBe(1);
    expect(effectiveShift(undefined, 'easier')).toBe(-1);
  });

  it('kapotte opgeslagen statistieken worden veilig ingelezen en begrensd', () => {
    const parsed = parseSkillStats({ count: { attempts: 5, clean: 99, recent: ['clean', 'raar', 'hard'], shift: 7, cleanStreak: -3 }, onzin: { attempts: 1 }, add: 'x' });
    expect(parsed).toEqual({ count: { attempts: 5, clean: 5, recent: ['clean', 'hard'], cleanStreak: 0, hardStreak: 0, shift: ADAPTIVE_RULES.maxShift } });
    expect(parseSkillStats(null)).toEqual({});
  });
});

describe('aangepaste opdrachten', () => {
  const adapt = (shift: number, practice: string[] = []): Adaptation => ({ shift: () => shift, needsPractice: (k) => practice.includes(k), maxTasks: 8 });

  it('niveau schuift mee, maar blijft binnen de bestaande niveaus', () => {
    const spec = { skill: 'count' as const, level: 1 };
    expect(adaptedLevel(spec, -1)).toBe(0);
    expect(adaptedLevel(spec, -5)).toBe(0);
    expect(adaptedLevel(spec, 9)).toBe(2);
  });

  it('makkelijker: kleinere getallen en altijd voorwerpen erbij', () => {
    for (let seed = 0; seed < 50; seed++) {
      const tasks = buildRoundTasks(missions.voetstappen, 0, seededRng(seed), adapt(-1));
      for (const t of tasks) {
        expect(t.support).toBe('concrete');
        if (t.prompt === 'count') expect(t.exercise.answer).toBeLessThanOrEqual(levelOf('count', 0).max);
      }
    }
  });

  it('moeilijker op de getallenlijn: het antwoord blijft op de lijn', () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const t of buildRoundTasks(missions.rivier, 0, seededRng(seed), adapt(1))) {
        expect(t.exercise.answer).toBeLessThanOrEqual(t.line!.max);
        expect(t.exercise.operands[0]).toBeLessThanOrEqual(t.line!.max);
      }
    }
  });

  it('extra herhaling voor moeilijke vaardigheden, nooit meer dan 8 opdrachten', () => {
    const specs = missions.voetstappen.rounds[0].specs;
    const more = withRepetition(specs, adapt(0, ['count', 'recognize']));
    expect(more).toHaveLength(8);
    expect(more.filter((s) => s.skill === 'count')).toHaveLength(4);
    const capped = withRepetition([...specs, ...specs.slice(0, 2)], adapt(0, ['count', 'recognize']));
    expect(capped.length).toBeLessThanOrEqual(8);
    expect(withRepetition(specs, adapt(0))).toEqual([...specs]);
  });

  it('niveauwijziging midden in een ronde: alleen komende opdrachten van die vaardigheid veranderen', () => {
    const tasks = buildRoundTasks(missions.voetstappen, 0, seededRng(3));
    const rebuilt = rebuildUpcoming(tasks, 2, 'count', missions.voetstappen, seededRng(4), -1);
    rebuilt.forEach((t, i) => {
      if (i < 2 || skillOf(t) !== 'count') expect(t).toBe(tasks[i]);
      else {
        expect(t.id).not.toBe(tasks[i].id);
        expect(t.exercise.answer).toBeLessThanOrEqual(levelOf('count', 0).max);
      }
    });
    const s = startSession('voetstappen', tasks, 1);
    const replaced = replaceUpcoming(s, rebuilt);
    expect(replaced.tasks[1]).toBe(tasks[1]); // huidige opdracht blijft
    expect(replaceUpcoming(s, rebuilt.slice(1))).toBe(s); // verkeerde lengte → niets
  });
});

describe('niveau aanpassen door ouders', () => {
  it('instellen, terugzetten op automatisch en veilig inlezen', () => {
    let s = setLevelOverride(DEFAULT_SETTINGS, 'add', 'easier');
    expect(s.levelOverrides).toEqual({ add: 'easier' });
    s = setLevelOverride(s, 'add', 'auto');
    expect(s.levelOverrides).toEqual({});
    expect(parseSettings({ levelOverrides: { add: 'harder', count: 'raar', nep: 'easier' } }).levelOverrides).toEqual({ add: 'harder' });
  });
});

describe('ouderrapport', () => {
  it('toont geoefende vaardigheden, adviezen en voortgang', () => {
    const stats = { count: run(many('clean', 6)), add: run(['hard', 'hard', 'struggled', 'hard']) };
    const r = parentReport(stats, { subtract: 'easier' }, { voetstappen: { roundsDone: 2, completed: true, bestStars: 3, timesPlayed: 2 } }, Object.values(missions));
    expect(r.mastered).toEqual(['count']);
    expect(r.needsPractice).toEqual(['add']);
    expect(r.rows.find((x) => x.skill === 'subtract')).toMatchObject({ status: 'notStarted', override: 'easier', shift: -1 });
    expect(r.rows.find((x) => x.skill === 'add')!.shift).toBeLessThan(0);
    expect(r.animalsFound).toBe(2);
    expect(r.animalsTotal).toBe(9);
    expect(r.rows).toHaveLength(10);
  });
});
