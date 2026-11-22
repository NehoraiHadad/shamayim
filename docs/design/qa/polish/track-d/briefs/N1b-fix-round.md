# N1b — fix round for the cloud field core (`src/world/field/`)

You wrote N1 (commit 6399e95). An independent review (Claude Opus) measured it and returned **fix first**. Fix every
must-fix and should-fix below, in this branch, without committing. Read `briefs/N1-field-core.md` and
`SPEC.md` §0–3 and §6.0 again first: §6.0 is new. It says layers are drawn as continuous density textures, so the
query path must serve a dense per-scrub density read cheaply.

## Budget (hard)
The whole scene model gets 10 ms per scrub (`npm run test:perf`), and main is already over it. The field's share must
be well under that.
- `buildField`: ≤ 1 ms warm.
- Everything one scrub needs from the field: ≤ 3 ms warm and ≤ 15 ms cold, for all 4 layers over the panorama.
- The measured baseline is 0.2–2.4 s.

## Must fix
1. **The site cache thrashes.** `lattice.ts` keeps 2 blocks shared by 4 layers, and each switch rewrites a 1.3 MB array
   and rebuilds the sites. Fix:
   - Key the cache by place and lattice, with 2 blocks each.
   - Mark filled entries with a stamp array instead of clearing the block.
   - Hash the place and lattice id once, then mix the integer `i, j` into that seed with no strings.
   - Cache the noise corners per place and lattice (`clumpAt` hashes 8 strings per site today).
   - Skip sites with `rank > Q + 0.25` before building any object.
   - Build the string id only for cells that are emitted.
2. **Enumerating cells out to the panorama range can't fit the budget.**
   - Enumerate cells individually only within the individual range: low 10 km, tower 80, mid 40, high 120.
   - Beyond that, serve far strips from per-bin expected cover, `1 − exp(−Λ·…)` modulated by `clumpAt`.
   - Add **`densityAt`** support: once per scrub, rasterise the visible cells' τ into a coarse air-frame grid per layer
     (about 250 m low, 1 km mid, 4 km high, sized to the range).
   - Expose `densityGrid(field, layer, cx, cy, radiusKm, t)` returning `{ tauAt(x, y) }`, with a bilinear lookup. It
     must be pure: same inputs, same grid.
   - The shading march and the sheet painter will read this grid. Test that it agrees with the exact `cellsAt` τ sum to
     within 5 % RMS.
3. **A change in steering height moves the whole layer.** Today +100 m of z moves the low layer 12–23 km, and the
   hourly cloud-base change re-deals the clouds. Use a fixed steering height per lattice per day: the median of the
   hourly z over the forecast `hours` for that day, pure. Or integrate with a per-hour z inside the cached timeline. A
   cloud-base change must not translate the layout.
4. **Genus is drawn from the occupancy rank**, so the first cells to appear are all strat, sheet or veil (66 % Sc at
   strat 0.25). Give each site a separate seeded genus draw `ug`, compared against `strat`, `sheet`, `veil` and `conv`.
5. **High clouds are calibrated as discs whose radius is the half-length.**
   - Carry `rMinor` (width = length / 3) and `axis` (the wind direction at the high steering level) on high cells.
   - Calibrate and test coverage with elliptical footprints, and use the real a0.
   - Regenerate the correction table after fixes 1–5, since the layout changes.
6. **Test 1 is in-sample.**
   - Fit on seeds and places A; test on held-out seeds and a different place B.
   - Add mid-knot covers: 0.02, 0.15, 0.4, 0.6, 0.85, 0.95.
   - Use a 300 km window, or enough windows, for high.
   - Keep the tolerance at 0.04 absolute.
   - Say in the test that c ≥ 0.98 is the floor rule.
7. **Test 4 holds everything constant except the clock, and takes 52 s.** Replace it with about 300 minute pairs:
   - every hour boundary (h−1→h and h→h+1);
   - both midnights;
   - about 100 seeded random minutes;
   - covers, `lowBaseKm` and code taken from the fixture hours, the way the app derives them (`layerCovers`,
     `lowBaseM` in `src/world/clouds.ts`).

   Same assertions as now. It must run in under 2 s with the default timeout.

## Should fix
8. The 10 m wind knot is above ground: put it at `elevationKm + 0.01` and keep the knots in order.
9. Cb: the SPEC gives the top at 8–12 km, so thickness = top − base.
10. Motion keyframes: use `displacement(t + dt)` exactly, not extrapolation at constant velocity.
11. `cellsAt` neighbourhood: size it from the maximum radius (lognormal tail clipped at p99) divided by the pitch,
    not a fixed 3×3 or 5×5.
12. The no-forecast path: use a fixed epoch, not a reset every midnight and a reseed per date.
13. A missing 10 m wind direction: say what the fallback is and set the `derived` flag (SPEC §2).
14. **Cumulus lifetime:** restore T = 20–40 min, and lower the rank amplitude so the per-minute share change is
    ≤ 0.15 at T = 20. Give the share fade `smoothstep(0, 0.125, Q)` a comment stating its effect.
15. Move `calibrate.cjs` to `scripts/calibrate-cloud-field.ts`, run with `npx tsx`.
    - Move `calibration.ts` (test and script support) out of production `src/`, or mark it as a test helper.
    - Make the evaluation loop one shared function (it is written twice today).
16. Remove dead code:
    - `rateMmH` (unless N2 needs it; if so, say so in a comment);
    - the unused `rank` returned by `siteAt`;
    - the `placeId = ''` default.
    - Make `formOf` per layer, or say why it is shared.
17. The `stratus`/`nimbostratus` base switch must not move the layout (it falls under fix 3).
18. Put units in the comments: `t` in minutes, `sunAltitude` in degrees, km on x/y/r, and what `Q` and `g` are.
19. Strengthen the tests:
    - Projection: sweep d from 0 to 300 km for monotonicity, every cell, including d < R.
    - Test 5: match by direction against any cell, not only by id.
    - Timing: measure a whole scrub over 4 layers (realistic interleaving), cold and warm, against the budget above.

## Precision
Pay attention to subtleties and physical accuracy. Real cloud heights and sizes; ellipse areas; wind is "from", so it
blows toward from + 180; km/h ÷ 60 = km/min; above-ground versus sea-level heights. No unstated approximations: every
approximation gets a comment with its error bound.

## Rules
- Never run a multi-line `npx tsx -e "..."`: on this Windows shell it waits on stdin and hangs. Write a temp script
  file and run `npx tsx <file>`.
- Pure and seeded: no `Math.random`, no `Date.now`, no clock. Caches are deterministic memoisation only.
- Files ≤ ~150 lines, DRY, meaningful names.
- Edit only `src/world/field/`, `scripts/` and the report. Do not commit.
- Run only `npx tsc -b`, `npx oxlint src/world/field scripts`, `npx vitest run src/world/field` and the calibration
  script. No full suite, perf or Playwright: CI runs them.
- Append a `## Round 2` section to `docs/design/qa/polish/track-d/N1-report.md` with:
  - what changed per item;
  - the measured timings (cold and warm, per scrub, 4 layers);
  - the new calibration table with held-out errors;
  - anything you could not do, and why.
