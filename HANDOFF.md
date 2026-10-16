# Handoff — 2026-10-16

Beknopte stand voor een nieuwe sessie. Details staan in `WORKLIST.md`.

## Stand
- Fase 1 staat op `main`: startscherm → Getallenbos → 3 missies → resultaat → terug.
- Code: `src/math` (opgaven, keuzes, controle), `src/missions/getallenbos.ts` (content),
  `src/state/session.ts` (missieflow-reducer), `src/state/progress.ts`, `src/presentation/*`.
- `npm run check` groen (26 unit-tests). Volledige flow geverifieerd in headless Chromium op
  744×1133 en 1180×820 met touch: fouten, hints, dubbeltik, resultaat, voortgang na herladen.
- GitHub Pages is nog **niet** ingeschakeld; de deploy-job faalt tot dat gebeurt.

## Let op
- Push naar `main` = deploy. Afspraak: na elke commit direct naar `main` pushen.
- Pages-pad is hoofdlettergevoelig: `/RekenWereld/`.
- Hook activeren per clone: `git config core.hooksPath .githooks`.
- Niet getest op echte iPad: Web Speech-stem, Safari-touch, beginscherm-modus.
