# Brief: the seam between the scene and the sheet

Shamayim is a Hebrew RTL weather PWA (phone-first, 375 px). Top: a sky gradient with the temperature, a summary and an
hourly strip, ending in a drawn valley scene (SVG, viewBox 375×128: far ridge, near ridge, village, sun/moon).
Below: a paper "sheet" (what to wear on a clothesline, daily forecast rows).

**The owner says the transition between the two parts is still not good enough**, after several rounds:
1. A hard horizontal line → replaced by a drawn "bank": a wavy SVG path on top of the sheet (`src/ui/Sheet.tsx`, `BANK`),
   filled with `--sheet`, stroked at 22% ink. The scene overlaps it by 14 px (`margin -14px`).
2. The sheet's paper colour follows the real sun (`src/theme/sheetLight.ts`): light by day, a dusk/night dark paper at night.
3. The clothesline is tied to the bank (`src/ui/wear/WearLine.tsx`).

Look at the stills (open them):
- `docs/design/qa/seam-0620-zoom.png`: now, 06:20, just after sunrise. The near ridge is near-black navy and stops
  abruptly on near-white paper. The bank wave is barely readable; it reads as "a dark slab, then a white page".
- `docs/design/qa/seam-0620-full.jpg`: whole screen, same moment.
- `docs/design/qa/seam-after-day.jpg`, `seam-after-night.png`, `bank-dawn.png`, `glow-dusk-west.png`: other moments.

Code to read: `src/ui/scene/ValleyScene.tsx` + `.module.css`, `src/ui/scene/terrain*` (ridge points and colours),
`src/ui/Sheet.tsx` + `Sheet.module.css`, `src/theme/sheetLight.ts`, `src/index.css`, `src/App.tsx`,
and the design docs in `docs/design/` (SPEC.md, ILLUSTRATION.md, CALM-LIFE.md).

## What I want from you
Diagnose **why** the seam still fails visually (be concrete: values, contrast, shapes), then recommend **one** direction
(not a menu) with exact implementation notes (files, CSS/SVG values, what to remove). It must hold at every time of day
and weather, keep text contrast ≥ 4.5 on the sheet, and stay calm (no new decoration for its own sake).
Keep it under ~500 words. Do not edit files.
