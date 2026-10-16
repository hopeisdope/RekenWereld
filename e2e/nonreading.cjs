// Acceptatietest fase 1.5: de volledige flow zonder ooit tekst (.caption, titels) te lezen.
// Antwoorden worden alleen afgeleid uit wat er te zien is (plaatjes, bordje, pijl/bogen)
// of uit de wijzende hand. Zie README → "Acceptatietest zonder lezen".
//
//   npm run preview:pages            (in een tweede terminal)
//   node e2e/nonreading.cjs          (vereist Playwright: npx playwright of globaal)
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require(process.env.PW || 'playwright');
const URL = process.env.BASE_URL || 'http://localhost:4173/RekenWereld/';
const SP = process.env.SP || path.join(__dirname, 'output');
fs.mkdirSync(SP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const step = (n, msg, ok = true) => { log.push(`${ok ? '✅' : '❌'} ${n}. ${msg}`); if (!ok) process.exitCode = 1; };

/** Leid het antwoord af uit de beelden, niet uit tekst. */
async function visualAnswer(page) {
  return page.evaluate(() => {
    const v = document.querySelector('.visual');
    if (v.querySelector('.count-scene')) return v.querySelectorAll('.count-scene .item').length;
    if (v.querySelector('.sign')) return Number(v.querySelector('.sign').textContent);
    if (v.querySelector('.basket')) return v.querySelectorAll('.basket .item').length;
    if (v.querySelector('.jump-card')) {
      const start = Number(document.querySelector('.stone.start').dataset.value);
      const hops = v.querySelectorAll('.hop-arc').length;
      return v.querySelector('.jump-card.back') ? start - hops : start + hops;
    }
    return null;
  });
}
const mode = (page) => page.evaluate(() => (document.querySelector('.mission-card-body')?.className.match(/mode-(\S+)/) || [])[1]);
const pointed = (page) => page.evaluate(() => document.querySelector('.pointer-hand')?.parentElement?.dataset.value ?? null);
const tapValue = (page, v) => page.locator(`.answers button[data-value="${v}"]`).tap({ force: true });
const nowIndex = (page) => page.evaluate(() => [...document.querySelectorAll('.dot')].findIndex((d) => d.classList.contains('now')));

/** Wacht tot een voorbeeld klaar is: kijken → zelf proberen (via de hand) → terug naar de missie. */
async function doDemo(page, tag) {
  const p = await pointed(page);
  const watchOk = (await mode(page)) === 'demo-watch' && p !== null;
  await page.screenshot({ path: `${SP}/nr-${tag}-demo-watch.png` });
  await page.waitForFunction(() => document.querySelector('.mode-demo-try'), null, { timeout: 6000 });
  const noHandYet = (await pointed(page)) === null;
  await sleep(5300); // kind doet niets → hand verschijnt
  const idleHand = await pointed(page);
  await page.screenshot({ path: `${SP}/nr-${tag}-demo-try.png` });
  await tapValue(page, idleHand);
  await page.waitForFunction(() => document.querySelector('.mode-task'), null, { timeout: 4000 });
  return watchOk && noHandYet && idleHand !== null;
}

/** Speel de geopende missie uit; optioneel eerst een fout bij de eerste echte opdracht. */
async function playMission(page, tag, { makeMistakes = false, mistakesOnJump = false } = {}) {
  const demos = [];
  let mistakeChecked = null, jumpPointerChecked = null;
  for (;;) {
    await sleep(150);
    if (await page.locator('.result').count()) break;
    const m = await mode(page);
    if (m === 'demo-watch') { demos.push(await doDemo(page, `${tag}-${demos.length}`)); continue; }
    if (m !== 'task') continue;
    if (await page.locator('.feedback.good').count()) continue; // aan het vieren
    await sleep(420); // invoerbeveiliging
    const idx = await nowIndex(page);
    const ans = await visualAnswer(page);
    if (makeMistakes && mistakeChecked === null) {
      const wrong = await page.evaluate((a) => [...document.querySelectorAll('.answers button:not([disabled])')].map((b) => Number(b.dataset.value)).find((v) => v !== a), ans);
      await tapValue(page, wrong);
      await sleep(150);
      const st = await page.evaluate((w) => ({
        disabled: document.querySelector(`.answers button[data-value="${w}"]`).disabled,
        hintVisual: !!document.querySelector('.item-number, .stone.path, .items.dots'),
        think: !!document.querySelector('.mascot.think'),
        sameTask: true,
      }), wrong);
      mistakeChecked = st.disabled && st.hintVisual && st.think && (await nowIndex(page)) === idx;
      await page.screenshot({ path: `${SP}/nr-${tag}-mistake.png` });
    }
    if (mistakesOnJump && jumpPointerChecked === null && (await page.locator('.river').count())) {
      const wrongs = await page.evaluate((a) => [...document.querySelectorAll('.stone:not([disabled])')].map((b) => Number(b.dataset.value)).filter((v) => v !== a).slice(0, 2), ans);
      for (const w of wrongs) { await tapValue(page, w); await sleep(120); }
      jumpPointerChecked = Number(await pointed(page)) === ans;
      await page.screenshot({ path: `${SP}/nr-${tag}-jump-pointer.png` });
    }
    await tapValue(page, ans);
    await sleep(100);
    if (!(await page.locator('.feedback.good').count())) throw new Error(`antwoord ${ans} niet goed in ${tag} opdracht ${idx}`);
  }
  return { demos, mistakeChecked, jumpPointerChecked };
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 744, height: 1133 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [], foreign = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith(new globalThis.URL(URL).origin)) foreign.push(r.url()); });

  // 1. App openen
  await page.goto(URL);
  await page.screenshot({ path: `${SP}/nr-1-start.png` });
  const startOk = await page.evaluate(() => {
    const play = document.querySelector('.play-button');
    const r = play.getBoundingClientRect();
    const others = [...document.querySelectorAll('button')].filter((b) => b !== play);
    return !!document.querySelector('.point-right') && r.width >= 150 && others.every((b) => b.getBoundingClientRect().width < r.width / 2);
  });
  step(1, 'Startscherm: één grote speelknop, mascotte wijst ernaar, overige knoppen klein', startOk);

  // 2. Spel starten
  await page.locator('.play-button').tap({ force: true });
  await page.waitForSelector('.mission-grid');
  await page.screenshot({ path: `${SP}/nr-2-select.png` });
  const sug = await page.evaluate(() => document.querySelector('.mission-tile.suggested')?.dataset.mission);
  const hasHand = await page.locator('.mission-tile.suggested .point-down').count();
  const starsLook = await page.evaluate(() => [...document.querySelectorAll('.mission-tile .star')].map((s) => Number(getComputedStyle(s).opacity)));
  step(2, `Missiekeuze: plaatjes; hand wijst eerste missie aan (${sug}); lege sterren vaag (${Math.max(...starsLook)})`, sug === 'voetstappen' && hasHand === 1 && starsLook.every((o) => o < 0.5));

  // 3. Missie herkennen en starten (één tik)
  await page.locator('.mission-tile.suggested').tap({ force: true });
  await page.waitForSelector('.mission-card-body');
  step(3, 'Eén tik op het plaatje start de missie direct', true);

  // 4–8. Voorbeeld, oplossen, fout herstellen, volgende opdracht, afronden
  const r1 = await playMission(page, 'voetstappen', { makeMistakes: true });
  step(4, `Nieuwe interactie via voorbeeld: kijken → zelf proberen (hand na 5 s): ${r1.demos.length} voorbeelden (tellen + getal zoeken)`, r1.demos.length === 2 && r1.demos.every(Boolean));
  step(5, 'Opdrachten opgelost met alleen beeldinformatie (antwoord afgeleid uit plaatjes)', true);
  step(6, 'Fout: knop grijs, uil kantelt, visuele hint, zelfde opdracht blijft', r1.mistakeChecked === true);
  step(7, 'Volgende opdracht bereikt (voortgangsstippen)', true);
  await page.screenshot({ path: `${SP}/nr-8-result.png` });
  const resOk = await page.evaluate(() => !!document.querySelector('.result .play-button.next') && document.querySelectorAll('.result .star.on').length >= 1);
  step(8, 'Missie afgerond: beloning, sterren, grote ▶-knop', resOk);

  // 9. Andere missie kiezen
  await page.locator('.result .play-button.next').tap({ force: true });
  await page.waitForSelector('.mission-grid');
  const sug2 = await page.evaluate(() => document.querySelector('.mission-tile.suggested')?.dataset.mission);
  await page.screenshot({ path: `${SP}/nr-9-select.png` });
  const earned = await page.evaluate(() => document.querySelectorAll('.tile-voetstappen .star.on').length);
  const earnedVisible = await page.evaluate(() => Number(getComputedStyle(document.querySelector('.tile-voetstappen .star.on')).opacity));
  step(9, `Terug bij missiekeuze; ${earned} gouden ster(ren) zichtbaar bij voetstappen; hand wijst volgende missie (${sug2})`, sug2 === 'appelmand' && earned >= 1 && earnedVisible === 1);

  await page.locator('.mission-tile.suggested').tap({ force: true });
  const r2 = await playMission(page, 'appelmand');
  step('9b', 'Appelmand: voorbeeld optellen, missie uitgespeeld', r2.demos.length === 1 && r2.demos[0]);
  await page.locator('.result .play-button.next').tap({ force: true });
  await page.locator('.mission-tile.suggested').tap({ force: true });
  const r3 = await playMission(page, 'rivier', { mistakesOnJump: true });
  step('9c', 'Rivier: voorbeeld springen; na 2 fouten wijst de hand de goede steen aan', r3.demos.length === 1 && r3.demos[0] && r3.jumpPointerChecked === true);

  // Herhaling: geen uitleg meer, maar hulpknop werkt
  await page.locator('.result .play-button.next').tap({ force: true });
  await page.locator('.mission-tile[data-mission="appelmand"]').tap({ force: true });
  await sleep(300);
  const noDemo = (await mode(page)) === 'task';
  await sleep(300);
  await page.locator('.help').tap({ force: true });
  await sleep(200);
  const helpDemo = (await mode(page)) === 'demo-watch';
  step(10, 'Bekende interactie: geen herhaalde uitleg; ❓ speelt voorbeeld opnieuw af', noDemo && helpDemo);
  await page.locator('.topbar .icon-button').first().tap({ force: true });
  await page.waitForSelector('.mission-grid');
  step(11, '🏠 stopt direct en gaat terug naar de missiekeuze', true);

  // Mascotte-ruimte en layout
  const overflowX = await page.evaluate(() => document.querySelector('#ui').scrollWidth > innerWidth);
  step(12, `Geen horizontale scroll, geen JS-fouten (${errors.length}), geen externe verzoeken (${foreign.length})`, !overflowX && !errors.length && !foreign.length);

  console.log(log.join('\n'));
  await browser.close();
})().catch((e) => { console.log(log.join('\n')); console.error(e); process.exit(1); });
