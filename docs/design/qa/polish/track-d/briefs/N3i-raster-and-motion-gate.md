# N3i: finish N3h (extend the low raster by the footprint rule; a motion-compensated continuity gate)

N3h (uncommitted in the worktree, Round 15) blocked with 3 failing tests. Decisions by Claude (Track D owner):

## 1. Scope extension: the shared density raster
- You may edit `src/world/field/density.ts` and `cells.ts` (and their tests).
- The low lattice resolves cells to 8.5 km and fades to the ensemble at 10 km (`RANGES.low[0] = 10`), while
  Jerusalem's 5° ray reaches 15.8 km. So the 5–20° band can't show cells no matter how fine the sheet is.
- **Replace the fixed near range with the same footprint rule the sheet uses:** cells stay resolved out to the range
  where a mean element diameter `2·r̄` still spans 2 sheet texels at that ray's elevation, for the Sc/Ac sheet
  resolution.
  - Derive the range per lattice from the geometry: base height, r̄, and the texel angular size in both axes. Do not
    tune it per place.
  - If it is cheaper, express it as a fixed range derived once per lattice from the worst-case place height, with
    that derivation in a comment.
  - Shadows and `light.eye` read the same raster, so they stay consistent. Re-run the field tests.
- **Perf:** report the `tauAt` raster build cost and the sheet increment, against a budget of ≤ 1.5 ms CI-equivalent.
  If it goes over, use the cheapest bounded option and report it:
  - cap the range at the footprint rule, not beyond;
  - build the far annulus at a coarser bin step.

## 2. Replace the per-texel Δα continuity gate with a motion-compensated one
- N3h made the sheet instantaneous (correct: one world state). Real motion of a low deck at 1.2 km and 10 km/h is
  about 8° of sky per minute overhead. A sharp cell edge then changes a texel from clear to opaque within one minute.
  That is real motion, not a cut, so the old raw Δα ≤ 0.15 gate is physically wrong for resolved edges.
- **New gate:**
  - Warp the minute-t alpha grid by the field's own advection: move each texel's ground point by `vel × 1 min` and
    re-project.
  - Compare the warped grid with minute t+1.
  - The residual p99 must be ≤ 0.15 and the max ≤ the Beer–Lambert kernel-slope bound + 0.02, per lattice.
  - This catches reseeds, lifecycle pops and handover cuts, but not true advection.
  - Keep the separate mean-alpha/mean-tone minute test (N3g) unchanged.
- Apply the same idea to the 23:00–01:00 scrub test only if it uses per-texel raw Δα. Otherwise leave it.

## 3. The remaining gates
- **No flat band** (row alpha SD ≥ 0.08 between 5° and 20°), and the **lowest-10° row jump ≤ 0.03**: these should
  follow from item 1. Report both. If a row jump remains at the new hand-off, widen the hand-off smoothstep, deriving
  it from the footprint.
- **Haifa upper tone spread 0.116 vs 0.12:** report which change moved it (the shading-only texture, or the
  instantaneous depth). Lower that gate only with a physical reason, stated in the test comment. Otherwise restore
  the spread.

## Precision
- Every constant carries its source. No per-place tuning. Report all numbers per place.

## Rules
- Never run a multi-line `npx tsx -e`. Use a temp script and `./node_modules/.bin/<tool>`.
- Pure, seeded, no clock. Files ≤ ~150 lines, DRY, no dead code. Do not commit.
- Run `tsc -b`, oxlint on the touched files, and vitest with explicit paths: the cloudSheet tests, `sky.test.ts`,
  `weather.test.ts`, `model.test.ts`, `c10fixes.test.ts`, `field.test.ts`, `continuity.test.ts`, `density.test.ts`,
  `transmit.test.ts`.
- Append `## Round 16 (N3i)` to `N2-report.md`.
