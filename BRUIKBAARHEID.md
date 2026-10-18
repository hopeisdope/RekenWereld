# Bruikbaarheidscontrole (fase 7) — 2026-10-18

Eindcontrole gericht op een kind van 6 jaar dat nog nauwelijks leest. **Er is geen test met
een kind gedaan.** Alles hieronder komt uit codeonderzoek, de geautomatiseerde tests en
headless Chromium-sessies op iPad-formaten (744×1133, 1133×744, 1180×820) met
touch-emulatie. Gedrag op een echte iPad (Safari, stemmen, vingers) is niet gecontroleerd.

## Bevindingen

Ernst: **hoog** = kind verliest voortgang of loopt vast; **middel** = opdracht onduidelijk
of beloning mist; **laag** = hinderlijk, niet blokkerend.

| # | Bevinding | Ernst | Status |
|---|-----------|-------|--------|
| 1 | 🏠 tijdens het vieren van de laatste opdracht: ronde telt niet | hoog | opgelost + test |
| 2 | Terugspringen op de getallenlijn kreeg nooit een voorbeeld | middel | opgelost + test |
| 3 | Voorwerpen en vakjes bij slepen kleiner dan 88 px | laag–middel | deels opgelost + test |
| 4 | Stenen op de getallenlijn 0–20 zijn smal (29 px op iPad mini staand) | laag | open |
| 5 | Stenen 0–10 op iPad mini staand 54 px (afspraak ≥ 56 px) | laag | open |
| 6 | Na lang niets doen in een gewone opdracht komt geen hulp | laag | open, observeren |
| 7 | Vergelijken tot 20 (concreet) kan een lege knop (0 voorwerpen) tonen | laag | open, observeren |
| 8 | Een onderbroken ronde vervalt als het kind een andere missie start | laag | bekend (WORKLIST) |

### 1. 🏠 tijdens het vieren van de laatste opdracht — voortgangsverlies (hoog, opgelost)
- **Reproductie:** speel een ronde tot en met de laatste opdracht, tik binnen 1,4 s na het goede
  antwoord op 🏠 (of sluit de app in die tijd).
- **Was:** geen eindscherm, geen dier en geen ster; de volgende missie bleef dicht. Het bewaarde
  hervatpunt wees één opdracht te ver (index = aantal opdrachten) en werd bij het opstarten
  afgekeurd, dus na herladen was **de hele ronde weg**.
- **Oplossing:** de ronde wordt bewaard zodra de laatste opdracht goed is (`onRoundDone`), vóór
  het vieren. 🏠 tijdens dat vieren toont meteen het eindscherm met de verdiende beloning
  (`screens/mission.ts`, `app.ts`).
- **Regressietest:** `e2e/touch.cjs` stap 11.

### 2. Terugspringen zonder voorbeeld (middel, opgelost)
- **Reproductie:** speel rivier ronde 1 (vooruit springen, met voorbeeld) en start ronde 2: de
  eerste opdracht is terugspringen (⬅️), zonder voorbeeld.
- **Oorzaak:** vooruit en terug hadden dezelfde voorbeeldsleutel `jump/numberline`.
- **Oplossing:** eigen soort `jumpBack` met een eigen voorbeeld (5−2, 6−2, 7−2). Wie
  vooruit al heeft gezien, krijgt terug één keer voorgedaan. Geen schemawijziging nodig:
  oude hervatpunten met `jump` blijven werken.
- **Regressietest:** `tests/guidance.test.ts` (eigen voorbeeld na vooruit), `e2e/nonreading.cjs`
  verwacht nu ook `jumpBack`.

### 3. Sleep-voorwerpen en vakjes onder 88 px (laag–middel, deels opgelost)
- **Gemeten:** voorwerpen in de voorraad 71 px (iPad mini) / 78 px (iPad); vakjes in de mand
  63 / 70 px.
- **Gevolg:** een tik precies tussen twee voorwerpen deed niets. Welk voorwerp of vakje
  geraakt wordt maakt niet uit (alle voorwerpen zijn gelijk; een gelegd vakje aantikken haalt
  altijd het laatste terug), dus alleen de tussenruimte was een probleem.
- **Oplossing:** een tik ergens in de voorraadrij (behalve op ✔) legt een voorwerp; de hele
  voorraadbak (≥ 92 px hoog, bijna schermbreed) is nu één doel. Regressietest: `e2e/touch.cjs` stap 12.
- **Open:** de voorwerpen en vakjes zelf zijn niet groter gemaakt (dat vergt een andere indeling
  van de mand op iPad mini liggend). Ofwel als uitzondering in `CLAUDE.md` vastleggen, ofwel
  later de indeling aanpassen.

### 4–5. Getallenlijn-stenen (laag, open)
- 0–20 op iPad mini staand: 29 px breed, liggend 41 px. 0–10 op iPad mini staand: 54 px.
- Niet blokkerend: ⬅️/➡️/✔ (≥ 88 px) zijn de hoofdbediening; een steen aantikken is een snelkoppeling,
  en een verkeerde steen is met ⬅️/➡️ te herstellen. Voorstel als het kind toch op stenen tikt: op
  de lijn tot 20 de stenen niet aantikbaar maken, of de lijn in twee rijen tonen.

### 6. Geen hulp bij niets doen in een gewone opdracht (laag, observeren)
- Bij *zelf proberen* wijst de hand na 5 s. In een gewone opdracht komt de hand pas na
  2 fouten (bij meer dan 3 keuzes); bij niets doen gebeurt er niets. ❓ speelt het voorbeeld af.
- Bewuste keuze (de hand zou het antwoord verklappen). Observeren of het kind ❓ uit zichzelf vindt.

### 7. Lege vergelijk-knop (laag, observeren)
- Vergelijken niveau 3 (0–20) staat in voetstappen ronde 3 als concrete opdracht; bij het getal 0
  is de knop leeg. Rekenkundig klopt het (de andere groep is "meer"), maar het kan vreemd ogen.
  Voorstel als het verwart: ondergrens 1 voor dat niveau in `src/math/skills.ts`.

## Per controlepunt

| Vraag | Uitkomst | Hoe gecontroleerd |
|-------|----------|-------------------|
| 1. Starten zonder lezen | Eén grote ▶, uil wijst ernaar; overige knoppen klein in de hoeken | e2e `nonreading` 1 |
| 2. Missie herkennen via beeld | Iconen, gloed + 👇, uil staat ernaast; dichte missie schudt | e2e `nonreading` 2–3, 9 |
| 3. Eerste opdracht via voorbeeld | Elke soort + bediening heeft een voorbeeld; **terugspringen ontbrak** (#2) | unit + e2e |
| 4. Antwoorden zonder precisie | Knoppen ≥ 88 px; slepen altijd met tik-alternatief; ⬅️/➡️ op de lijn; **#3–5** | audit-script, e2e `touch` |
| 5. Na een fout | Knop grijs + schudt, uil denkt, visuele hint (getallen/voorwerpen), na 2 fouten wijst de hand; nooit vast | e2e `nonreading` 6, 9c |
| 6. Grootte knoppen/plaatjes | Alles ≥ 88 px behalve #3–5 en de bewust kleine ouderknoppen (🔊, 👪: 64 px) en dieren in de verzameling (64 px, alleen decoratie) | audit-script op 3 formaten |
| 7. Zelfstandig door | Na goed antwoord automatisch door (1,4 s); eindscherm → grote ▶ → kaart wijst volgende aan | e2e `nonreading` 7–9 |
| 8. Beloning zonder tekst | Dier springt in beeld, ster vliegt in de rij, 🔓 + icoon van de nieuwe missie, geluid | e2e `nonreading` 8, screenshots |
| 9. Stoppen en verder | 🏠 overal; hervatten na 🏠 en na herladen; **verlies bij 🏠 tijdens vieren** (#1) | e2e `touch` 2, 11 |
| 10. Voortgang en offline | Voortgang na herladen, kapotte/volle/oude opslag, koude offline start, update | e2e `progress`, `offline` |

Rekenlogica: generatoren, antwoorden, afleiders en voorbeelden nagelopen; geen fouten gevonden.
De unit-tests controleren voor elke opgave dat het antwoord klopt met de operanden
(`isConsistent`), dat keuzes het antwoord bevatten en dat er nooit hetzelfde getal na elkaar komt.

## Wat nog observatie met een kind vraagt
Zie ook HANDOFF.md. Vooral:
- Vindt het kind ❓ als het vastzit (#6)? Tikt het op 🏠 tijdens het vieren?
- Tikt het op de stenen van de getallenlijn tot 20 of gebruikt het ⬅️/➡️ (#4)?
- Snapt het terugspringen na het nieuwe voorbeeld?
- Lukt slepen/tikken in de mand op de iPad mini zonder misser (#3)?
- Begrijpt het "meer" bij vergelijken met alleen getallen, en een lege knop (#7)?
