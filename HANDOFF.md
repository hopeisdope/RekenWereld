# Handoff — 2026-10-16

Beknopte stand voor een nieuwe sessie. Details staan in `WORKLIST.md` en `IMPLEMENTATION_PLAN.md`.

## Stand
- Fase 4 staat op `main`: start → wereldkaart → missie (3 rondes per missie) → eindscherm → kaart.
- Lagen: `math/skills.ts` (vaardigheden + niveaus), `missions/` (leerlijnen, voorbeelden, kaart),
  `state/` (sessie, voortgang, wereld, hervatten, plaatsen, instellingen — alles puur),
  `presentation/` (schermen, bedieningsvormen, SVG-mascotte, geluid, spraak).
- `npm run check` (lint + typecheck + 98 unit-tests + build) groen.
- `e2e/nonreading.cjs` 17/17 en `e2e/touch.cjs` 10/10 groen (lokaal, headless Chromium);
  offline herladen werkt. GitHub Pages deploy slaagt; URL niet vanuit de container bereikbaar.

## Nog te observeren met het kind
- Begrijpt het de kaart: slotje = nog dicht, ring/▶ = bezig, vinkje = klaar? Volgt het de uil?
- Herkent het de drie iconen (pootjes, mand, kikker) zonder uitleg?
- Slepen of tikken: wat doet het kind uit zichzelf? Lukt slepen op de iPad mini?
- Getallenlijn: snapt het ⬅️/➡️ + ✔, en de boogjes met nummers? Terugspringen?
- Ordenen (trap), splitshuis, tienveld, "meer" bij vergelijken: begrijpelijk na het voorbeeld?
- Zijn de voorbeelden niet te lang (ordenen ± 7 s)? Is 5 s wachten tot de hulphand goed?
- Motiveren sterren/dieren, of leiden ze af? Zijn geluidjes prettig of storend?
- Wordt 🏠 per ongeluk getikt? Is automatisch doorgaan na 1,4 s goed?

## Let op
- Push naar `main` = deploy. Afspraak: na elke commit direct naar `main` pushen.
- `npm run check` bouwt voor base `/`; voor de e2e-tests eerst `npm run preview:pages`.
- Pages-pad is hoofdlettergevoelig: `/RekenWereld/`.
- Hook activeren per clone: `git config core.hooksPath .githooks`.
