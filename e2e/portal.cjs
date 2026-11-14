// Thuisknop naar de spelletjesportal (root van de origin). Leest geen tekst: de knop
// wordt gevonden via [data-portal] en moet zonder tekst te begrijpen zijn (SVG-huisje).
//
//   npm run preview:pages            (in een tweede terminal)
//   node e2e/portal.cjs
const h = require('./helpers.cjs');
const { tap } = h;

(async () => {
  const r = h.reporter();
  const { browser, page, errors, foreign } = await h.launch();
  const origin = new URL(h.APP_URL).origin;
  try {
    const onStart = await page.locator('[data-portal]').count();
    await tap(page, '.play-button');
    await page.waitForSelector('.map');
    const btn = await page.evaluate(() => {
      const b = document.querySelector('.map-screen .topbar [data-portal]');
      if (!b) return null;
      const box = b.getBoundingClientRect();
      return { w: box.width, h: box.height, svg: !!b.querySelector('svg'), emojiOrText: b.textContent.trim(), label: b.getAttribute('aria-label') || '', isIconButton: b.classList.contains('icon-button') };
    });
    r.step(1, `Op de kaart: SVG-huisje ${btn && `${btn.w}×${btn.h}`} px, zonder tekst, met aria-label; niet op het startscherm (${onStart})`,
      btn && btn.w >= 88 && btn.h >= 88 && btn.svg && btn.emojiOrText === '' && btn.label.length > 0 && !btn.isIconButton && onStart === 0);
    await page.screenshot({ path: `${h.SP}/portal-map.png` });

    // Midden in een opdracht is er geen portalknop.
    await tap(page, '.mission-tile.suggested');
    await h.waitReady(page);
    const inMission = await page.locator('[data-portal]').count();
    await h.playMission(page, 'portal-voetstappen');
    await tap(page, '.result .play-button.next');
    await page.waitForSelector('.map');
    // Een nieuwe, onderbroken ronde: zo is er lopende voortgang om te bewaren.
    await tap(page, '.mission-tile[data-mission="voetstappen"]');
    await h.waitReady(page);
    await h.solveCurrent(page);
    await tap(page, '.topbar .icon-button');
    await page.waitForSelector('.map');
    r.step(2, `Geen portalknop midden in een opdracht (${inMission})`, inMission === 0);

    // Opslag wissen vlak voor de tik: alles wat er na het weggaan staat, is door de knop bewaard.
    const expected = await page.evaluate(() => JSON.parse(localStorage.getItem('rekenwereld:v1')));
    await page.evaluate(() => localStorage.removeItem('rekenwereld:v1'));
    await page.route(`${origin}/`, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>portal</title>' }));
    await tap(page, '[data-portal]');
    await page.waitForURL(`${origin}/`, { timeout: 5000 });
    const landed = page.url();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rekenwereld:v1')));
    r.step(3, `Tik gaat naar de root van de origin (${landed})`, landed === `${origin}/`);
    r.step(4, `Voortgang bewaard vóór het weggaan (sterren ${saved?.progress?.voetstappen?.stars ?? '-'}, hervatten bij ronde ${saved?.resume?.round ?? '-'})`,
      !!saved && JSON.stringify(saved.progress) === JSON.stringify(expected.progress) && JSON.stringify(saved.resume) === JSON.stringify(expected.resume) && !!saved.resume);

    // Beperk beweging: meteen weg, zonder indruk-animatie.
    await page.goto(h.APP_URL);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await tap(page, '.play-button');
    await page.waitForSelector('.map');
    const t0 = Date.now();
    await tap(page, '[data-portal]');
    await page.waitForURL(`${origin}/`, { timeout: 5000 });
    r.step(5, `Met "Beperk beweging" ook naar de portal (${Date.now() - t0} ms)`, page.url() === `${origin}/`);
    r.step(6, `Geen JS-fouten (${errors.length}), geen externe verzoeken (${foreign.length})`, errors.length === 0 && foreign.length === 0);
  } catch (e) {
    r.step('!', `Afgebroken: ${e.message.split('\n')[0]}`, false);
  } finally {
    await browser.close();
  }
  r.print();
})();
