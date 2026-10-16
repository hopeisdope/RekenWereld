// Touchtest: aanraken, echt slepen, verkeerd loslaten, dubbel tikken, draaien van de
// iPad, hervatten van een missie en "Beperk beweging".
//
//   npm run preview:pages            (in een tweede terminal)
//   node e2e/touch.cjs
const h = require('./helpers.cjs');
const { sleep, tap } = h;

(async () => {
  const r = h.reporter();
  const { browser, page, errors } = await h.launch();
  try {
    await tap(page, '.play-button');
    await tap(page, '.mission-tile.suggested');

    // --- Dubbel tikken op het goede antwoord telt één keer ---
    let doubleTap = null;
    let resumeIndex = null;
    await h.playMission(page, 'touch-voetstappen', async (p, idx) => {
      if (doubleTap === null && (await h.interactionKind(p)) === 'choice') {
        const ans = (await h.visualAnswer(p))[0];
        const before = await h.doneCount(p);
        const sel = `.answers [data-value="${ans}"]`;
        await p.locator(sel).dblclick({ force: true });
        await p.locator(sel).tap({ force: true }).catch(() => {});
        await sleep(2200);
        doubleTap = { before, after: await h.doneCount(p), idxAfter: await h.nowIndex(p), idx };
      }
      // --- Hervatten: na 3 opdrachten stoppen en terugkomen ---
      if (idx === 3 && resumeIndex === null) {
        await tap(p, '.topbar .icon-button'); // 🏠
        await p.waitForSelector('.mission-tile');
        await tap(p, '.mission-tile[data-mission="voetstappen"]');
        await h.waitReady(p);
        const afterHome = await h.nowIndex(p);
        await p.reload();
        await tap(p, '.play-button');
        await tap(p, '.mission-tile[data-mission="voetstappen"]');
        await h.waitReady(p);
        resumeIndex = { afterHome, afterReload: await h.nowIndex(p) };
      }
    });
    r.step(1, `Dubbel tikken telt één keer (klaar ${doubleTap?.before} → ${doubleTap?.after}, opdracht ${doubleTap?.idx} → ${doubleTap?.idxAfter})`, doubleTap && doubleTap.after === doubleTap.before + 1 && doubleTap.idxAfter === doubleTap.idx + 1);
    r.step(2, `Hervatten na 🏠 (${resumeIndex?.afterHome}) en na herladen van de app (${resumeIndex?.afterReload}) bij opdracht 3`, resumeIndex && resumeIndex.afterHome === 3 && resumeIndex.afterReload === 3);

    // --- Slepen in de appelmand ---
    await tap(page, '.result .play-button.next');
    await tap(page, '.mission-tile[data-mission="appelmand"]');
    let drag = null;
    await h.playMission(page, 'touch-appelmand', async (p) => {
      if (drag !== null || (await h.interactionKind(p)) !== 'drag') return;
      const count = () => p.evaluate(() => ({ placed: document.querySelectorAll('.slot.placed').length, tray: document.querySelectorAll('.tray .drag-item').length }));
      const start = await count();
      await h.dragItem(p); // echt slepen naar de mand
      const afterDrop = await count();
      await h.dragItem(p, { miss: true }); // naast de mand loslaten
      const afterMiss = await count();
      const shook = await p.evaluate(() => !!document.querySelector('.tray .drag-item.shake'));
      await tap(p, '.slot.placed'); // tik op gelegd voorwerp = terug
      await sleep(200);
      const afterTakeBack = await count();
      await tap(p, '.tray .drag-item'); // tikken als alternatief voor slepen
      await sleep(200);
      const afterTap = await count();
      await p.screenshot({ path: `${h.SP}/touch-drag.png` });
      drag = { start, afterDrop, afterMiss, shook, afterTakeBack, afterTap };
    });
    const d = drag;
    r.step(3, 'Echt slepen naar de mand legt het voorwerp in een vakje', d && d.afterDrop.placed === d.start.placed + 1 && d.afterDrop.tray === d.start.tray - 1);
    r.step(4, 'Naast de mand loslaten: voorwerp gaat terug naar de voorraad en schudt', d && d.afterMiss.placed === d.afterDrop.placed && d.afterMiss.tray === d.afterDrop.tray && d.shook);
    r.step(5, 'Tik op gelegd voorwerp haalt het terug; tik op voorwerp legt het (zonder slepen)', d && d.afterTakeBack.placed === d.afterMiss.placed - 1 && d.afterTap.placed === d.afterTakeBack.placed + 1);

    // --- Getallenlijn: stappen aantikken, dubbel ✔, draaien ---
    await tap(page, '.result .play-button.next');
    await tap(page, '.mission-tile[data-mission="rivier"]');
    let line = null;
    await h.playMission(page, 'touch-rivier', async (p, idx) => {
      if (line !== null || (await h.interactionKind(p)) !== 'numberline') return;
      const target = (await h.visualAnswer(p))[0];
      const start = await p.evaluate(() => Number(document.querySelector('.stone.start').dataset.value));
      // Eén tik = één sprong, zichtbaar met genummerde boogjes.
      await tap(p, '.hop-button.forward');
      await sleep(300);
      const oneHop = await p.evaluate(() => ({ here: Number(document.querySelector('.stone.here').dataset.value), arcs: document.querySelectorAll('.arc').length }));
      await tap(p, '.hop-button.back');
      await sleep(300);
      // Draaien naar liggend en terug, midden in de opdracht.
      await p.setViewportSize({ width: 1133, height: 744 });
      await sleep(500);
      const land = await p.evaluate(() => {
        const river = document.querySelector('.river').getBoundingClientRect();
        const frog = document.querySelector('.frog').getBoundingClientRect();
        const buttons = [...document.querySelectorAll('.hop-button')].map((b) => b.getBoundingClientRect());
        return {
          frogInside: frog.left >= river.left - 5 && frog.right <= river.right + 5,
          buttonsVisible: buttons.every((b) => b.bottom <= innerHeight + 1 || document.querySelector('#ui').scrollHeight > innerHeight),
          noOverflowX: document.querySelector('#ui').scrollWidth <= innerWidth,
        };
      });
      await p.screenshot({ path: `${h.SP}/touch-rotated.png` });
      await p.setViewportSize({ width: 744, height: 1133 });
      await sleep(400);
      // Naar het antwoord springen en ✔ dubbel tikken.
      for (let i = 0; i < 25; i++) {
        const here = await p.evaluate(() => Number(document.querySelector('.stone.here').dataset.value));
        if (here === target) break;
        await tap(p, here < target ? '.hop-button.forward' : '.hop-button.back');
        await sleep(40);
      }
      const before = await h.doneCount(p);
      await p.locator('.hop-button.confirm').dblclick({ force: true });
      await sleep(2200);
      line = { start, oneHop, land, before, after: await h.doneCount(p), idx, idxAfter: await h.nowIndex(p) };
    });
    r.step(6, `Eén tik op ➡️ = één sprong met genummerd boogje (${line?.oneHop.arcs} boog)`, line && line.oneHop.here === line.start + 1 && line.oneHop.arcs === 1);
    r.step(7, 'Draaien naar liggend: kikker blijft op de rivier, knoppen bereikbaar, geen zijwaarts scrollen', line && line.land.frogInside && line.land.buttonsVisible && line.land.noOverflowX);
    r.step(8, 'Dubbel tikken op ✔ telt één keer', line && line.after === line.before + 1 && line.idxAfter === line.idx + 1);

    r.step(9, `Geen JS-fouten (${errors.length})`, errors.length === 0);
  } catch (e) {
    r.step('!', `Afgebroken: ${e.message.split('\n')[0]}`, false);
    await page.screenshot({ path: `${h.SP}/touch-error.png` });
  } finally {
    await browser.close();
  }

  // --- Beperk beweging + liggend iPad: rivier en appelmand helemaal uitspelen ---
  const rm = await h.launch({ width: 1180, height: 820 }, { reducedMotion: 'reduce' });
  try {
    await tap(rm.page, '.play-button');
    for (const id of ['voetstappen', 'appelmand', 'rivier']) {
      await tap(rm.page, `.mission-tile[data-mission="${id}"]`);
      await h.playMission(rm.page, `rm-${id}`);
      await tap(rm.page, '.result .play-button.next');
      await rm.page.waitForSelector('.mission-tile');
    }
    const anims = await rm.page.evaluate(() => getComputedStyle(document.querySelector('.play-button, .mission-tile.suggested') ?? document.body).animationName);
    r.step(10, `Beperk beweging, liggend 1180×820: alle drie missies speelbaar; animaties uit (${anims})`, rm.errors.length === 0 && (anims === 'none' || anims === ''));
  } catch (e) {
    r.step(10, `Beperk beweging: afgebroken: ${e.message.split('\n')[0]}`, false);
  } finally {
    await rm.browser.close();
  }
  r.print();
})();
