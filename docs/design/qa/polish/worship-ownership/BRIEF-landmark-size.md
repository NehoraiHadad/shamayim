# Famous landmark icons: size by screen px, not a ratio (owner delegated, 2026-11-22)

New branch `claude/fix-landmark-size-3b7e` from origin/main 9dd0061d (the worship-ownership work, rounds 1–7, is
merged). Same process rules: targeted test files only, `npx tsc -b`, `npx oxlint`; never whole folders; never a
multi-line `npx tsx -e`; never call live services; do not commit; do not touch `src/test/probe*`.

## Problem

Famous non-own landmarks (fame 2 or curated; `isFamousLandmark`) are drawn at `max(trueHeight, LEGIBLE_PX)` with no cap:
27 icons need 40–100× and one 400× (REPORT.md Round 7 histogram). A 400× icon no longer reads as far.

## Decision (owner delegated to the audit lead: "מה שאתה חושב שנכון")

1. **Height in screen px.** For famous non-own landmarks only: drawn height = `clamp(trueHeight, LANDMARK_MIN_PX = 6,
   LANDMARK_MAX_PX = 16)`, CSS px (1× DPR). Width scales with the same factor. A landmark already ≥6 px at its true size
   is not enlarged; a far one is enlarged only up to 6 px; nothing is drawn above 16 px (a true size >16 px is drawn at
   16 px: state this in the constant's comment, with why 16 keeps an icon an icon next to home houses at 375 px).
   Justify 6 against the glyph specs at DPR 2. Keep the factor recorded on each glyph. Ordinary non-own marks keep
   4 px / 2×; owned portraits unchanged. One shared helper (`neighbourSize.ts`); pre-selection uses the same policy (a
   famous candidate still needs true visible height > 0).
2. **Reads as far.** A far landmark gets the same aerial perspective as the land at its true distance: haze and
   contrast (not only a haze tint). Find what the land/far-city masses use at a given km and feed the glyph the same
   inputs (painters stay pure). Never lighter or more contrasted than home roofs.
3. Everything else from rounds 1–7 holds: visible foot or terrain ridge, 6 px gap from the home roofline on the drawn
   box with ≤12 px slide, mosques never, non-famous non-own worship never.

## Tests

- Across the fixtures (117-place fast set and the 18 recorded panoramas, 375 and 1280 px, DPR 1 and 2): no famous icon
  is drawn above 16 CSS px; none below 6; an icon whose true height is in [6,16] has factor 1; true <6 is drawn at 6.
- Two famous icons at different true distances get different haze/contrast, the farther one closer to the sky/land
  at its distance; haze is computed from true distance (fails if from drawn size).
- Each must fail without its safeguard; say how you checked. Fast test stays under ~60 s per test.

## Evidence

Stills at 375 px, DPR 2, with `e2e/scene.stills.mjs` (`--describe --crop4x`), in
`docs/design/qa/polish/worship-ownership/stills/landmark-size/`: Dafna → Nimrod (flat 100 m, labelled), Karmei Tzur
(clean), and one more place that keeps a famous landmark at a different distance (prefer a recorded panorama if any
keeps one; else flat, labelled). README per glyph: kind, true px, drawn px, factor, haze km, gap.

## Docs

REPORT.md `## Landmark size` (decision, constants, histogram of drawn px and factor before → after over the full
audit; re-run the audit probe in the background); TASKS.md worship section updated.
