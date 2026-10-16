/**
 * Voorlezen met de ingebouwde spraak van het apparaat (Web Speech API).
 * Alleen stemmen die lokaal op het apparaat draaien (`localService`) worden
 * gebruikt, zodat er nooit tekst naar een server gaat en het offline werkt.
 * Zonder lokale Nederlandse stem blijft de app stil; alles is ook zonder
 * geluid te begrijpen. Op iOS mag spraak pas na een eerste tik.
 */
let voice: SpeechSynthesisVoice | null = null;
let enabled = true;

function dutchLocalVoice(): SpeechSynthesisVoice | null {
  if (voice) return voice;
  const local = speechSynthesis.getVoices().filter((v) => v.localService);
  voice = local.find((v) => v.lang.replace('_', '-') === 'nl-NL') ?? local.find((v) => v.lang.startsWith('nl')) ?? null;
  return voice;
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function setSpeechEnabled(on: boolean): void {
  enabled = on;
  if (!on) stopSpeaking();
}

export function speak(text: string): void {
  if (!enabled || !canSpeak()) return;
  try {
    const v = dutchLocalVoice();
    if (!v) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v;
    u.lang = v.lang;
    u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch {
    /* spraak is optioneel */
  }
}

export function stopSpeaking(): void {
  if (canSpeak()) speechSynthesis.cancel();
}
