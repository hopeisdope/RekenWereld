# RekenWereld

Nederlandstalige reken-PWA voor een kind van 6 jaar in groep 3, gemaakt voor iPad en iPad mini.
Een avonturenwereld (Het Getallenbos) met drie missies van elk drie rondes: tellen, getallen
herkennen, telrij, vergelijken, ordenen, optellen, aftrekken, splitsen en aanvullen tot 10.
Alles is te spelen zonder te kunnen lezen: grote knoppen, slepen of tikken, een getallenlijn
met springknoppen, voorbeelden die de uil voordoet en een wijzende hand.

- Stack: TypeScript, Vite, HTML5 Canvas (wereld) + HTML/CSS (bediening), `localStorage`, PWA.
- Geen backend: de app is een statische site op GitHub Pages.
- Plan en architectuur: zie [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Vereisten

- Node.js 22 (zie `.nvmrc`) en npm 10

## Installeren

```bash
npm ci          # of: npm install
```

## Ontwikkelen

```bash
npm run dev     # http://localhost:5173/  (base '/', geen service worker)
```

Testen op een echte iPad in hetzelfde netwerk: `npm run dev -- --host` en open het getoonde
netwerkadres in Safari. Let op: service workers werken op iOS alleen via HTTPS (of localhost),
dus offline-gedrag test je op de Pages-URL of met de productiepreview op de Mac (zie hieronder).

## Testen

```bash
npm run typecheck   # TypeScript
npm test            # unit-tests (Vitest)
npm run lint        # ESLint
npm run check       # lint + typecheck + tests + build, zoals CI
```

### Browsertests (Playwright)

- `e2e/nonreading.cjs` — de hele flow zonder ooit tekst te lezen (openen → spelen → missie
  kiezen → voorbeeld → oplossen → fout herstellen → afronden → andere missie → alle 9 rondes).
  Antwoorden komen alleen uit de plaatjes, getallen en sommen of uit de wijzende hand.
- `e2e/touch.cjs` — echt slepen, verkeerd loslaten, dubbel tikken, draaien van de iPad,
  hervatten na 🏠 en na herladen, "Beperk beweging" (liggend), 🏠 tijdens het vieren van de
  laatste opdracht (ronde blijft bewaard) en tikken naast een voorwerp in de voorraad.
- `e2e/progress.cjs` — heropenen na afsluiten, makkelijker na herhaalde fouten, ouderpoort,
  niveau aanpassen, reset met bevestiging, volle/kapotte opslag en oude opslag (schema 1).

- `e2e/offline.cjs` — PWA: service worker met juiste scope, precache, koude start met de
  server uit en netwerk uit, voortgang offline bewaard, update die pas activeert als de app
  uit beeld is en daarna de voortgang ongemoeid laat, geen externe verzoeken. Bouwt en serveert
  zelf (poort 4175) en overschrijft daarbij `dist/`.

Vereist Playwright met Chromium.

```bash
npm run preview:pages        # terminal 1
node e2e/nonreading.cjs      # terminal 2; screenshots in e2e/output/
node e2e/touch.cjs
node e2e/progress.cjs
node e2e/offline.cjs         # heeft terminal 1 niet nodig
```

## Bouwen

```bash
npm run build          # productiebuild voor base '/'          -> dist/
npm run build:pages    # productiebuild voor '/RekenWereld/'    -> dist/
npm run preview:pages  # bouwt en serveert op http://localhost:4173/RekenWereld/
```

De base path komt uit de omgevingsvariabele `BASE_PATH` (standaard `/`). In GitHub Actions wordt
die automatisch gezet op `/<repositorynaam>/`. Paden zijn hoofdlettergevoelig: `/RekenWereld/`,
niet `/rekenwereld/`.

## Publiceren (GitHub Pages)

Publicatie gaat automatisch via `.github/workflows/deploy.yml`:

- **push naar `main`** → lint, typecheck, tests, build, controle van de build-output
  (paden onder `/RekenWereld/`, manifest-scope, service worker), deploy naar GitHub Pages;
- **pull request naar `main`** → hetzelfde zonder deploy;
- handmatig starten kan via *Actions → Build en deploy naar GitHub Pages → Run workflow*.

Eenmalige instelling in GitHub (door de eigenaar van de repository):

1. *Settings → Pages → Build and deployment → Source*: kies **GitHub Actions**.
2. *Settings → Actions → General → Workflow permissions*: standaard (read) is voldoende;
   de workflow vraagt zelf `pages: write` en `id-token: write` aan voor alleen de deploy-job.

Er zijn geen tokens of secrets nodig; de workflow gebruikt de standaard `GITHUB_TOKEN`.
Rechten: standaard alleen `contents: read`; de deploy-job krijgt daarnaast `pages: write`
en `id-token: write` (vereist door `actions/deploy-pages`). Een lopende deploy wordt niet
afgebroken door een nieuwere push; die wacht en publiceert daarna.

Controleren of een deploy gelukt is: groene run in **Actions**, en in de app
(oudergedeelte → *Opslag en privacy*) staat *Versie:* gelijk aan het begin van de commit-hash.

Verwachte publicatie-URL (pas geldig na de eerste geslaagde deploy):
`https://hopeisdope.github.io/RekenWereld/`

Een mislukte build of deploy is zichtbaar als rode run in het tabblad **Actions**, als rode
status bij de commit/PR, en GitHub stuurt standaard een e-mail naar wie de run startte.

## Voor ouders

Op het startscherm zit linksboven een klein 👪-knopje. Houd de knop 2 seconden ingedrukt en
beantwoord de keersom. Daar zie je per vaardigheid hoe het gaat, kun je het niveau per
vaardigheid op makkelijker/automatisch/moeilijker zetten en de voortgang (bevestigd) wissen.
Alles staat alleen op het apparaat; er is geen account of server.

## PWA, offline en updates

- Manifest: `start_url` en `scope` zijn `./` (relatief), dus de app en de service worker
  blijven binnen `/RekenWereld/`. Iconen: 192, 512, maskable 512 en `apple-touch-icon` (180).
- De service worker (Workbox, `generateSW`) precachet alle bestanden van de build (± 115 kB):
  HTML, JS, CSS, iconen en manifest. Opdrachten worden in de app gegenereerd, geluid via
  Web Audio en spraak via lokale stemmen: er zijn geen andere bestanden of netwerkverzoeken.
- Na het eerste volledige bezoek start de app ook zonder internet (ook koud, na afsluiten).
- Voortgang staat in `localStorage` (sleutel `rekenwereld:v1`), los van de cache van de
  service worker. Een update vervangt alleen de app-bestanden; oude caches van Workbox worden
  opgeruimd, de voortgang niet. Schemawijzigingen gaan via een migratie (`src/storage/`).
- Updates: bij openen (en hooguit eens per uur als de app weer in beeld komt) zoekt de app
  naar een nieuwe versie. Die wordt op de achtergrond geladen en pas geactiveerd als de app
  uit beeld gaat (naar het beginscherm, andere app). Nooit herladen midden in een opdracht;
  een onderbroken ronde wordt bovendien hervat.
- De app vraagt `navigator.storage.persist()` aan (best effort, minder kans dat de browser
  gegevens opruimt).

## Installeren op iPad

1. Open `https://hopeisdope.github.io/RekenWereld/` in **Safari** (niet in een andere browser:
   alleen Safari kan op iPadOS < 16.4 een web-app op het beginscherm zetten).
2. Wacht tot het startscherm met de uil helemaal geladen is (± 5 s, dan staat alles in de cache).
3. Deelknop → **Zet op beginscherm** → *Voeg toe*. Start de app daarna via het icoon.
4. Open en sluit de app één keer met internet aan; daarna werkt hij ook offline.

Let op: de app op het beginscherm heeft een eigen opslag, los van Safari. Voortgang die in een
Safari-tabblad is gespeeld, staat dus niet in de app op het beginscherm (en andersom).

### Handmatige controles op een echte iPad

Deze kunnen niet automatisch in de container worden getest; afvinken op iPad én iPad mini:

- [ ] Installatie vanaf de echte Pages-URL (stappen hierboven); icoon en naam *RekenWereld* kloppen.
- [ ] Start vanaf het beginscherm: schermvullend, geen Safari-balken.
- [ ] Veilige randen: niets onder de statusbalk/klok, de thuisbalk of de afgeronde hoeken
      (ook iPad mini liggend); 🏠, ❓ en 🔊 goed te raken.
- [ ] Staand en liggend; draaien midden in een opdracht (vooral getallenlijn en slepen).
- [ ] Touch: knoppen, slepen naar mand/tienveld, verkeerd loslaten, tikken als alternatief,
      dubbel tikken zoomt niet, pagina scrolt niet mee tijdens slepen.
- [ ] Koude offline start: app op beginscherm geopend geweest → app helemaal sluiten (app-
      wisselaar, omhoog vegen) → vliegtuigmodus aan → app starten → start en missie spelen.
- [ ] Voortgang offline: speel een ronde in vliegtuigmodus, sluit de app, start opnieuw → ster staat er.
- [ ] Update: na een nieuwe deploy app openen met internet, even naar het beginscherm en terug
      → *Versie* in het oudergedeelte is nieuw en de voortgang staat er nog.
- [ ] Geluid na eerste aanraking, en voorlezen met een lokale Nederlandse stem.
