# N1d — close-out round for the cloud field core

N1c (commit 5c96188) landed well: 182 of 185 `src/world` tests pass, continuity and directions pass. Measured here
with `npx vitest run src/world/field/density.test.ts` run alone (median of 9 inside the test):
- tower near-field RMS **5.02 %** against ≤ 5 %;
- warm scrub **3.24–3.35 ms** against ≤ 3 ms (arrival and cold place pass alone).

Your report says the final numbers were "unverified under the no-retry instruction". There is no such rule: **rerun the
allowed commands as often as you need**, and every number in the report must come from the final code.

## Fix
1. **Tower RMS.** Reach ≤ 4 % (a margin, not 4.99). Choose the cheapest: a tower step of 0.4 km, or sampling at cell
   centres (half-step offset) if the bias is from corner sampling. Measure both, report RMS and build cost.
2. **Warm scrub ≤ 2.5 ms locally**, so CI machines pass the 3 ms test with margin. Profile where the time goes per layer
   (grid, lookups, far strips, cell lists) and put that table in the report. Keep the test limit at 3 ms.
3. **Tower continuity is untested**: the report says the continuity windows have zero tower occupancy. Add windows where
   the tower layer is occupied, with covers and code derived the app's way from fixture hours (a convective fixture day,
   code 80–99), so the tower's share and move bounds are exercised. If the app's tower cover jumps when the weather code
   changes, report the size of the jump and bound it with the same analytic test.
4. **`layerCovers` bound.** You note the smoothstep can move the closure weight 0.0748 per 0.001 step. Test the 0.98 → 1
   sweep over several layer mixes (e.g. 80/50/25, 95/80/40, 100/0/0, 30/30/30, 0/0/100). If any step moves a cover more
   than 0.05, widen the blend (for example `smoothstep(0.95, 1, total)`) and say what it costs in accuracy.
5. **File length.** `density.ts` is 165 lines and `clouds.ts` 158. Split each along a real seam (e.g. raster tiles vs
   expected far field; forecast parsing vs cover scaling) to stay under ~150.

## Precision
Pay attention to subtleties and physical accuracy. Real cloud heights and sizes; ellipse areas; wind is "from", so it
blows toward from + 180; km/h ÷ 60 = km/min; above-ground versus sea-level heights. No unstated approximations: every
approximation gets a comment with its error bound, computed, not guessed.

## Rules
- Never run a multi-line `npx tsx -e "..."`: on this Windows shell it waits on stdin and hangs. Write a temp script
  file and run `npx tsx <file>`.
- Pure and seeded: no `Math.random`, no `Date.now`, no clock. Caches are deterministic memoisation only.
- Files ≤ ~150 lines, DRY, meaningful names. Remove dead code you make.
- Edit only `src/world/field/`, `src/world/clouds*.ts`, `src/world/*.test.ts`, `scripts/` and the report. Do not commit.
- Run only `npx tsc -b`, `npx oxlint src/world scripts`, `npx vitest run src/world` (or single files in it) and the
  calibration script. No full suite, perf or Playwright: CI runs them. Regenerate the calibration table if the layout
  changed.
- Append `## Round 4` to `docs/design/qa/polish/track-d/N1-report.md`: per-item changes, final measured numbers (RMS per
  layer, the three timing medians, the per-layer warm profile, continuity worst cases including tower), anything not done.
