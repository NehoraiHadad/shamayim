# N3d: make the sheet visible and true, and pay for it (after the 87c17c2 stills)

CI run 45003072757 at 87c17c2: stills succeeded, check failed. What it showed:

- **haifa 11:30 overcast:** the sky is one flat blue-grey wash. Faint old blobs from the bank painters still sit on top.
  There is no brightness variation near the zenith, no compression into bands toward the horizon, and no thinner,
  brighter places. SPEC §6.0 finding 1 is not met.
- **jerusalem 11:30 broken:** no sheet is visible at all, only the old blobs.
- **perf:** the sheet increment is 2.97 ms (Jerusalem) and 3.91 ms (Haifa), against a budget of 1.5 ms.
  `cloudShadowPanorama`'s increment gate (2.5 ms) now fails at 3.24 and 2.83 ms, because its "model with field
  minus model without shadows" now includes the sheets.
- `cloudSheet.test.ts`: 3 of 6 fail (continuity, mid dense-ray α 0.24, light agreement up to 0.36).

## Must fix (ranked)
1. **Tone from diffuse transmission. It must not saturate.**
   - `tone = 0.52 + 0.48·τ/(1+τ)` is flat for every τ above about 5, so an overcast deck (τ 10–60) comes out as one
     tone. A deck's underside radiance follows its diffuse (two-stream) transmission:
     - `Td = 1 / (1 + 0.75·(1−g)·τs)`, with g = 0.85 (water cloud) and τs = τv·m·texture;
     - so `Td = 1/(1 + 0.1125·τs)`, times the light reaching the layer from above (`light.eye`/`above`).
   - Map the tone as `tone = 1 − Td·above / aboveMax` into lit→body→shade. Use the per-place, per-hour light
     normaliser the clouds already use; never a per-frame image statistic.
   - Then an overcast deck from τ 10 to 40 reads from tone ≈ 0.47 to 0.82. The texture's thin places read brighter,
     and the horizon bands appear through the compressed rows.
   - The sun side: keep the sun-facing lift, but scale it by `exp(−τs)` (forward scattering through thin places only).
     A thick deck shows no silver lining.
   - Test: on an overcast fixture, the tone's p10–p90 spread is at least 0.12 within the upper half of the sky.
2. **Find out why the broken sky draws nothing.**
   - For jerusalem 11:30 broken (the CI still's inputs), log per lattice:
     - `sheetWeight`, `sheetBlend`, cover and genus;
     - the alpha mean, p90 and max;
     - the τv distribution.
   - Explain it, then fix the cause. Expected physics: broken Sc at a cover of about 0.6 is one textured field with lit
     gaps (§6.0 finding 3). If `sheetBlend` gates it out, that gate is wrong for Sc: use `sheetWeight` from the genus
     form (strat/sheet), not only from cover.
   - Test: on that fixture, the low-lattice alpha p90 is above 0.6 and the world-area coverage is within ±0.05 of
     cover.
3. **The old banks step aside fully.** Where `sheetBlend` = 1, that level's `deckOf` sheets, wash and heap banks have
   alpha 0. The overcast still must show no blob on top of the sheet. Convective cells, towers and horizon heaps stay.
   Test it.
4. **Perf ≤ 1.5 ms increment (CI), and isolate the shadow gate.**
   - Profile locally with one targeted vitest file at low priority, which is allowed.
   - Likely wins:
     - rows per lattice by the genus texture scale (a Cs veil needs about 16 rows, not 49);
     - columns by genus (St or Cs 24, Sc or Ac 48);
     - read τ from the raster grid by bilinear lookup instead of per-cell sums, if `tauAt` sums cells;
     - evaluate the noise octaves only where the footprint keeps them;
     - memo the high lattice per 5 minutes when its motion over 5 minutes is under a texel (compute and state the
       bound).
   - Fix `cloudShadowPanorama.test.ts` so that its increment measures shadows only: the baseline keeps the sheets.
   - Report the ms per place.
5. **One transmission convention.**
   - `light.eye` uses a "half-depth convention" per cell, while the sheet uses full slant depth. Exactly one of them is
     physically right for a ray from the eye through a whole cell to the sun. Say which, with the derivation. If the
     light is the wrong one, fix it there (`transmit.ts`, ours).
   - Gate the agreement at ≤ 0.20 per node on the three fixtures.
6. **Continuity gate from physics.** Replace the 0.08 limit with your derived kernel-slope bound per node:
   - observed |Δα| ≤ bound + 0.02 for all nodes;
   - p99 ≤ 0.15 overall.
7. **Mid dense ray at α 0.24.** Explain it (footprint blend toward expected, texture gap, or path fade?) and fix it,
   or show that the case is physically translucent and narrow the test's condition with the reason.

## Precision
- g, the 0.75 factor and every other constant carry their physical source in a comment.
- No per-place or per-frame tuning.
- After the changes, render the two stills locally only if you can do it without the browser harness. Otherwise CI
  will.

## Rules
- Never run a multi-line `npx tsx -e`. Use a temp script and `./node_modules/.bin/<tool>`.
- Pure, seeded, no clock. Files ≤ ~150 lines, DRY, no dead code.
- Don't touch `src/scene/paint/cloudSheet.ts` or the `cloudSheet` type. Do not commit.
- Run `tsc -b`, oxlint on the touched files, and vitest with explicit file paths only.
- Append `## Round 11 (N3d)` to `N2-report.md`.
