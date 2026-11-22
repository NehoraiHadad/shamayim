# N1e — fix round: cover fit, warm scrub, sparse RMS, N2 hooks

The Opus review of N1c and N1d (round 3) returned **fix first**. The field core is close, but N1c's overcast closure
broke two scene tests that pass on main, and the warm scrub is still about 3 ms. Fix everything below in this branch,
without committing. Measure on a quiet run: `FIELD_PERF=1 npx vitest run src/world/field/density.test.ts` alone.

## Must fix
1. **The overcast closure is physically wrong** (`src/world/cloudsCover.ts:34-43`). From 95 % total it lifts every
   layer toward full. In the fixture at 15:00, a 29 % high layer becomes 55 %, which blocks the sun.
   - Physics: a total near 100 % means the dominant deck is nearly closed. It says nothing about a patchy minor layer,
     so sun through a 30 % cirrus layer is correct.
   - Replace the closure with `fitLogs`, which refits the clear-share logs to the shown union, floored at 0.1 % clear:
     - below the forecast union, one power for all layers (main's behaviour);
     - above it, the extra depth goes to the layers by |log|^8, so the dominant deck closes.
   - Add the `thickCloud` lower bound on low + mid. The forecast branch ignores the shown `thickCloud` today, and
     "casts no shade … under a full overcast" needs it.
   - The reviewer's tested code is in `briefs/N1e-cover-fit.ts.txt`. Use it, keep the files under 150 lines, and comment
     why each branch is physical.
   - Tests:
     - `cloudsCover.test.ts:19`: change `toBe(1)` to `≥ 0.999`.
     - `field.test.ts:92`: the assertion forces a 25 % layer to full, which tests the bug itself. Replace it with
       union ≥ 0.999 and the minor layers within 0.05 of their 98 % values.
     - Keep the 0.98 → 1 sweep: the largest step per 0.001 of total must be ≤ 0.03.
   - **Must pass:** `src/scene/model/planes.test.ts` and `src/scene/model/livingLight.test.ts` (high step < 0.02 per
     minute). Run them.
2. **Warm scrub ≤ 2.6 ms.** Measured: snapshots 1.97 ms, lookups 1.13, far strips 0.13. Lookups past the raster edge
   cost 1.6–2.4× an inner lookup.
   - Cache the expected-field clump value (`density.ts:97-104`) in a lazily filled, coarse air-frame grid per place and
     lattice, read bilinearly. It is pure memoisation. Estimated saving 0.4–0.5 ms.
   - Make the cell `id` in `cells.ts` (`fieldCell`) lazy or numeric. Estimated saving 0.1–0.2 ms, mostly tower.
3. **Sparse-cover RMS fails unseen.** The test checks only the fixture mix. At covers of 0.15 / 0.1 / 0.2 the RMS is
   low 10.8 %, tower 8.2 %, mid 5.2 % and high 5.9 %.
   - Add sparse and overcast cases to `density.test.ts:16-37`.
   - Fix the raster until they pass. Low uses a 0.125 km step against cells with r ≈ 0.36 km, so a node-centred or
     analytic coverage-area sample may be needed.
   - Or argue with numbers for a metric in transmission space, `exp(−τ)`, which is what light and painting actually see.
4. **The tower cover jumps at weather-code edges** (+0.30, +0.20, −0.50). The code-edge allowance in
   `continuity.test.ts` lets the share jump by up to 1.
   - Cross-fade the convective weight over ±30 min around hour edges, in the app's path (`src/world`, where the code
     drives tower cover).
   - Remove the allowance, and hold code edges to the same ≤ 0.15 bound as every other minute.
5. **Timing guard** (`density.test.ts:73`): the 3× guard lets a 9 ms warm scrub pass.
   - Replace it with a ratio check: time a fixed reference loop in the same process and assert warm ≤ N × reference.
     Calibrate N so it passes on a quiet machine with 30 % margin, and flags a real 1.5× regression under load.
   - Keep `FIELD_PERF=1` for the absolute budgets.
6. **The report is wrong** (`N1-report.md:85`). N1d reverted N1c's 32×32 tiles to a full `Float32Array`
   (`rasterNodes.ts:3`) without saying so.
   - Correct the claim and document the revert, with timings for both.
   - Keep whichever is faster, and say why.
7. **N2 hooks**, needed next round:
   - `tauAt` returns `floorTau` beyond `radiusKm`, not 0 (`density.ts:108`).
   - Add `shadowTau(snapshot, x, y, sun)`: τ at the ground point p, read at p + h·cot(alt)·(toward sun) per layer, with
     h the layer's height above ground. Reuse the snapshot grid; no new grid per point.
   - Add a rain weight per cell, and a lookup from a grid point to the cell that drives it.
   - Document how column τ becomes slant τ for direct light: `τ/sin(alt)` for a sheet. State the bound for a finite
     cell.
   - `layerSnapshot` takes a centre and radius, not a fixed (0, 0).

## Precision
Pay attention to subtleties and physical accuracy. Real cloud heights and sizes; ellipse areas; wind is "from", so it
blows toward from + 180; km/h ÷ 60 = km/min; above-ground versus sea-level heights; the sun's azimuth convention. No
unstated approximations: every approximation gets a comment with its error bound, computed, not guessed.

## Rules
- Never run a multi-line `npx tsx -e "..."`: on this Windows shell it waits on stdin and hangs. Write a temp script
  file and run `npx tsx <file>`.
- Pure and seeded: no `Math.random`, no `Date.now`, no clock. Caches are deterministic memoisation only.
- Files ≤ ~150 lines, DRY, meaningful names. Remove dead code you make.
- Edit only `src/world/` (field, clouds, cover, air/weather-code interpolation for item 4, and their tests), `scripts/`
  and the report. Do not commit.
- Run only:
  - `npx tsc -b`;
  - `npx oxlint src/world scripts`;
  - `npx vitest run src/world src/scene/model/planes.test.ts src/scene/model/livingLight.test.ts`, or single files;
  - the calibration script.
  Rerun as often as needed. No full suite, perf or Playwright: CI runs them.
- Append `## Round 5` to `docs/design/qa/polish/track-d/N1-report.md`:
  - per-item changes;
  - final measured numbers from the final code: RMS per layer and mix, the three timing medians, the warm profile, and
    continuity worst cases including code edges;
  - anything not done.
