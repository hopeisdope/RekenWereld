// Acceptatietest: de volledige flow zonder ooit uitlegtekst te lezen. Antwoorden komen
// alleen uit wat er te zien is (voorwerpen, bordjes, getallen, sommen) of uit de hand.
//
//   npm run preview:pages            (in een tweede terminal)
//   node e2e/nonreading.cjs          (vereist Playwright met Chromium)
const h = require('./helpers.cjs');
const { sleep, tap } = h;

(async () => {
  const r = h.reporter();
  const { browser, page, errors, foreign } = await h.launch();
  try {
    // 1. App openen
    await page.screenshot({ path: `${h.SP}/nr-1-start.png` });
    const startOk = await page.evaluate(() => {
      const play = document.querySelector('.play-button');
      const rect = play.getBoundingClientRect();
      const others = [...document.querySelectorAll('button')].filter((b) => b !== play);
      return !!document.querySelector('.point-right') && rect.width >= 150 && others.every((b) => b.getBoundingClientRect().width < rect.width / 2);
    });
    r.step(1, 'Startscherm: één grote speelknop, mascotte wijst ernaar, overige knoppen klein', startOk);

    // 2. Spel starten
    await tap(page, '.play-button');
    await page.waitForSelector('.mission-tile');
    await page.screenshot({ path: `${h.SP}/nr-2-select.png` });
    const sug = await page.evaluate(() => document.querySelector('.mission-tile.suggested')?.dataset.mission);
    const starsDim = await page.evaluate(() => [...document.querySelectorAll('.mission-tile .star')].every((s) => Number(getComputedStyle(s).opacity) < 0.5));
    r.step(2, `Wereldkaart met grote iconen; eerste missie aangewezen (${sug}); lege sterren vaag`, sug === 'voetstappen' && starsDim);
    const statuses = await page.evaluate(() => [...document.querySelectorAll('.mission-tile')].map((n) => n.dataset.status).join(','));
    await tap(page, '.mission-tile[data-mission="rivier"]');
    await sleep(300);
    const stayed = await page.evaluate(() => !!document.querySelector('.map') && document.querySelector('[data-mission="rivier"]').classList.contains('nope'));
    r.step('2b', `Statussen: ${statuses}; tik op dichte missie: slotje schudt, geen missie gestart`, statuses === 'available,locked,locked' && stayed);

    // 3. Missie herkennen en starten
    await tap(page, '.mission-tile.suggested');
    await page.waitForSelector('.mission-card-body');
    r.step(3, 'Eén tik op het plaatje start de missie direct');

    // 4–8. Voorbeeld, oplossen, fout herstellen, volgende opdracht, afronden
    let mistake = null;
    const r1 = await h.playMission(page, 'nr-voetstappen', async (p, idx) => {
      if (mistake !== null) return;
      const ans = (await h.visualAnswer(p))[0];
      const wrong = await p.evaluate((a) => [...document.querySelectorAll('.answers .choice:not([disabled])')].map((b) => Number(b.dataset.value)).find((v) => v !== a), ans);
      await h.tapValue(p, wrong);
      await sleep(200);
      mistake = await p.evaluate((w) => ({
        disabled: document.querySelector(`.answers [data-value="${w}"]`).disabled,
        hint: !!document.querySelector('.item-number, .items.dots'),
        think: !!document.querySelector('.mission-owl.pose-think'),
      }), wrong);
      mistake.sameTask = (await h.nowIndex(p)) === idx;
      await p.screenshot({ path: `${h.SP}/nr-6-mistake.png` });
    });
    r.step(4, `Nieuwe interactie via voorbeeld (kijken → zelf, hand na 5 s): ${r1.demos.length} voorbeelden`, r1.demos.length === 2 && r1.demos.every(Boolean));
    r.step(5, 'Opdrachten opgelost met alleen beeldinformatie');
    r.step(6, 'Fout: knop grijs, uil kantelt, visuele hint, zelfde opdracht blijft', mistake && mistake.disabled && mistake.hint && mistake.think && mistake.sameTask);
    r.step(7, 'Volgende opdracht bereikt (voortgangsstippen)');
    await page.screenshot({ path: `${h.SP}/nr-8-result.png` });
    const endOk = await page.evaluate(() => ({
      next: !!document.querySelector('.result .play-button.next'),
      reward: !!document.querySelector('.reward.new'),
      freshStar: !!document.querySelector('.result .star.on.fresh'),
      unlocked: !!document.querySelector('.result .unlocked'),
    }));
    r.step(8, `Missie afgerond: nieuw dier, nieuwe ster, nieuwe missie open, grote ▶ (${JSON.stringify(endOk)})`, Object.values(endOk).every(Boolean));

    // 9. Andere missie kiezen
    await tap(page, '.result .play-button.next');
    await page.waitForSelector('.mission-tile');
    const sug2 = await page.evaluate(() => document.querySelector('.mission-tile.suggested')?.dataset.mission);
    const world1 = await page.evaluate(() => ({
      unlocking: document.querySelector('[data-mission="appelmand"]').classList.contains('unlocking'),
      statuses: [...document.querySelectorAll('.mission-tile')].map((n) => n.dataset.status).join(','),
      found: document.querySelectorAll('.collection .animal.found').length,
    }));
    await page.screenshot({ path: `${h.SP}/nr-9-map.png` });
    r.step(9, `Terug op de kaart; volgende missie aangewezen (${sug2}); ontgrendel-animatie; ${world1.statuses}; ${world1.found} dier`, sug2 === 'appelmand' && world1.unlocking && world1.statuses === 'inProgress,available,locked' && world1.found === 1);

    await tap(page, '.mission-tile.suggested');
    const r2 = await h.playMission(page, 'nr-appelmand');
    r.step('9b', `Appelmand: voorbeelden slepen en optellen (${r2.demos.length}), uitgespeeld`, r2.demos.length === 2 && r2.demos.every(Boolean));

    await tap(page, '.result .play-button.next');
    await tap(page, '.mission-tile.suggested');
    let jumpHand = null;
    const r3 = await h.playMission(page, 'nr-rivier', async (p) => {
      if (jumpHand !== null || (await h.interactionKind(p)) !== 'numberline') return;
      const ans = (await h.visualAnswer(p))[0];
      const wrongs = await p.evaluate((a) => [...document.querySelectorAll('.stone:not(.start)')].map((s) => Number(s.dataset.value)).filter((v) => v !== a).slice(0, 2), ans);
      for (const w of wrongs) {
        await h.hopTo(p, w, { viaStone: true });
        await sleep(900); // kikker springt terug
      }
      jumpHand = await p.evaluate(() => document.querySelector('[data-pointed]')?.classList.contains('hop-button') ?? false);
      await p.screenshot({ path: `${h.SP}/nr-9c-jump-hand.png` });
    });
    r.step('9c', 'Rivier: voorbeeld springen; na 2 fouten wijst de hand de volgende sprong aan', r3.demos.length === 1 && r3.demos[0] && jumpHand === true);

    // Alle overige rondes
    const allKinds = new Set([...r1.kinds, ...r2.kinds, ...r3.kinds]);
    for (const id of ['voetstappen', 'appelmand', 'rivier']) {
      for (let round = 2; round <= 3; round++) {
        await tap(page, '.result .play-button.next');
        await page.waitForSelector('.mission-tile');
        await tap(page, `.mission-tile[data-mission="${id}"]`);
        const res = await h.playMission(page, `nr-${id}-r${round}`);
        res.kinds.forEach((k) => allKinds.add(k));
      }
    }
    const expected = ['add', 'build', 'compare', 'count', 'jump', 'makeTen', 'missing', 'order', 'recognize', 'split', 'subtract'];
    r.step(10, `Alle 9 rondes uitgespeeld; soorten: ${[...allKinds].sort().join(', ')}`, expected.every((k) => allKinds.has(k)));
    await tap(page, '.result .play-button.next');
    await page.waitForSelector('.mission-tile');
    const allStars = await page.evaluate(() => document.querySelectorAll('.mission-tile .star.on').length);
    const world2 = await page.evaluate(() => ({
      statuses: [...document.querySelectorAll('.mission-tile')].map((n) => n.dataset.status).join(','),
      found: document.querySelectorAll('.collection .animal.found').length,
    }));
    await page.screenshot({ path: `${h.SP}/nr-11-map-complete.png` });
    r.step(11, `Alles voltooid: ${allStars}/9 sterren, ${world2.found}/9 dieren, ${world2.statuses}`, allStars === 9 && world2.found === 9 && world2.statuses === 'completed,completed,completed');

    // Bekende interactie: geen uitleg meer, wel via de hulpknop
    await tap(page, '.mission-tile[data-mission="appelmand"]');
    await sleep(500);
    const noDemo = (await h.mode(page)) === 'task';
    await sleep(300);
    await tap(page, '.help');
    await sleep(200);
    r.step(12, 'Bekende interactie: geen herhaalde uitleg; ❓ speelt voorbeeld opnieuw af', noDemo && (await h.mode(page)) === 'demo-watch');
    await tap(page, '.topbar .icon-button');
    await page.waitForSelector('.mission-tile');
    r.step(13, '🏠 stopt direct en gaat terug naar de wereldkaart');

    const overflowX = await page.evaluate(() => document.querySelector('#ui').scrollWidth > innerWidth);
    r.step(14, `Geen horizontale scroll, geen JS-fouten (${errors.length}), geen externe verzoeken (${foreign.length})`, !overflowX && !errors.length && !foreign.length);
  } catch (e) {
    r.step('!', `Afgebroken: ${e.message.split('\n')[0]}`, false);
    await page.screenshot({ path: `${h.SP}/nr-error.png` });
  } finally {
    r.print();
    if (errors.length) console.log('JS-fouten:', errors);
    await browser.close();
  }
})();
