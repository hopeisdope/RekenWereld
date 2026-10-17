/**
 * Voorlezen met de ingebouwde spraak van het apparaat (Web Speech API).
 * Alleen stemmen die lokaal op het apparaat draaien (`localService`) worden
 * gebruikt, zodat er nooit tekst naar een server gaat en het offline werkt.
 * Zonder lokale Nederlandse stem blijft de app stil; alles is ook zonder
 * geluid te begrijpen. Op iOS mag spraak pas na een eerste tik.
 *
 * Klankkwaliteit:
 * - de beste beschikbare stem wordt gekozen (verbeterde/premium vóór compacte),
 *   of de stem die een ouder heeft gekozen;
 * - tempo 1,0 klinkt op iOS het natuurlijkst (lager klinkt slepend en vervormd);
 * - na het afbreken van een vorige zin even wachten: direct opnieuw spreken
 *   laat op iOS het eerste woord haperen.
 */

/** Minimale vorm van een stem (zodat de keuze los te testen is). */
export interface VoiceInfo {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
}

export type SpeechRate = 'normal' | 'slow';
const RATE: Record<SpeechRate, number> = { normal: 1, slow: 0.85 };
/** Pauze na `cancel()` voordat een nieuwe zin begint (iOS-hapering). */
const AFTER_CANCEL_MS = 120;

let enabled = true;
let preferredURI: string | null = null;
let rate: SpeechRate = 'normal';
let cached: SpeechSynthesisVoice | null = null;
let pending: number | undefined;

/** Kwaliteitsscore van een stem: hoger is beter. Puur. */
export function voiceScore(v: VoiceInfo): number {
  const id = `${v.name} ${v.voiceURI}`.toLowerCase();
  let score = 0;
  if (/premium/.test(id)) score += 40;
  if (/enhanced|verbeterd|neural|natural/.test(id)) score += 30;
  if (/siri/.test(id)) score += 20;
  if (/compact/.test(id)) score -= 20;
  // Effectstemmen en de oude Eloquence-stemmen klinken robotachtig.
  if (/\b(eloquence|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/.test(id)) score -= 50;
  if (v.lang.replace('_', '-') === 'nl-NL') score += 10;
  return score;
}

/** Lokale Nederlandse stemmen, beste eerst. Puur. */
export function rankVoices<T extends VoiceInfo>(voices: readonly T[]): T[] {
  return voices
    .filter((v) => v.localService && v.lang.toLowerCase().startsWith('nl'))
    .map((v, i) => ({ v, i, s: voiceScore(v) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.v);
}

/** Kies de stem: de door een ouder gekozen stem als die er (nog) is, anders de beste. Puur. */
export function chooseVoice<T extends VoiceInfo>(voices: readonly T[], preferred: string | null): T | null {
  const ranked = rankVoices(voices);
  return ranked.find((v) => v.voiceURI === preferred) ?? ranked[0] ?? null;
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Beschikbare lokale Nederlandse stemmen, beste eerst (voor het oudergedeelte). */
export function dutchVoices(): SpeechSynthesisVoice[] {
  return canSpeak() ? rankVoices(speechSynthesis.getVoices()) : [];
}

function currentVoice(): SpeechSynthesisVoice | null {
  if (!cached) cached = chooseVoice(speechSynthesis.getVoices(), preferredURI);
  return cached;
}

// iOS laadt de stemmen soms pas later: dan opnieuw kiezen.
if (canSpeak()) {
  try {
    speechSynthesis.addEventListener('voiceschanged', () => (cached = null));
  } catch {
    /* oudere browsers */
  }
}

export function setSpeechEnabled(on: boolean): void {
  enabled = on;
  if (!on) stopSpeaking();
}

/** Instellingen van een ouder: gekozen stem (null = automatisch) en tempo. */
export function setVoicePreference(voiceURI: string | null, speechRate: SpeechRate): void {
  preferredURI = voiceURI;
  rate = speechRate;
  cached = null;
}

export function speak(text: string): void {
  if (!enabled || !canSpeak()) return;
  try {
    const v = currentVoice();
    if (!v) return;
    window.clearTimeout(pending);
    const busy = speechSynthesis.speaking || speechSynthesis.pending;
    if (busy) speechSynthesis.cancel();
    const say = () => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v;
      u.lang = v.lang;
      u.rate = RATE[rate];
      u.pitch = 1;
      speechSynthesis.speak(u);
    };
    if (busy) pending = window.setTimeout(say, AFTER_CANCEL_MS);
    else say();
  } catch {
    /* spraak is optioneel */
  }
}

export function stopSpeaking(): void {
  if (!canSpeak()) return;
  window.clearTimeout(pending);
  speechSynthesis.cancel();
}
