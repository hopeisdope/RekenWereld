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
  hervatten na 🏠 en na herladen, en "Beperk beweging" (liggend).
- `e2e/progress.cjs` — heropenen na afsluiten, makkelijker na herhaalde fouten, ouderpoort,
  niveau aanpassen, reset met bevestiging, volle/kapotte opslag en oude opslag (schema 1).

Vereist Playwright met Chromium.

```bash
npm run preview:pages        # terminal 1
node e2e/nonreading.cjs      # terminal 2; screenshots in e2e/output/
node e2e/touch.cjs
node e2e/progress.cjs
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

- **push naar `main`** → typecheck, tests, build, deploy naar GitHub Pages;
- **pull request naar `main`** → alleen typecheck, tests en build (geen deploy);
- handmatig starten kan via *Actions → Build en deploy naar GitHub Pages → Run workflow*.

Eenmalige instelling in GitHub (door de eigenaar van de repository):

1. *Settings → Pages → Build and deployment → Source*: kies **GitHub Actions**.
2. *Settings → Actions → General → Workflow permissions*: standaard (read) is voldoende;
   de workflow vraagt zelf `pages: write` en `id-token: write` aan voor alleen de deploy-job.

Er zijn geen tokens of secrets nodig; de workflow gebruikt de standaard `GITHUB_TOKEN`.

Verwachte publicatie-URL (pas geldig na de eerste geslaagde deploy):
`https://hopeisdope.github.io/RekenWereld/`

Een mislukte build of deploy is zichtbaar als rode run in het tabblad **Actions**, als rode
status bij de commit/PR, en GitHub stuurt standaard een e-mail naar wie de run startte.

## Voor ouders

Op het startscherm zit linksboven een klein 👪-knopje. Houd de knop 2 seconden ingedrukt en
beantwoord de keersom. Daar zie je per vaardigheid hoe het gaat, kun je het niveau per
vaardigheid op makkelijker/automatisch/moeilijker zetten en de voortgang (bevestigd) wissen.
Alles staat alleen op het apparaat; er is geen account of server.

## Installeren op iPad

Open de Pages-URL in Safari → deelknop → **Zet op beginscherm**. Daarna start de app
schermvullend en werkt hij offline na het eerste bezoek.
