/**
 * Voorlezen met de ingebouwde spraak van het apparaat (Web Speech API, geen
 * netwerk). Werkt alleen als er een Nederlandse stem is; anders stil.
 * Op iOS mag spraak pas na een eerste tik van de gebruiker.
 */
let voice: SpeechSynthesisVoice | null | undefined;

function dutchVoice(): SpeechSynthesisVoice | null {
  if (voice !== undefined && voice !== null) return voice;
  const voices = speechSynthesis.getVoices();
  voice = voices.find((v) => v.lang === 'nl-NL') ?? voices.find((v) => v.lang.startsWith('nl')) ?? null;
  return voice;
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string): void {
  if (!canSpeak()) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'nl-NL';
    u.rate = 0.9;
    const v = dutchVoice();
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch {
    /* spraak is optioneel */
  }
}

export function stopSpeaking(): void {
  if (canSpeak()) speechSynthesis.cancel();
}
