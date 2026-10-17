// Gedeelde hulpfuncties voor de browsertests. Ze lezen nooit uitlegtekst (.caption):
// antwoorden komen alleen uit wat het kind ziet (voorwerpen, bordjes, getallen, sommen)
// of uit de wijzende hand.
const path = require('node:path');
const fs = require('node:fs');

const { chromium } = require(process.env.PW || 'playwright');
const APP_URL = process.env.BASE_URL || 'http://localhost:4173/RekenWereld/';
const SP = process.env.SP || path.join(__dirname, 'output');
fs.mkdirSync(SP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function reporter() {
  const log = [];
  return {
    step(n, msg, ok = true) {
      log.push(`${ok ? '✅' : '❌'} ${n}. ${msg}`);
      if (!ok) process.exitCode = 1;
    },
    print() {
      console.log(log.join('\n'));
    },
  };
}

/** Antwoord(en) afgeleid uit het beeld. Lijst = achter elkaar tikken (ordenen). */
async function visualAnswer(page) {
  return page.evaluate(() => {
    const v = document.querySelector('.visual');
    if (!v) return null; // (nog) geen opdracht in beeld
    const num = (el) => Number(el.textContent.trim());
    const eq = v.querySelector('.equation')?.textContent.replace(/\s/g, '');
    if (v.querySelector('.count-scene')) return [v.querySelectorAll('.count-scene .item').length];
    if (v.querySelector('.sign')) return [num(v.querySelector('.sign'))];
    if (v.querySelector('.number-path')) {
      const tiles = [...v.querySelectorAll('.path-tile')];
      const gap = tiles.findIndex((t) => t.classList.contains('gap'));
      return [gap > 0 ? num(tiles[gap - 1].querySelector('.tile-number')) + 1 : num(tiles[1].querySelector('.tile-number')) - 1];
    }
    if (v.querySelector('.split-house')) return [num(v.querySelector('.roof')) - num(v.querySelector('.room .room-number'))];
    if (document.querySelector('.choices.groups')) {
      const sizes = [...document.querySelectorAll('.choices.groups .choice')].map((b) => b.querySelectorAll('.item').length || num(b));
      return [Math.max(...sizes)];
    }
    if (document.querySelector('.sequence')) return [...document.querySelectorAll('.sequence .tile:not(.used)')].map(num).sort((a, b) => a - b);
    if (v.querySelector('.jump-card')) {
      const start = Number(document.querySelector('.stone.start').dataset.value);
      const hops = num(v.querySelector('.jump-count'));
      return [v.querySelector('.jump-card.back') ? start - hops : start + hops];
    }
    if (eq) {
      let m = eq.match(/^(\d+)\+\?=(\d+)$/);
      if (m) return [Number(m[2]) - Number(m[1])];
      m = eq.match(/^(\d+)([+−])(\d+)=\?$/);
      if (m) return [m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3])];
    }
    return null;
  });
}

const mode = (page) => page.evaluate(() => (document.querySelector('.mission-card-body')?.className.match(/mode-(\S+)/) || [])[1]);
const interactionKind = (page) => page.evaluate(() => (document.querySelector('.mission-card-body')?.className.match(/interaction-(\S+)/) || [])[1]);
const handShown = (page) => page.evaluate(() => !!document.querySelector('.float-hand.show') && !!document.querySelector('[data-pointed]'));
const nowIndex = (page) => page.evaluate(() => [...document.querySelectorAll('.dot')].findIndex((d) => d.classList.contains('now')));
const doneCount = (page) => page.evaluate(() => document.querySelectorAll('.dot.done').length);
const solvedNow = (page) => page.evaluate(() => !!document.querySelector('.mission-card-body.solved'));
const tap = (page, selector) => page.locator(selector).first().tap({ force: true });
const tapValue = (page, v) => tap(page, `.answers [data-value="${v}"]`);

/** Spring met ⬅️/➡️ naar `target` (geen precisie nodig) en bevestig met ✔. */
async function hopTo(page, target, { viaStone = false } = {}) {
  if (viaStone) {
    await tapValue(page, target);
    await page.waitForFunction((t) => document.querySelector('.stone.here')?.dataset.value === String(t), target, { timeout: 8000 });
  } else {
    for (let i = 0; i < 25; i++) {
      const here = await page.evaluate(() => Number(document.querySelector('.stone.here').dataset.value));
      if (here === target) break;
      await tap(page, here < target ? '.hop-button.forward' : '.hop-button.back');
      await sleep(60);
    }
  }
  await sleep(150);
  await tap(page, '.hop-button.confirm');
}

/** Leg n voorwerpen in de mand door ze aan te tikken, en bevestig. */
async function placeItems(page, n) {
  for (let i = 0; i < 30; i++) {
    const placed = await page.evaluate(() => document.querySelectorAll('.slot.placed').length);
    if (placed === n) break;
    if (placed < n) await tap(page, '.tray .drag-item');
    else await tap(page, '.slot.placed >> nth=-1');
    await sleep(80);
  }
  await tap(page, '.drag-task .hop-button.confirm');
}

/** Sleep één voorwerp met een echte vingerbeweging naar (of naast) de mand. */
async function dragItem(page, { miss = false } = {}) {
  const item = await page.locator('.tray .drag-item').first().boundingBox();
  const zone = await page.locator('.drop-zone').boundingBox();
  const tx = miss ? 20 : zone.x + zone.width / 2;
  const ty = miss ? 20 : zone.y + zone.height / 2;
  await page.mouse.move(item.x + item.width / 2, item.y + item.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(item.x + ((tx - item.x) * i) / 8, item.y + ((ty - item.y) * i) / 8);
  await page.mouse.up();
  await sleep(400);
}

/** Los de huidige opdracht op met alleen het beeld. */
async function solveCurrent(page) {
  const kind = await interactionKind(page);
  const values = await visualAnswer(page);
  if (!values) throw new Error('geen antwoord uit het beeld af te leiden');
  if (kind === 'numberline') await hopTo(page, values[0]);
  else if (kind === 'drag') await placeItems(page, values[0]);
  else for (const v of values) { await tapValue(page, v); await sleep(120); }
  // Wacht op de toestand i.p.v. een vaste tijd (onder belasting kan een tik later aankomen).
  await page.waitForFunction(() => document.querySelector('.mission-card-body.solved') || document.querySelector('.result'), null, { timeout: 3000 }).catch(() => {});
  return values;
}

/** Voorbeeld: kijken (hand wijst, mascotte tikt) → zelf proberen (hand na 5 s) → terug naar de missie. */
async function doDemo(page, tag) {
  const watchHand = await page.waitForFunction(() => document.querySelector('.float-hand.show'), null, { timeout: 4000 }).then(() => true, () => false);
  await page.screenshot({ path: `${SP}/${tag}-demo-watch.png` });
  await page.waitForFunction(() => document.querySelector('.mode-demo-try'), null, { timeout: 30000 });
  await sleep(200);
  const noHandYet = !(await handShown(page));
  await sleep(5400);
  const idleHand = await handShown(page);
  await page.screenshot({ path: `${SP}/${tag}-demo-try.png` });
  await tap(page, '[data-pointed]');
  await sleep(400);
  if ((await mode(page)) === 'demo-try' && !(await solvedNow(page))) await solveCurrent(page);
  await page.waitForFunction(() => document.querySelector('.mode-task'), null, { timeout: 8000 });
  const ok = watchHand && noHandYet && idleHand;
  if (!ok) console.log(`  voorbeeld ${tag}: hand bij kijken=${watchHand}, nog geen hand=${noHandYet}, hand na 5 s=${idleHand}`);
  return ok;
}

/** Wacht tot er een opdracht klaarstaat (of een voorbeeld, of het eindscherm). */
async function waitReady(page) {
  for (let i = 0; i < 100; i++) {
    if (await page.locator('.result').count()) return 'result';
    const m = await mode(page);
    if (m === 'demo-watch') return 'demo';
    if (m === 'task' && !(await solvedNow(page))) {
      await sleep(450); // invoerbeveiliging na een nieuwe opdracht
      return 'task';
    }
    await sleep(100);
  }
  throw new Error('geen opdracht na 10 s');
}

/** Speel de geopende missieronde helemaal uit. `onTask` mag eerst iets proberen (fouten maken). */
async function playMission(page, tag, onTask) {
  const demos = [];
  const kinds = new Set();
  for (;;) {
    const state = await waitReady(page);
    if (state === 'result') break;
    if (state === 'demo') {
      demos.push(await doDemo(page, `${tag}-${demos.length}`));
      continue;
    }
    const idx = await nowIndex(page);
    if (onTask) await onTask(page, idx);
    if (await solvedNow(page)) continue;
    if (!(await visualAnswer(page))) continue; // scherm wisselde net; opnieuw kijken
    const values = await solveCurrent(page);
    if (!(await solvedNow(page)) && !(await page.locator('.result').count())) throw new Error(`antwoord ${values} niet goed in ${tag} opdracht ${idx}`);
    kinds.add(await page.evaluate(() => document.querySelector('.mission-card-body').className.match(/prompt-(\S+)/)[1]));
  }
  return { demos, kinds: [...kinds] };
}

async function launch(viewport = { width: 744, height: 1133 }, extra = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 2, ...extra });
  const page = await ctx.newPage();
  const errors = [];
  const foreign = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (!r.url().startsWith(new URL(APP_URL).origin)) foreign.push(r.url());
  });
  await page.goto(APP_URL);
  return { browser, ctx, page, errors, foreign };
}

module.exports = {
  APP_URL, SP, sleep, reporter, visualAnswer, mode, interactionKind, handShown, nowIndex, doneCount, solvedNow,
  tap, tapValue, hopTo, placeItems, dragItem, solveCurrent, doDemo, waitReady, playMission, launch,
};
