import { SKILLS } from '../../math/skills';
import type { LevelOverride } from '../../state/mastery';
import type { ParentReport, SkillRow } from '../../state/report';
import type { StorageStatus } from '../../storage/storage';
import { el } from '../dom';
import type { Screen } from './types';

export interface VoiceChoice {
  /** Beschikbare lokale Nederlandse stemmen, beste eerst. */
  voices: readonly { voiceURI: string; name: string; lang: string }[];
  selected: string | null;
  rate: 'normal' | 'slow';
}

export interface ParentActions {
  setOverride(skill: SkillRow['skill'], value: LevelOverride): void;
  toggleSound(): boolean;
  setVoice(voiceURI: string | null, rate: 'normal' | 'slow'): void;
  testVoice(): void;
  reset(): void;
  close(): void;
}

const STATUS: Record<SkillRow['status'], [string, string]> = {
  notStarted: ['Nog niet geoefend', 'none'],
  practicing: ['Bezig', 'busy'],
  needsPractice: ['Extra oefenen nuttig', 'extra'],
  mastered: ['Gaat goed', 'good'],
};

const SHIFT_TEXT = (shift: number) => (shift < 0 ? 'makkelijker dan de leerlijn' : shift > 0 ? 'moeilijker dan de leerlijn' : 'volgens de leerlijn');

/**
 * Oudergedeelte: eenvoudig overzicht, niveau per vaardigheid, geluid en een
 * bevestigde reset. Alles staat alleen op dit apparaat.
 */
export function parentScreen(report: ParentReport, storage: StorageStatus, sound: boolean, voice: VoiceChoice, actions: ParentActions): Screen {
  const close = el('button', { type: 'button', class: 'parent-close', 'aria-label': 'Terug naar het spel' }, '✕ Terug');
  close.addEventListener('click', actions.close);

  const advice = report.needsPractice.length
    ? el('p', { class: 'advice extra' }, `Extra oefenen kan helpen bij: ${report.needsPractice.map((k) => SKILLS[k].goal.toLowerCase()).join(', ')}. De app biedt hier vanzelf meer herhaling en makkelijkere opdrachten aan.`)
    : el('p', { class: 'advice' }, report.rows.some((r) => r.attempts > 0) ? 'Er zijn nu geen vaardigheden waar extra oefenen nodig lijkt.' : 'Er is nog niet geoefend.');

  const rows = report.rows.map((r) => {
    const [label, cls] = STATUS[r.status];
    const seg = el('div', { class: 'segmented', role: 'radiogroup', 'aria-label': `Niveau ${r.goal}` });
    for (const [value, text] of [['easier', 'Makkelijker'], ['auto', 'Automatisch'], ['harder', 'Moeilijker']] as const) {
      const b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(r.override === value), class: r.override === value ? 'on' : '', 'data-skill': r.skill, 'data-value': value }, text);
      b.addEventListener('click', () => actions.setOverride(r.skill, value));
      seg.append(b);
    }
    return el(
      'li',
      { class: 'skill-row', 'data-skill': r.skill, 'data-status': r.status },
      el('div', { class: 'skill-head' }, el('strong', {}, r.goal), el('span', { class: `chip ${cls}` }, label)),
      el(
        'p',
        { class: 'skill-meta' },
        r.attempts
          ? `${r.attempts} opdracht${r.attempts === 1 ? '' : 'en'} · laatste ${r.recentCount}: ${Math.round(r.recentRate * 100)}% in één keer goed · niveau ${SHIFT_TEXT(r.shift)}`
          : `Niveau ${SHIFT_TEXT(r.shift)}`,
      ),
      r.recentCount ? el('div', { class: 'bar', 'aria-hidden': 'true' }, el('span', { style: `width:${Math.round(r.recentRate * 100)}%` })) : null,
      seg,
    );
  });

  const soundBtn = el('button', { type: 'button', class: 'parent-button', 'aria-pressed': String(sound) }, sound ? 'Geluid en voorlezen: aan' : 'Geluid en voorlezen: uit');
  soundBtn.addEventListener('click', () => {
    const on = actions.toggleSound();
    soundBtn.textContent = on ? 'Geluid en voorlezen: aan' : 'Geluid en voorlezen: uit';
    soundBtn.setAttribute('aria-pressed', String(on));
  });

  // Voorlezen: stem en tempo kiezen, met een testknop.
  let selected = voice.selected;
  let rate = voice.rate;
  const voiceSelect = el('select', { class: 'voice-select', 'aria-label': 'Stem' });
  voiceSelect.append(el('option', { value: '' }, 'Automatisch (beste stem)'));
  for (const v of voice.voices) {
    const opt = el('option', { value: v.voiceURI }, `${v.name} (${v.lang.replace('_', '-')})`);
    if (v.voiceURI === selected) opt.selected = true;
    voiceSelect.append(opt);
  }
  voiceSelect.addEventListener('change', () => {
    selected = voiceSelect.value || null;
    actions.setVoice(selected, rate);
    actions.testVoice();
  });
  const rateSeg = el('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Tempo' });
  for (const [value, text] of [['normal', 'Normaal'], ['slow', 'Rustig']] as const) {
    const b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(rate === value), class: rate === value ? 'on' : '', 'data-rate': value }, text);
    b.addEventListener('click', () => {
      rate = value;
      for (const x of rateSeg.querySelectorAll('button')) {
        const on = x.dataset.rate === value;
        x.classList.toggle('on', on);
        x.setAttribute('aria-checked', String(on));
      }
      actions.setVoice(selected, rate);
      actions.testVoice();
    });
    rateSeg.append(b);
  }
  const testBtn = el('button', { type: 'button', class: 'parent-button test-voice' }, '▶ Laat horen');
  testBtn.addEventListener('click', actions.testVoice);
  const voiceSection = voice.voices.length
    ? [
        el('div', { class: 'voice-row' }, voiceSelect, rateSeg, testBtn),
        el(
          'p',
          { class: 'hint-small' },
          'Klinkt de stem robotachtig? Download op de iPad een betere stem: Instellingen → Toegankelijkheid → Gesproken materiaal → Stemmen → Nederlands → kies een stem met "Verbeterd" of "Premium" en tik op downloaden. Open daarna de app opnieuw en kies die stem hier. Stemmen werken op het apparaat zelf, zonder internet.',
        ),
      ]
    : [
        el(
          'p',
          { class: 'warning no-voices' },
          'Er is op dit apparaat geen Nederlandse stem gevonden, dus de app leest niet voor (spelen kan gewoon). Op de iPad: Instellingen → Toegankelijkheid → Gesproken materiaal → Stemmen → Nederlands → download een stem en open de app opnieuw.',
        ),
      ];

  // Reset in twee stappen: eerst vragen, dan pas wissen.
  const resetBox = el('div', { class: 'reset-box' });
  const askReset = () => {
    const cancel = el('button', { type: 'button', class: 'parent-button' }, 'Annuleren');
    const confirm = el('button', { type: 'button', class: 'parent-button danger confirm-reset' }, 'Ja, alles wissen');
    cancel.addEventListener('click', showResetButton);
    confirm.addEventListener('click', actions.reset);
    resetBox.replaceChildren(
      el('p', { class: 'warning' }, 'Weet u het zeker? Alle sterren, dieren, oefengegevens en niveau-instellingen op dit apparaat worden gewist. Dit kan niet ongedaan worden gemaakt.'),
      el('div', { class: 'reset-actions' }, cancel, confirm),
    );
  };
  function showResetButton() {
    const b = el('button', { type: 'button', class: 'parent-button danger ask-reset' }, 'Voortgang wissen…');
    b.addEventListener('click', askReset);
    resetBox.replaceChildren(b);
  }
  showResetButton();

  const storageNotes = [
    el('p', {}, 'Alle voortgang staat alleen op dit apparaat. Er is geen account, er gaat niets via internet en er worden geen namen bewaard.'),
    el('p', {}, 'Tip: zet de app op het beginscherm (deelknop → Zet op beginscherm). Anders kan Safari de gegevens wissen als de app 7 dagen niet gebruikt is.'),
    !storage.lastSaveOk ? el('p', { class: 'warning storage-warning' }, 'Opslaan lukt op dit moment niet (bijvoorbeeld privé-modus of volle opslag). Spelen kan gewoon, maar de voortgang wordt niet bewaard.') : null,
    storage.recovered === 'backup' ? el('p', { class: 'warning' }, 'De opgeslagen gegevens waren beschadigd; de vorige goede stand is teruggezet.') : null,
    storage.recovered === 'reset' ? el('p', { class: 'warning' }, 'De opgeslagen gegevens waren beschadigd en konden niet worden hersteld; de app is opnieuw begonnen.') : null,
    el('p', { class: 'build-id' }, `Werkt ook zonder internet na het eerste bezoek. Updates worden vanzelf geladen als de app even dicht is; de voortgang blijft staan. Versie: ${document.documentElement.dataset.build ?? 'dev'}`),
  ];

  return {
    el: el(
      'main',
      { class: 'screen parent' },
      el(
        'div',
        { class: 'card parent-card' },
        el('header', { class: 'parent-header' }, el('h1', {}, 'Voor ouders'), close),
        el('section', {}, el('h2', {}, 'Hoe gaat het?'), advice),
        el(
          'section',
          {},
          el('h2', {}, 'Missies'),
          el('ul', { class: 'mission-list-parent' }, ...report.missions.map((m) => el('li', {}, `${m.title}: ${m.roundsDone} van ${m.rounds} rondes`))),
          el('p', {}, `Dieren gevonden: ${report.animalsFound} van ${report.animalsTotal}.`),
        ),
        el(
          'section',
          {},
          el('h2', {}, 'Vaardigheden'),
          el('p', { class: 'hint-small' }, '"Automatisch": na 5 opdrachten op rij foutloos wordt het iets moeilijker; na 2 opdrachten op rij met veel fouten iets makkelijker (met voorwerpen erbij). Eén antwoord verandert nooit het niveau.'),
          el('ul', { class: 'skill-list' }, ...rows),
        ),
        el('section', {}, el('h2', {}, 'Instellingen'), soundBtn),
        el('section', { class: 'voice-section' }, el('h2', {}, 'Voorlezen'), ...voiceSection),
        el('section', {}, el('h2', {}, 'Opslag en privacy'), ...storageNotes.filter(Boolean)),
        el('section', {}, el('h2', {}, 'Opnieuw beginnen'), resetBox),
      ),
    ),
  };
}
