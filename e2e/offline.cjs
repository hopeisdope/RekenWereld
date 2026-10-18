// Fase 6: PWA offline en updates, met de productiebuild onder /RekenWereld/.
// Bouwt en serveert zelf (poort 4175) en zet de server tussendoor echt uit.
//
//   node e2e/offline.cjs          (vereist Playwright met Chromium; overschrijft dist/)
const { execSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 4175;
process.env.BASE_URL = `http://localhost:${PORT}/RekenWereld/`;
const h = require('./helpers.cjs');
const { chromium } = require(process.env.PW || 'playwright');
const { sleep, tap } = h;
const ROOT = path.join(__dirname, '..');
const KEY = 'rekenwereld:v1';

function build(id) {
  execSync('npm run build:pages', { cwd: ROOT, stdio: 'ignore', env: { ...process.env, VITE_BUILD_ID: id } });
}

async function serve() {
  const p = spawn('npx', ['vite', 'preview', '--base', '/RekenWereld/', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: true });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(h.APP_URL)).ok) return p;
    } catch {
      /* nog niet klaar */
    }
    await sleep(100);
  }
  throw new Error('previewserver start niet');
}

function stopServer(p) {
  try {
    process.kill(-p.pid);
  } catch {
    /* al gestopt */
  }
}

async function openApp(dir) {
  const ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 744, height: 1133 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  const errors = [];
  const foreign = [];
  page.on('pageerror', (e) => errors.push(e.message));
  ctx.on('request', (r) => {
    if (!r.url().startsWith(new URL(h.APP_URL).origin)) foreign.push(r.url());
  });
  return { ctx, page, errors, foreign };
}

const build_ = (page) => page.evaluate(() => document.documentElement.dataset.build);
const saved = (page) => page.evaluate((k) => localStorage.getItem(k), KEY);

(async () => {
  const r = h.reporter();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-offline-'));
  let server = null;
  let ctx = null;
  const allErrors = [];
  const allForeign = [];
  try {
    // 1. Eerste bezoek online: service worker installeert en neemt de pagina over
    build('e2e-a');
    server = await serve();
    let s = await openApp(dir);
    ctx = s.ctx;
    await s.page.goto(h.APP_URL);
    const sw = await s.page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return { scope: reg.scope, script: reg.active?.scriptURL };
    });
    r.step(1, `Service worker actief, scope ${sw.scope}`, sw.scope === h.APP_URL && sw.script === `${h.APP_URL}sw.js`);
    const cached = await s.page.evaluate(async () => {
      const names = await caches.keys();
      const urls = [];
      for (const n of names) for (const req of await (await caches.open(n)).keys()) urls.push(new URL(req.url).pathname);
      return { names, urls };
    });
    const need = ['index.html', 'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png'];
    const hasAssets = cached.urls.some((u) => /\/assets\/index-.*\.js$/.test(u)) && cached.urls.some((u) => /\/assets\/index-.*\.css$/.test(u));
    r.step(2, `Precache: ${cached.urls.length} bestanden, alles onder /RekenWereld/`,
      hasAssets && need.every((n) => cached.urls.includes(`/RekenWereld/${n}`)) && cached.urls.every((u) => u.startsWith('/RekenWereld/')));

    // 2. Voortgang maken: eerste missieronde spelen
    await tap(s.page, '.play-button');
    await s.page.waitForSelector('.mission-tile');
    await tap(s.page, '.mission-tile.suggested');
    await s.page.waitForSelector('.mission-card-body');
    await h.playMission(s.page, 'off-a');
    await sleep(300);
    const before = await saved(s.page);
    const stars = JSON.parse(before ?? '{}').progress;
    r.step(3, 'Missieronde gespeeld, voortgang opgeslagen', !!before && JSON.stringify(stars).length > 2);
    allErrors.push(...s.errors);
    allForeign.push(...s.foreign);
    await ctx.close();

    // 3. Koude start zonder server en zonder netwerk
    stopServer(server);
    server = null;
    await sleep(300);
    s = await openApp(dir);
    ctx = s.ctx;
    await ctx.setOffline(true);
    await s.page.goto(h.APP_URL);
    await s.page.waitForSelector('.play-button', { timeout: 5000 });
    r.step(4, `Koude start offline (server uit): app start, versie ${await build_(s.page)}`, (await build_(s.page)) === 'e2e-a');
    r.step(5, 'Voortgang offline onveranderd aanwezig', (await saved(s.page)) === before);
    await tap(s.page, '.play-button');
    await s.page.waitForSelector('.mission-tile');
    const done = await s.page.evaluate(() => document.querySelector('.mission-tile[data-mission="voetstappen"]')?.dataset.status);
    await tap(s.page, '.mission-tile.suggested');
    await s.page.waitForSelector('.mission-card-body');
    await h.waitReady(s.page);
    r.step(6, `Offline: kaart toont gespeelde missie (${done}) en een nieuwe missie start`, done !== 'available' && !!done);
    await s.page.goto(`${h.APP_URL}index.html?bron=beginscherm`);
    await s.page.waitForSelector('.play-button', { timeout: 5000 });
    r.step(7, 'Offline: andere URL binnen de scope valt terug op de app');
    await s.page.screenshot({ path: `${h.SP}/off-1-offline.png` });
    allErrors.push(...s.errors);
    allForeign.push(...s.foreign);
    const offlineSaved = await saved(s.page);
    await ctx.close();

    // 4. Update: nieuwe build online; activeert pas als de app uit beeld gaat
    build('e2e-b');
    server = await serve();
    s = await openApp(dir);
    ctx = s.ctx;
    await s.page.goto(h.APP_URL);
    await s.page.waitForSelector('.play-button');
    const waiting = await s.page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
      for (let i = 0; i < 50 && !reg.waiting; i++) await new Promise((res) => setTimeout(res, 100));
      return !!reg.waiting;
    });
    const stillA = await build_(s.page);
    r.step(8, `Nieuwe versie gedownload en wachtend; zichtbare app blijft ${stillA}`, waiting && stillA === 'e2e-a');
    // App gaat naar de achtergrond (iPad: thuisknop / ander app).
    await s.page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await s.page.waitForFunction(() => document.documentElement.dataset.build === 'e2e-b', null, { timeout: 10000 });
    await s.page.waitForSelector('.play-button');
    r.step(9, 'Na uit beeld gaan: nieuwe versie e2e-b actief');
    r.step(10, 'Voortgang na update ongewijzigd', (await saved(s.page)) === offlineSaved);
    const names = await s.page.evaluate(() => caches.keys());
    r.step(11, `Eén precache over na opruimen (${names.join(', ')})`, names.length === 1);
    allErrors.push(...s.errors);
    allForeign.push(...s.foreign);

    r.step(12, `Geen JS-fouten (${allErrors.length}), geen externe verzoeken (${allForeign.length})`, allErrors.length === 0 && allForeign.length === 0);
    if (allErrors.length) console.log(allErrors);
    if (allForeign.length) console.log(allForeign);
  } catch (e) {
    r.step('x', `Fout: ${e.message}`, false);
  } finally {
    await ctx?.close().catch(() => undefined);
    if (server) stopServer(server);
    fs.rmSync(dir, { recursive: true, force: true });
    r.print();
  }
})();
