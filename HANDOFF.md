# Handoff — 2026-10-17

Beknopte stand voor een nieuwe sessie. Details staan in `WORKLIST.md` en `IMPLEMENTATION_PLAN.md`.

## Stand
- Fase 5 staat op `main`: voortgang per vaardigheid, adaptieve regels (`state/mastery.ts`),
  oudergedeelte (👪 op start → houden → keersom), opslag schema 2 met reservekopie en migratie.
- Fase 4: start → wereldkaart → missie (3 rondes per missie) → eindscherm → kaart.
- Lagen: `math/skills.ts` (vaardigheden + niveaus), `missions/` (leerlijnen, voorbeelden, kaart),
  `state/` (sessie, voortgang, wereld, hervatten, plaatsen, instellingen — alles puur),
  `presentation/` (schermen, bedieningsvormen, SVG-mascotte, geluid, spraak).
- `npm run check` (lint + typecheck + 120 unit-tests + build) groen.
- `e2e/nonreading.cjs` 17/17, `e2e/touch.cjs` 10/10, `e2e/progress.cjs` 11/11 groen (lokaal, headless Chromium);
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
- Adaptief: voelt "makkelijker na 2 moeilijke opdrachten" goed, of te snel/te traag?
- Vindt het kind per ongeluk de ouderpoort (👪)? Is het oudergedeelte voor jou duidelijk?

## Let op
- Push naar `main` = deploy. Afspraak: na elke commit direct naar `main` pushen.
- `npm run check` bouwt voor base `/`; voor de e2e-tests eerst `npm run preview:pages`.
- Pages-pad is hoofdlettergevoelig: `/RekenWereld/`.
- Hook activeren per clone: `git config core.hooksPath .githooks`.
