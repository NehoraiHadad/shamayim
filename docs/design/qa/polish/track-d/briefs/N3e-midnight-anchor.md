# N3e: a refresh after midnight must never move the clouds

Track A's final review rated this MEDIUM, and it predates N3. The field's seed offset (`src/world/field/field.ts:20`,
`hashId(placeId:steering.date:lattice)`) and its integration origin (`advect.ts`, `midnight` = the forecast's first
midnight, `origin` in `at()`) both come from the forecast's start day. The forecast includes yesterday
(`past_days=1`), so the first refresh after local midnight moves that start by a day. That reseeds the 500 km offset
and re-anchors the wind integral. Live mode now eases each weather arrival over 10 minutes (main 7ae0286), so every
cell then slides hundreds of km instead of cutting.

## Must do
1. **Anchor each field to the calendar day of `at`, never to the forecast's start.**
   - Day field k covers the local day `D_k`. Its seed is `placeId:D_k:lattice`. Its origin is the cumulative wind at
     `D_k` 00:00, interpolated by the same trapezoid `at()` uses, from any forecast that contains that minute.
   - With `past_days=1`, both the before-refresh and after-refresh forecasts contain today's midnight, so the same
     `at` gives the same field.
   - If a forecast lacks `D_k` 00:00, use its first sample and name the fallback in a comment and in the report. Do
     not fail.
2. **Hand over at midnight without a cut.** The scrub must stay continuous across midnight; `continuity.test.ts`
   already requires two midnights.
   - Over `[midnight − 30 min, midnight + 30 min]`, the outgoing day field's cells dissolve and the incoming day
     field's cells form, through the existing lifecycle (`share`, `shareOf(rank, Q)` in `occupancy.ts`).
   - Pick by rank, so that the union's occupancy stays calibrated: the outgoing field keeps its sites with rank below
     `Q·(1−w)` and the incoming one keeps those below `Q·w`, where `w` is a smoothstep over the window. State why the
     expected cover is preserved, given that the two fields are independent Boolean processes, and correct for it if
     it isn't.
   - Each field advects by its own origin, both with the same wind, so their motion agrees.
   - Use the existing seeded lifecycle (no `Math.random`, no clock).
   - **Morph, don't swap.** Being true to nature means the handover must not read as the sky changing. Rank-preserved
     cover is the floor, not the bar.
     - Pair each incoming cell with the outgoing cell of the same lattice and genus whose footprint overlaps it most.
       Use a greedy, deterministic match by overlap area, with ties broken by id.
     - Over the window, interpolate each pair in place, with `w`: centre, r, rMinor, axis (the shortest way round),
       tau0, vKm and rainWeight. The pair is one cell with a stable id for the window, so shadows, light and rain move
       with it.
     - Only unpaired cells dissolve or form through `share`.
     - Report the paired fraction per lattice for overcast and for broken cloud.
3. **Tests** (`field.test.ts` / `continuity.test.ts`):
   - **change metric:** the mean |Δ vertical τ| over a fixed 41 × 41 world grid within the raster range, 23:50 → 00:10,
     is ≤ the same metric over 21:50 → 22:10 (any 20 minutes without a handover). Do this for an overcast fixture and
     a broken one at one place.
   - **refresh invariance:** build the same `at` (in the morning, at 23:50 and at 00:10) from a forecast starting
     D−1 and one starting D (the same hours, trimmed). Expect byte-identical cell lists in all three lattices.
   - **continuity:** a minute-by-minute scrub through 23:00–01:00 stays continuous by the existing continuity
     metric.
   - **cover through the handover:** mean world-area coverage at 23:45, 00:00 and 00:15 is within ±0.03 of cover.
   - Update the existing "integrates meteorological vectors from the midnight anchor" test (`field.test.ts:66`) to the
     new anchor, without weakening it.
4. **Memo keys.** `dailyOffsets` is keyed by the steering timeline. Make sure the cache can't serve a stale day field
   to a new forecast object for the same day. Purity: the same inputs give the same bytes.

## Precision
- Report the max cell displacement between the two forecasts at the same `at`. It should be 0, or the forecast-wind
  difference times the time since midnight; give the bound.
- No per-place special cases.

## Rules
- Never run a multi-line `npx tsx -e`. Use a temp script and `./node_modules/.bin/<tool>`.
- Pure, seeded. Files ≤ ~150 lines, DRY, no dead code.
- Edit only `src/world/field/` and its tests (plus the report). Do not commit.
- Run `tsc -b`, oxlint on the touched files, and vitest with explicit paths: `field.test.ts`, `continuity.test.ts`,
  `density.test.ts`, `transmit.test.ts`.
- Append `## Round 12 (N3e)` to `N2-report.md`.

## Evidence (after CI)
Claude runs CI stills at one place, overcast and broken: 23:20 / 23:40 / 00:00 / 00:20 / 00:40, and assembles a strip.
