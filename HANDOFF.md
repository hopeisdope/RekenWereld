# Handoff — 2026-10-16

Beknopte stand voor een nieuwe sessie. Details staan in `WORKLIST.md`.

## Stand
- Fase 1.5 (spelen zonder lezen) staat op `main`. Zie `IMPLEMENTATION_PLAN.md` §7 punt 4.
- Nieuw: `src/missions/demos.ts` (voorbeeldopdrachten), `src/state/guidance.ts`
  (voorbeeld nodig? welke missie aanwijzen? hand na fouten), `src/state/settings.ts`
  (geluid, gezien voorbeelden; opgeslagen in `SaveData.settings`, optioneel veld).
- `npm run check` groen (34 unit-tests). `e2e/nonreading.cjs`: 14/14 stappen groen op
  iPad mini staand; liggend iPad visueel gecontroleerd; offline herladen werkt.

## Nog te observeren met het kind
- Begrijpt het de ▶-knop en de wijzende uil zonder uitleg van een volwassene?
- Herkent het de drie missieplaatjes en begrijpt het grijze vs. gouden sterren?
- Snapt het "kijken" (👀, niet tikken) vs. "jij" (🙋) in het voorbeeld; is 2 s/5 s goed getimed?
- Begrijpt het de ❓-bol bij tellen en het bordje bij "zelfde getal zoeken"?
- Begrijpt het de pijlkaart (➡️/⬅️ + bogen) bij de rivier, vooral terugspringen?
- Is automatisch doorgaan na 1,4 s prettig of te snel? Wordt 🏠 per ongeluk getikt?
- Gebruikt het de ❓-hulpknop zelf? Is er een lokale NL-stem op de iPad, en helpt die?

## Let op
- Push naar `main` = deploy. Afspraak: na elke commit direct naar `main` pushen.
- Pages-pad is hoofdlettergevoelig: `/RekenWereld/`.
- Hook activeren per clone: `git config core.hooksPath .githooks`.
