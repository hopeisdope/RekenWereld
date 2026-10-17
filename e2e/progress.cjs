// Fase 5: voortgang, adaptiviteit en oudergedeelte in de echte app.
//
//   npm run preview:pages            (in een tweede terminal)
//   node e2e/progress.cjs
const h = require('./helpers.cjs');
const { sleep, tap } = h;

/** Ouderpoort: 2 s ingedrukt houden, dan de keersom (het oudergedeelte mag wel tekst lezen). */
async function openParents(page, { wrongAnswer = false } = {}) {
  await tap(page, '.parent-entry');
  const box = await page.locator('.gate-hold').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await sleep(2300);
  await page.mouse.up();
  const q = await page.locator('.gate-question').textContent();
  const [, a, b] = q.match(/(\d+) × (\d+)/);
  const answer = Number(a) * Number(b);
  const pick = wrongAnswer
    ? await page.evaluate((ans) => [...document.querySelectorAll('.gate-answer')].map((x) => Number(x.dataset.value)).find((v) => v !== ans), answer)
    : answer;
  await tap(page, `.gate-answer[data-value="${pick}"]`);
  await sleep(200);
}

const skillRow = (page, skill) =>
  page.evaluate((s) => {
    const row = document.querySelector(`.skill-row[data-skill="${s}"]`);
    return { status: row.dataset.status, text: row.querySelector('.skill-meta').textContent, on: row.querySelector('.segmented .on').dataset.value };
  }, skill);

/** Maak bij keuze-opdrachten van deze soort eerst twee fouten. */
function mistakesOn(prompt, log) {
  return async (p) => {
    const kind = await p.evaluate(() => document.querySelector('.mission-card-body').className.match(/prompt-(\S+)/)[1]);
    if (kind !== prompt) return;
    const ans = (await h.visualAnswer(p))[0];
    log.push(ans);
    for (let i = 0; i < 2; i++) {
      const wrong = await p.evaluate((a) => [...document.querySelectorAll('.answers .choice:not([disabled])')].map((b) => Number(b.dataset.value)).find((v) => v !== a), ans);
      if (wrong === undefined) break;
      await h.tapValue(p, wrong);
      await sleep(250);
    }
  };
}

(async () => {
  const r = h.reporter();

  // ---------- 1. Adaptiviteit, heropenen, oudergedeelte, niveau, reset ----------
  const A = await h.launch();
  try {
    const { page, ctx } = A;
    await tap(page, '.play-button');
    await tap(page, '.mission-tile.suggested');
    const counts = [];
    await h.playMission(page, 'pr-voetstappen', mistakesOn('count', counts));
    // Ronde 1: tellen op niveau 1–5, 5–10, 5–10. Na 2 moeilijke tel-opdrachten wordt het makkelijker:
    // de derde tel-opdracht is opnieuw gemaakt op niveau 1–5.
    r.step(1, `Herhaalde fouten maken het makkelijker: tel-opdrachten ${counts.join(', ')} (laatste ≤ 5)`, counts.length === 3 && counts[2] <= 5);
    await tap(page, '.result .play-button.next');
    await page.waitForSelector('.map');

    // Heropenen na afsluiten: pagina dicht, nieuwe pagina in dezelfde browseropslag.
    await page.close();
    const page2 = await ctx.newPage();
    await page2.goto(h.APP_URL);
    await tap(page2, '.play-button');
    await page2.waitForSelector('.map');
    const reopened = await page2.evaluate(() => ({
      status: document.querySelector('[data-mission="voetstappen"]').dataset.status,
      stars: document.querySelectorAll('[data-mission="voetstappen"] .star.on').length,
      open: document.querySelector('[data-mission="appelmand"]').dataset.status,
      animals: document.querySelectorAll('.collection .animal.found').length,
    }));
    r.step(2, `Heropenen na afsluiten: ${JSON.stringify(reopened)}`, reopened.stars === 1 && reopened.open === 'available' && reopened.animals === 1);

    // Ouderpoort: fout antwoord → geen toegang.
    await tap(page2, '.topbar .icon-button'); // 🏠 naar start
    await openParents(page2, { wrongAnswer: true });
    const blocked = (await page2.locator('.parent').count()) === 0 && (await page2.locator('.play-button').count()) === 1;
    await openParents(page2);
    await page2.waitForSelector('.parent');
    await page2.screenshot({ path: `${h.SP}/pr-parents.png`, fullPage: true });
    const count = await skillRow(page2, 'count');
    const recognize = await skillRow(page2, 'recognize');
    r.step(3, `Ouderpoort: fout antwoord geweigerd, goed antwoord opent het oudergedeelte`, blocked);
    r.step(4, `Oudergedeelte toont oefening per vaardigheid: tellen "${count.text}" [${count.status}], herkennen [${recognize.status}]`, count.text.includes('3 opdrachten') && count.text.includes('makkelijker') && count.status === 'needsPractice' && recognize.status !== 'notStarted');
    const advice = await page2.locator('.advice').textContent();
    r.step('4b', `Advies voor ouders: "${advice.slice(0, 60)}…"`, advice.includes('hoeveelheden tellen'));

    // Niveau aanpassen: getallen herkennen "Makkelijker" → in ronde 2 (normaal 11–20) alleen 0–10.
    await tap(page2, '.skill-row[data-skill="recognize"] [data-value="easier"]');
    await sleep(200);
    const setOk = (await skillRow(page2, 'recognize')).on === 'easier';
    await tap(page2, '.parent-close');
    await tap(page2, '.play-button');
    await tap(page2, '.mission-tile[data-mission="voetstappen"]');
    const signs = [];
    await h.playMission(page2, 'pr-voetstappen-r2', async (p) => {
      const n = await p.evaluate(() => (document.querySelector('.visual .sign') ? Number(document.querySelector('.visual .sign').textContent) : null));
      if (n !== null) signs.push(n);
    });
    r.step(5, `Niveau aanpassen door ouder: herkennen op "Makkelijker" → getallen ${signs.join(', ')} (≤ 10 i.p.v. 11–20)`, setOk && signs.length > 0 && signs.every((n) => n <= 10));
    await tap(page2, '.result .play-button.next');

    // Reset: eerst annuleren (blijft), dan bevestigen (alles weg).
    await tap(page2, '.topbar .icon-button');
    await openParents(page2);
    await tap(page2, '.ask-reset');
    await tap(page2, '.reset-actions .parent-button:not(.danger)'); // Annuleren
    const stillThere = (await page2.locator('.ask-reset').count()) === 1;
    await tap(page2, '.ask-reset');
    await tap(page2, '.confirm-reset');
    await page2.waitForSelector('.play-button');
    await tap(page2, '.play-button');
    await page2.waitForSelector('.map');
    const afterReset = await page2.evaluate(() => ({
      statuses: [...document.querySelectorAll('.mission-tile')].map((n) => n.dataset.status).join(','),
      animals: document.querySelectorAll('.collection .animal.found').length,
      stored: JSON.parse(localStorage.getItem('rekenwereld:v1')),
    }));
    r.step(6, `Reset met bevestiging (annuleren behoudt alles): ${afterReset.statuses}, ${afterReset.animals} dieren`, stillThere && afterReset.statuses === 'available,locked,locked' && afterReset.animals === 0 && Object.keys(afterReset.stored.progress).length === 0 && Object.keys(afterReset.stored.skills).length === 0);
    r.step(7, `Geen JS-fouten (${A.errors.length}), geen externe verzoeken (${A.foreign.length})`, A.errors.length === 0 && A.foreign.length === 0);
  } catch (e) {
    r.step('!', `Afgebroken: ${e.message.split('\n')[0]}`, false);
  } finally {
    await A.browser.close();
  }

  // ---------- 2. Opslag vol/geblokkeerd ----------
  const B = await h.launch(undefined, {});
  try {
    const { page, ctx } = B;
    await ctx.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('vol', 'QuotaExceededError');
      };
    });
    await page.reload();
    await tap(page, '.play-button');
    await tap(page, '.mission-tile.suggested');
    await h.playMission(page, 'pr-full');
    await tap(page, '.result .play-button.next');
    const playable = await page.evaluate(() => document.querySelectorAll('[data-mission="voetstappen"] .star.on').length === 1);
    await tap(page, '.topbar .icon-button');
    await openParents(page);
    const warned = (await page.locator('.storage-warning').count()) === 1;
    r.step(8, 'Opslag vol/geblokkeerd: spelen werkt gewoon, oudergedeelte waarschuwt', playable && warned && B.errors.length === 0);
  } catch (e) {
    r.step(8, `Opslag vol: afgebroken: ${e.message.split('\n')[0]}`, false);
  } finally {
    await B.browser.close();
  }

  // ---------- 3. Kapotte en oude opgeslagen data ----------
  const C = await h.launch();
  try {
    const { page } = C;
    await page.evaluate(() => localStorage.setItem('rekenwereld:v1', '{"schemaVersion":2,"progress":{"voetst'));
    await page.reload();
    await tap(page, '.play-button');
    await page.waitForSelector('.map');
    const fresh = await page.evaluate(() => [...document.querySelectorAll('.mission-tile')].map((n) => n.dataset.status).join(','));
    await tap(page, '.topbar .icon-button');
    await openParents(page);
    const notice = await page.locator('.warning').allTextContents();
    r.step(9, `Kapotte data: app start schoon (${fresh}), ouder ziet een melding`, fresh === 'available,locked,locked' && notice.some((t) => t.includes('beschadigd')) && C.errors.length === 0);

    // Oude opslag (schema 1, fase 1–4) wordt overgenomen.
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('rekenwereld:v1', JSON.stringify({ schemaVersion: 1, progress: { voetstappen: { roundsDone: 1, completed: true, bestStars: 2, timesPlayed: 1 } }, settings: { sound: true, seenDemos: ['count/choice'] }, updatedAt: 'x' }));
    });
    await page.reload();
    await tap(page, '.play-button');
    await page.waitForSelector('.map');
    const migrated = await page.evaluate(() => ({ stars: document.querySelectorAll('[data-mission="voetstappen"] .star.on').length, open: document.querySelector('[data-mission="appelmand"]').dataset.status }));
    r.step(10, `Oude opslag (schema 1) overgenomen: ${JSON.stringify(migrated)}`, migrated.stars === 1 && migrated.open === 'available');
  } catch (e) {
    r.step('!', `Kapotte data: afgebroken: ${e.message.split('\n')[0]}`, false);
  } finally {
    await C.browser.close();
  }

  r.print();
})();
