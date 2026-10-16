# IMPLEMENTATION_PLAN — RekenWereld

Status: **Fase 3 afgerond** (touch-interacties). Laatst bijgewerkt: 2026-10-16.

## 1. Uitgangssituatie (fase 0-inventarisatie)

| Onderwerp | Bevinding |
|---|---|
| Repository | `hopeisdope/RekenWereld`, branch `main`, 1 commit ("Initial commit") met alleen een lege `README.md` |
| Zichtbaarheid | **Publiek** (geverifieerd via GitHub-API: `visibility: public`) |
| GitHub Pages | **Nog niet ingeschakeld** (`has_pages: false`) |
| Workflows | Geen (`.github/workflows` bestond niet) |
| Bestaande code/gameplay | Geen: geen `package.json`, geen frameworks, tests of scripts |
| Lokale tooling | Node 22.22, npm 10.9 |

Omdat er geen bruikbaar project was, is in fase 0 een **minimaal skelet** neergezet om de buildketen
(Vite → subdirectory-build → PWA → Pages) te kunnen verifiëren. Er is geen gameplay gebouwd.

## 2. Gemaakte keuzes

- **Vite 8 + TypeScript 5.9 (strict)**, geen UI-framework. Canvas voor de wereld, gewone DOM-knoppen
  voor bediening (groter raakvlak, VoiceOver, minder werk). Een framework kan later, maar is voor
  deze omvang niet nodig.
- **vite-plugin-pwa (Workbox, `generateSW`)** in plaats van een handgeschreven service worker:
  precache-lijst met gehashte bestandsnamen wordt automatisch gegenereerd en respecteert `base`.
- **Base path via `BASE_PATH`** (standaard `/`; CI zet `/${repo-naam}/`). Geen hardgecodeerde
  repo-naam in de code.
- **Manifest met relatieve `start_url`/`scope` (`./`)** en relatieve icon-paden; dat werkt onder
  elke subdirectory.
- **Vitest** voor unit-tests van pure logica (rekenen, missies, spelstatus, opslag).
- **Build-target `safari15`** (iPadOS 15+).
- **Deploy via officiële Pages-actions** (`upload-pages-artifact` + `deploy-pages`) met de
  standaard `GITHUB_TOKEN`; geen `gh-pages`-branch, geen secrets.

## 3. Architectuur

Afhankelijkheden lopen alleen naar beneden. `math` en `missions` zijn puur (geen DOM), dus volledig
unit-testbaar.

```
src/
  main.ts              bootstrap: opslag laden, game starten, PWA registreren
  pwa.ts               service-worker-registratie (alleen productie)
  math/                PUUR – oefeningen genereren en antwoorden controleren
  missions/            PUUR – gebieden, missies, ontgrendelregels (data + logica)
  state/               spelstatus: reducer/store, voortgang, sessie
  storage/             persistente opslag (localStorage), schema-versie, migraties
  presentation/
    world/             Canvas: wereldkaart, gebieden, animaties, render-loop
    interactions/      DOM: antwoordknoppen, slepen, getallenlijn
    screens/           schermen: kaart, missie, beloning, ouder-menu
    audio/             uitgesproken instructies en geluidseffecten
  content/             teksten (nl), missiedefinities als data
```

Fase 0 bevat al: `src/math/{types,generate}.ts`, `src/storage/storage.ts`, `src/pwa.ts`,
`src/main.ts` (placeholder), en tests in `tests/`.

### Belangrijkste interfaces (doel voor fase 1)

```ts
// math
type Operation = 'count' | 'add' | 'subtract';            // later: 'split', 'pattern', ...
interface Exercise { id: string; operation: Operation; operands: readonly number[]; answer: number }
interface ExerciseGenerator { next(rng: Rng, level: SkillLevel): Exercise }
interface SkillLevel { max: 5 | 10 | 20; allowZero: boolean; bridgeTen: boolean }
function check(ex: Exercise, given: number): { correct: boolean; hint?: HintKind };

// missions
type InteractionKind = 'buttons' | 'drag' | 'numberline';
interface Mission {
  id: string; areaId: string; title: string;
  skill: Operation; level: SkillLevel;
  interaction: InteractionKind;
  exerciseCount: number;          // bv. 5 opgaven per missie
  unlocks: string[];              // missie-/gebied-id's
}
interface Area { id: string; name: string; missions: string[]; mapPosition: { x: number; y: number } }

// state
interface GameState {
  progress: Record<string, MissionProgress>;   // per missie-id
  stars: number;
  currentMission?: ActiveMission;
  settings: { sound: boolean; voice: boolean };
}
interface MissionProgress { completed: boolean; bestStars: 0 | 1 | 2 | 3; attempts: number }
type GameEvent =
  | { type: 'startMission'; missionId: string }
  | { type: 'answer'; value: number }
  | { type: 'finishMission' } | { type: 'quitMission' };
function reduce(state: GameState, event: GameEvent): GameState;   // puur

// storage (bestaat al, zie src/storage/storage.ts)
interface Storage { load(): SaveData | null; save(d: SaveData): void; clear(): void }

// presentation
interface Interaction {                // één per InteractionKind
  mount(root: HTMLElement, ex: Exercise, onAnswer: (n: number) => void): void;
  unmount(): void;
}
interface Scene { enter(): void; update(dt: number): void; render(ctx: CanvasRenderingContext2D): void; exit(): void }
```

## 4. MVP (fase 1–3)

1. Wereldkaart (canvas) met **2 gebieden**: *Telbos* (tellen tot 10/20) en *Somstrand*
   (optellen/aftrekken tot 10).
2. **6–8 missies** van ca. 5 opgaven, elk met één van de drie bedieningsvormen:
   grote antwoordknoppen (3–4 keuzes), slepen (voorwerpen in een mand), getallenlijn 0–10/0–20.
3. Vriendelijke feedback: geen "fout"-geluid, wel tweede kans en een visuele hint.
4. Sterren als beloning; missies ontgrendelen de volgende.
5. Voortgang blijft bewaard na sluiten (localStorage).
6. Werkt offline na het eerste bezoek, installeerbaar via "Zet op beginscherm".
7. Ouder-menu achter een eenvoudige poort (bv. ingedrukt houden) met "voortgang wissen".

Niet in MVP: splitsen, patronen, vormen, meten, dagelijks leven, accounts, sync, analytics.

### Acceptatiecriteria MVP

- Alle opgaven zijn correct en binnen het bereik van het niveau (unit-tests, ook randgevallen 0 en 20).
- Elke knop/sleepdoel ≥ 88×88 CSS-px; werkt met één vinger, zonder dubbeltik-zoom of tekstselectie.
- Werkt in Safari op iPadOS 15+ in staand en liggend, op iPad (10,9") en iPad mini (8,3").
- Voortgang blijft behouden na herstart van de app; corrupte opslag laat de app niet crashen.
- In vliegtuigmodus start de geïnstalleerde app en is alles speelbaar.
- Lighthouse PWA-installability-checks slagen; geen 404's in de netwerk-tab op de Pages-URL.
- Geen netwerkverzoeken naar derden (privacy: geen trackers, geen externe fonts/CDN).

## 5. Acceptatiecriteria fase 0 — status

| Criterium | Status |
|---|---|
| Statische site, geen backend | ✅ alleen `dist/` met HTML/JS/CSS/afbeeldingen |
| Productiebuild werkt onder subdirectory | ✅ lokaal geverifieerd: `npm run build:pages` → alle paden `/RekenWereld/…` |
| Correcte paden voor afbeeldingen/scripts/stylesheets | ✅ geen 404's in headless Chromium op `localhost:4173/RekenWereld/` |
| Manifest + SW passen bij de deploymentlocatie | ✅ SW-scope `…/RekenWereld/`; app laadt opnieuw in offline-modus (headless Chromium) |
| GitHub Actions kan bouwen en publiceren | ⏳ workflow staat klaar; **nog niet gedraaid** en Pages is nog niet ingeschakeld |
| Ontwikkel- en productieomgeving gedocumenteerd | ✅ README |

Nog niet geverifieerd: echte deploy op Pages, gedrag op een fysieke iPad.

## 6. Risico's

### Safari / iPad
- **Opslag kan worden gewist**: Safari verwijdert script-opslag van sites die 7 dagen niet bezocht
  zijn, tenzij de app op het beginscherm staat. → Installeren op beginscherm adviseren; eventueel
  `navigator.storage.persist()` proberen; later export/import van voortgang (code of bestand).
- **Opslag per context**: Safari-tab en beginscherm-app hebben *gescheiden* opslag. → In het
  ouder-menu uitleggen; altijd vanaf het beginscherm spelen.
- **Privé-modus / volle opslag**: `localStorage` kan gooien. → Opslag-laag vangt dit af (getest).
- **Touch**: dubbeltik-zoom, pinch, rubber-band-scroll, lang-drukken-menu, tekstselectie tijdens
  slepen. → `touch-action`, `user-select: none`, `overscroll-behavior: none`, Pointer Events met
  `setPointerCapture` voor slepen.
- **Canvas-scherpte en geheugen**: hoge `devicePixelRatio` op iPad; grote canvassen kunnen in
  Safari stil falen. → Canvasgrootte begrenzen, resize/oriëntatie afhandelen.
- **Audio**: geen autoplay; AudioContext pas ontgrendelen na eerste tik. Geluid volgt de
  stil-schakelaar niet altijd consistent. → Startknop ontgrendelt audio; alles ook zonder geluid
  speelbaar.
- **Safe areas en adresbalk**: `100vh` klopt niet in Safari. → `position: fixed; inset: 0` en
  `env(safe-area-inset-*)` (al toegepast).
- **Uitgesproken teksten**: Web Speech API-stemmen verschillen per apparaat; kind kan nog niet
  goed lezen. → Opgenomen audiobestanden voor instructies (precached).

### GitHub Pages
- **Subdirectory en hoofdletters**: URL is `/RekenWereld/`; verkeerde hoofdletters → 404.
  → `BASE_PATH` uit `github.event.repository.name`; build-check in CI op het pad.
- **Geen SPA-routing**: Pages kent geen rewrites. → Geen path-routing; schermen via interne
  state (eventueel hash).
- **Caching**: Pages zet ~10 min cache-headers. → Gehashte assets; SW met `autoUpdate`.
- **Pages nog niet ingeschakeld**: de eerste deploy-run faalt tot *Source = GitHub Actions* is gezet.
- **Publieke repo**: geen persoonsgegevens van het kind in code, commits of issues.

### Offline / service worker
- **Verouderde versie blijft hangen**: → `registerType: 'autoUpdate'`, `cleanupOutdatedCaches`;
  overweeg in het ouder-menu een "Bijwerken"-knop.
- **Update midden in een missie**: nieuwe SW neemt over bij herladen. → Voortgang na elke opgave
  opslaan zodat een herlaad niets kost.
- **Assets buiten de precache** (bv. later geladen audio) → alle bestandstypen in `globPatterns`
  opnemen; grootte bewaken (iOS-cachelimieten).
- **Schema-wijzigingen opslag**: → `schemaVersion` + migraties in `storage/`.

## 7. Implementatievolgorde

1. **Fase 0** ✅ skelet, buildketen, workflow, README, dit plan.
2. **Eenmalig GitHub**: Pages-bron op *GitHub Actions* zetten; eerste deploy verifiëren op iPad.
3. **Fase 1** ✅ (bijgesteld: kernlogica én eerste speelbare UI)
   - Startscherm met Uil Ollie en één gebied: *Het Getallenbos* (canvas-achtergrond).
   - Missieselectie met drie missies van 6 opdrachten: *De verdwenen voetstappen* (tellen en
     getallen herkennen tot 20, keuzeknoppen), *De appelmand* (optellen tot 10, keuzeknoppen),
     *De rivier oversteken* (vooruit/terug springen op getallenlijn 0–10).
   - Missieflow als pure reducer (`src/state/session.ts`): één opdracht tegelijk, vriendelijke
     feedback, hint na fout, fout antwoord wordt uitgeschakeld, automatisch door na goed,
     resultaat met sterren (altijd ≥ 1) en beloningsdier. Dubbeltik-beveiliging in reducer
     (antwoord moet bij huidige opdracht horen) én in UI (400 ms na nieuwe opdracht).
   - Voortgang (beste sterren per missie) in localStorage; voorlezen via Web Speech API (optioneel).
4. **Fase 1.5** ✅ spelen zonder lezen (na eerste test met het kind)
   - Gevonden leesobstakels: tekstknop als hoofdactie op start; missies vooral te onderscheiden
     via titel/uitleg; opdracht alleen in tekstballon ("Tik op het getal zestien" onoplosbaar
     zonder lezen/spraak; vooruit/terug en aantal sprongen alleen in tekst); geen voorbeeld bij
     nieuwe interactie; feedback/hint als tekst; resultaat met twee gelijkwaardige tekstknoppen.
   - Start: grote ronde ▶-knop, uil wijst ernaar (👉); geluid-aan/uit klein in de hoek.
   - Missiekeuze: drie grote plaatjes (pootjesspoor, appelmand, rivier met kikker); grijze vs.
     gouden sterren; 👇 + gloed op de eerstvolgende missie; één tik start direct.
   - Opdrachten: tellen met ❓-bol; getal zoeken = hetzelfde getal als op het bordje;
     springen met pijlkaart (➡️/⬅️ + bogen + getal); tekst klein en optioneel.
   - Voorbeeld per nieuwe soort opdracht: uil doet voor (👀, hand tikt), kind probeert zelf (🙋,
     hand verschijnt na 5 s niets doen); daarna niet meer, behalve via ❓-hulpknop.
   - Feedback: groen vinkje + sterrenregen + uil springt; fout = knop grijs, uil kantelt,
     visuele hint; na 2 fouten bij ≥ 4 keuzes wijst de hand het antwoord aan.
   - Resultaat: dier + sterren + confetti, grote ▶ (verder), klein 🔁 (opnieuw).
   - Spraak alleen met lokale stemmen; zonder stem blijft de app volledig bruikbaar.
5. **Fase 2** ✅ rekenengine en visuele didactiek
   - `src/math/skills.ts`: configureerbare vaardigheden met niveaus (enige plek met grenzen):
     herkennen 0–20, tellen, hoeveelheid maken, vergelijken, ordenen, ontbrekend getal,
     optellen/aftrekken (tot 5/10/20, met of zonder tientalovergang, max. tweede getal),
     splitsen, aanvullen tot 10. Didactische afleiders (één ernaast, verkeerde bewerking,
     omgedraaide cijfers, tien ernaast). Ordenen = meerstaps-antwoord (`steps`).
   - Missies hebben 3 rondes met elk een leerdoel en een geplande volgorde van concreet
     (voorwerpen) naar abstract (alleen getallen); bij een fout komen de voorwerpen terug.
   - Nieuwe beelden: telrij met gat, trap (klein → groot), groepjes vergelijken, opeten
     (aftrekken), splitshuis, tienveld. Voorbeeld per nieuwe soort, ook meerstaps.
   - ESLint toegevoegd (`npm run lint`, ook in CI).
6. **Fase 3** ✅ touch-interacties
   - Bedieningsvormen zijn componenten (`presentation/interactions/*`) met eigen toestand en
     `hintTarget()` = de volgende goede tik. Daarop draaien voordoen (mascotte tikt), de hulphand
     na 5 s niets doen en de hand na 2 fouten — voor alle vormen hetzelfde.
   - Grote knoppen: ingedrukt-toestand, groen/grijs + schudden, vergrendeld na goed antwoord.
   - Slepen of aantikken (mand/tienveld): vakjes zichtbaar, mand licht op als je erboven bent,
     verkeerd/naast loslaten of vol → voorwerp schudt en gaat terug; tik op gelegd = terug.
     Pure regels in `state/placement.ts`. Gebruikt bij "leg n in de mand" en "aanvullen tot 10".
   - Getallenlijn: ⬅️/➡️ = één sprong per tik (of tik een steen: stap-voor-stap), genummerde
     boogjes, ✔ bevestigt; na een fout springt de kikker terug. Geen automatische animatie die
     het antwoord verraadt. Ook 0–20.
   - Hervatten: tussenstand na elke opdracht en bij 🏠 (`state/resume.ts`); na herladen verder.
   - Voorbeelden per soort + bediening (`DemoKey`, bv. `makeTen/drag`).
   - Beperk beweging: animaties uit, sprongen direct.
7. **Fase 4 – avonturenwereld**: kaart, statussen, verzamelobjecten, ontgrendelen, geluid.: slepen (Pointer Events), aftrekken in eigen missie,
   Playwright-rooktest (iPad-viewport, touch) in CI.
8. **Later – wereld uitbreiden**: canvas-wereldkaart met gebieden, ontgrendelen, animaties, audio.
7. **Fase 4 – afronding MVP**: ouder-menu, persist-verzoek, testen op iPad en iPad mini, offline-test.
8. **Later**: splitsen, patronen, vormen, meten, dagelijks leven; export/import van voortgang.

## 8. Werkwijze

| Taak | Commando |
|---|---|
| Installeren | `npm ci` |
| Ontwikkelen | `npm run dev` (op iPad in lokaal netwerk: `npm run dev -- --host`) |
| Tests | `npm test`, `npm run typecheck` |
| Alles zoals CI | `npm run check` |
| Productie lokaal (subdirectory) | `npm run preview:pages` → `http://localhost:4173/RekenWereld/` |
| Publiceren | push/merge naar `main` → workflow `deploy.yml` |

### Benodigde GitHub-instellingen en permissies

- *Settings → Pages → Source*: **GitHub Actions** (nog te doen door eigenaar).
- Workflow-permissies: globaal `contents: read`; deploy-job `pages: write`, `id-token: write`.
- Environment `github-pages` wordt automatisch aangemaakt; standaard mag alleen `main` erheen deployen.
- Geen secrets of persoonlijke tokens nodig.
- Verwachte URL na eerste geslaagde deploy: `https://hopeisdope.github.io/RekenWereld/`.
