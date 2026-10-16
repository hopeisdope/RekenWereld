# RekenWereld

Nederlandstalige reken-PWA (avonturenwereld met gebieden en missies) voor een kind van 6 jaar
in groep 3, op iPad en iPad mini.

Algemene werkafspraken staan in `~/.claude/CLAUDE.md`. Dit bestand voegt toe wat specifiek is
voor dit project.

## Sessiestart
Lees eerst `WORKLIST.md`. Houd `HANDOFF.md` actueel aan het eind van lange sessies.
Architectuur, MVP en risico's: `IMPLEMENTATION_PLAN.md`.

## Stack
- TypeScript 5.9 (strict), Vite 8, Node 22 (`.nvmrc`)
- HTML5 Canvas voor de wereld, HTML/CSS voor bediening
- PWA via vite-plugin-pwa (Workbox `generateSW`)
- Opslag: alleen `localStorage` op het apparaat, geen backend
- Tests: Vitest
- Hosting: GitHub Pages via `.github/workflows/deploy.yml` (push naar `main`)

## Commando's

```bash
npm ci && npm run dev        # http://localhost:5173/
npm run preview:pages        # productiebuild op http://localhost:4173/RekenWereld/
npm test                     # unit-tests
npm run lint                 # ESLint
npm run check                # lint + typecheck + tests + build, zoals CI
```

## Git
- Na elke commit direct naar `main` pushen (`git push origin main`). Werk op `main`;
  geen feature-branches tenzij daar expliciet om gevraagd wordt.
- Elke push naar `main` publiceert naar GitHub Pages: draai vooraf `npm run check`.

## Conventies
- Code-identifiers in het Engels; teksten voor het kind, comments en documentatie in het Nederlands.
- `src/math` en `src/missions` blijven puur (geen DOM) en volledig unit-getest.
- Nooit hardgecodeerde paden naar `/RekenWereld/`: gebruik `import.meta.env.BASE_URL`,
  absolute `/…`-paden in `index.html` (Vite zet de base ervoor) of relatieve paden.
- Knoppen en sleepdoelen minimaal 88×88 CSS-px; niets mag alleen via tekst te begrijpen zijn.
  Uitzondering: stenen op de getallenlijn 0–10 (≥ 56 px breed, 112 px hoog, aansluitend).
- Lagen: `math` → `missions` → `state` (pure reducers) → `presentation` (DOM/canvas).
  Niveaus/grenzen per vaardigheid staan alleen in `src/math/skills.ts`; leerlijnen (rondes) in
  `src/missions/getallenbos.ts`.
  Presentatie bevat geen rekenlogica; teksten voor het kind staan in `presentation/texts.ts`.
- Geen tijdsdruk, geen strafpunten; altijd minstens één ster.
- **Spelen zonder lezen** (fase 1.5): elke stap moet te begrijpen zijn via beeld, getallen,
  beweging of de wijzende hand (👆/👉/👇). Tekst (`.caption`, titels) is alleen ondersteuning.
  Spraak is optioneel en alleen via lokale stemmen (`localService`). Nieuwe soort opdracht =
  voorbeeld in `missions/demos.ts` (voordoen → zelf proberen); acceptatietest `e2e/nonreading.cjs`
  leest nooit tekst en moet blijven slagen, net als `e2e/touch.cjs`.
- Nieuwe bedieningsvorm = `Interaction` (`presentation/interactions/types.ts`) met `hintTarget()`;
  slepen altijd met tik-alternatief; respecteer `reducedMotion()`.
- Geen externe netwerkverzoeken (geen CDN, fonts, analytics).
- Publieke repo: geen persoonsgegevens van het kind in code, commits of issues.
- Opslagschema wijzigen = `SCHEMA_VERSION` ophogen en migratie toevoegen in `src/storage/`.

## Debuggen
- Lokaal: browser-devtools; service worker is in `npm run dev` uitgeschakeld, gebruik
  `npm run preview:pages` om PWA/offline te testen.
- Opgeslagen voortgang: `localStorage.getItem('rekenwereld:v1')` in de console.
- iPad: Safari Web Inspector via een Mac (Instellingen → Safari → Geavanceerd → Webinspector).
- Deploy-fouten: tabblad Actions op GitHub.
