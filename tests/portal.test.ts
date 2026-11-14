import { describe, expect, it } from 'vitest';
import { goToPortal, portalUrl } from '../src/presentation/portal';

describe('portal (thuisknop)', () => {
  it('wijst naar de root van de origin, niet naar /RekenWereld/', () => {
    expect(portalUrl('https://hopeisdope.github.io')).toBe('https://hopeisdope.github.io/');
    expect(portalUrl('http://localhost:4173')).toBe('http://localhost:4173/');
  });

  it('navigeert met location.assign(origin + "/")', () => {
    const calls: string[] = [];
    goToPortal({ origin: 'https://hopeisdope.github.io', assign: (url: string | URL) => calls.push(String(url)) });
    expect(calls).toEqual(['https://hopeisdope.github.io/']);
  });
});
