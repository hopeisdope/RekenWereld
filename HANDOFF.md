# Handoff — 2026-10-16

Beknopte stand voor een nieuwe sessie. Details staan in `WORKLIST.md`.

## Stand
- Fase 0 staat op `main`. Afspraak: na elke commit direct naar `main` pushen.
- Lokaal geverifieerd: `npm run check` groen; build onder `/RekenWereld/`; SW-scope correct;
  app laadt offline (headless Chromium).
- Repo is publiek; GitHub Pages is nog **niet** ingeschakeld; workflow heeft nog nooit gedraaid.
- Er is nog geen gameplay: `src/main.ts` toont alleen een placeholder met startknop.

## Let op
- Push naar `main` = deploy. Zolang Pages-bron niet op "GitHub Actions" staat, faalt de deploy-job (build slaagt wel).
- Pages-pad is hoofdlettergevoelig: `/RekenWereld/`.
- Hook activeren per clone: `git config core.hooksPath .githooks`.
