# Handoff — 2026-10-16

Beknopte stand voor een nieuwe sessie. Details staan in `WORKLIST.md`.

## Stand
- Fase 0 af op branch `fase-0-setup` (gepusht, nog niet gemerged naar `main`).
- Lokaal geverifieerd: `npm run check` groen; build onder `/RekenWereld/`; SW-scope correct;
  app laadt offline (headless Chromium).
- Repo is publiek; GitHub Pages is nog **niet** ingeschakeld; workflow heeft nog nooit gedraaid.
- Er is nog geen gameplay: `src/main.ts` toont alleen een placeholder met startknop.

## Let op
- Push naar `main` = deploy. Zonder Pages-bron "GitHub Actions" faalt de deploy-job.
- Pages-pad is hoofdlettergevoelig: `/RekenWereld/`.
- Hook activeren per clone: `git config core.hooksPath .githooks`.
