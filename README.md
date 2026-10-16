# RekenWereld

Nederlandstalige reken-PWA voor een kind van 6 jaar in groep 3, gemaakt voor iPad en iPad mini.
Een avonturenwereld met gebieden en missies; eerste leerdoelen zijn tellen tot 20 en
beginnen met optellen en aftrekken.

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
npm run check       # typecheck + tests + build, zoals CI
```

### Acceptatietest zonder lezen (browser)

Simuleert de hele flow (openen → spelen → missie kiezen → voorbeeld → oplossen → fout
herstellen → afronden → andere missie) zonder ooit tekst te lezen: antwoorden worden alleen uit
de plaatjes of de wijzende hand afgeleid. Vereist Playwright met Chromium.

```bash
npm run preview:pages        # terminal 1
node e2e/nonreading.cjs      # terminal 2; screenshots in e2e/output/
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

## Installeren op iPad

Open de Pages-URL in Safari → deelknop → **Zet op beginscherm**. Daarna start de app
schermvullend en werkt hij offline na het eerste bezoek.
