import { describe, expect, it } from 'vitest';
import { chooseVoice, rankVoices, voiceScore, type VoiceInfo } from '../src/presentation/speech';
import { parseSettings } from '../src/state/settings';

const v = (name: string, lang: string, voiceURI = `com.apple.voice.${name}`, localService = true): VoiceInfo => ({ name, lang, voiceURI, localService });

// Zoals iPadOS ze (ongeveer) aanbiedt.
const IPAD: VoiceInfo[] = [
  v('Flo', 'nl-NL', 'com.apple.eloquence.nl-NL.Flo'),
  v('Ellen', 'nl-BE', 'com.apple.voice.compact.nl-BE.Ellen'),
  v('Xander', 'nl-NL', 'com.apple.voice.compact.nl-NL.Xander'),
  v('Claire (Verbeterd)', 'nl-NL', 'com.apple.voice.enhanced.nl-NL.Claire'),
  v('Samantha', 'en-US', 'com.apple.voice.compact.en-US.Samantha'),
  v('Google Nederlands', 'nl-NL', 'Google Nederlands', false),
];

describe('voorleesstem kiezen', () => {
  it('beste lokale Nederlandse stem eerst: verbeterd > compact nl-NL > compact nl-BE > effectstem', () => {
    expect(rankVoices(IPAD).map((x) => x.name)).toEqual(['Claire (Verbeterd)', 'Xander', 'Ellen', 'Flo']);
  });

  it('nooit een netwerkstem of een niet-Nederlandse stem', () => {
    const names = rankVoices(IPAD).map((x) => x.name);
    expect(names).not.toContain('Google Nederlands');
    expect(names).not.toContain('Samantha');
  });

  it('premium gaat boven verbeterd; "Floor" telt niet als effectstem "Flo"', () => {
    expect(voiceScore(v('Xander (Premium)', 'nl-NL', 'com.apple.voice.premium.nl-NL.Xander'))).toBeGreaterThan(voiceScore(IPAD[3]));
    expect(voiceScore(v('Floor', 'nl-NL'))).toBeGreaterThan(voiceScore(IPAD[0]));
  });

  it('de stem van een ouder gaat voor, zolang die er nog is', () => {
    expect(chooseVoice(IPAD, 'com.apple.voice.compact.nl-BE.Ellen')?.name).toBe('Ellen');
    expect(chooseVoice(IPAD, 'verdwenen-stem')?.name).toBe('Claire (Verbeterd)');
    expect(chooseVoice(IPAD, null)?.name).toBe('Claire (Verbeterd)');
    expect(chooseVoice([IPAD[4], IPAD[5]], null)).toBeNull(); // geen lokale NL-stem → stil
  });

  it('instellingen voor stem en tempo worden veilig ingelezen', () => {
    expect(parseSettings({ voiceURI: 'x', speechRate: 'slow' })).toMatchObject({ voiceURI: 'x', speechRate: 'slow' });
    expect(parseSettings({ voiceURI: 42, speechRate: 'turbo' })).toMatchObject({ voiceURI: null, speechRate: 'normal' });
    expect(parseSettings({ voiceURI: '' }).voiceURI).toBeNull();
  });
});
