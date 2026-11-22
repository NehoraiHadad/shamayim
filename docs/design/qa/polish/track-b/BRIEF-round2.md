# Track B, round 2: review fixes

Worktree `P:\projects\Shamayim\.claude\worktrees\fix-mark-ownership-caed9e`. The round-1 change, which follows
`BRIEF-neon.md`, is uncommitted in the working tree; read `git diff` first. Do not commit, and do not touch
`src/test/probe/`.

## Precision

Pay attention to subtleties and physical accuracy: real geometry and scale, units (km against the 0.1 km `reach` of
place points; metres against px), data provenance, and no unstated approximations. Give every constant a comment
stating its physical meaning and where it comes from. Never cite "the brief" as a reason. Write no special cases for
particular places in `src/`. Keep painters untouched and new files under about 150 lines. Follow DRY.

## Fixes

1. **Seated marks at their true size** (`src/world/beyondMarks.ts`). A mark seated on a beyond block is drawn at its
   true `hPx`.
   - Take `h = GLYPH_SPECS[kind].h(hPx)` and `scale = hPx / h`, with `w = spec.w * scale`, exactly as `fit()` does for
     the plain layer (`marks.ts`, `building()`).
   - Drop the mark when `hPx < BEYOND_MIN_PX`. Reuse the constant the beyond towers already use; find it with grep.
   - Drop it as well when its box overlaps the dot (`boxAround(dot.x, dot.y, DOT_R)`) or a note box (`input.notes`).
   - A mark the land in front hides (its "over the crest" is 0) gets no seat.
2. **Pass `own` only for a home matched by name** (`src/world/outside.ts` `lieOf`).
   - Pass it only when the home cluster's `place.name` equals the place's `nameHe` (both trimmed). Expose a small
     `homeByName(clusters, name)` helper, or return how the home was found, so the rule is not duplicated.
   - In `placeBounds`, when no bounds point lies within the tolerance of `own`, fall back to the old strongest-claimant
     owner instead of returning null.
   - Result: a place with no name match, such as Shadmot Mehola, keeps the exact cell it had before the change.
3. **Cluster cache.**
   - Bump the cache key in `src/data/city/useCity.ts` (`shamayim:city:v5` to `v6`): clusters cached before the change
     have no `at`.
   - `clustersForCache(clusters, name?)` reserves the home found by `homeCluster(clusters, name)`. Pass the place's
     `nameHe` from its caller.
4. **Filters, the same for every religion** (`src/data/landmarks/filters.ts`). Restore the `[building]` condition on
   the Muslim place-of-worship filter, as for the Jewish one. Keep the new `tower:type=minaret` and `building=minaret`
   lines.
5. **`classify` order** (`src/data/landmarks/overpass.ts`). Restore the original branch order: highrise before church.
   Add a test showing that a church tagged 45 m is still `highrise`.
6. **Constant comments.**
   - `OWN_POINT_KM` in `bounds.ts`: state physically why 0.05 km. It is the tolerance for matching a cluster's node
     offset, which comes from the city data, to the same point in `bounds.json`, whose rings and points are
     simplified to about 40 m. If that is not the true reason, state the true one.
   - `worship.ts`: name and comment the 30 m tower default for what it is: any tower with evidence (a minaret,
     `man_made=tower`) and no height tag. Note that a church with `man_made=tower` now defaults to 30 m, where the old
     church default was 25 m. Either keep 25 m for church towers (a separate `BELL_TOWER_M = 25`, the old value) or
     justify one value. Prefer the separate constant.
7. **Tests that can fail** (`src/world/markOwnership.test.ts`).
   - Assert that for Karmei Tzur, `placeBounds` **without** `own` does not hold 'שבת אחים', so the test proves what the
     fix changes.
   - Replace "no minaret ≥ 20 m within 6 km" with an assertion that does not hold by construction. Assert instead that
     the loaded legacy minaret rows near Karmei Tzur carry `HALL_M`, and that a row with tagged evidence keeps its
     height. That second part belongs in `israelData.test.ts` or `worship.test.ts`.
   - Keep the synthetic seating case, but name it synthetic in the test title.
   - Add a negative case: a synthetic mark on a raster square with no drawn block, or a hidden one, gets no seat.
   - Add a size case: the seated mark's drawn height (`h * scale`) equals its `hPx`.
   - Add a Shadmot Mehola case: its `placeBounds` box is identical with and without the change. Compare against the
     box with `own` omitted.

Then run `npx vitest run src/data/landmarks src/data/city src/world/markOwnership.test.ts src/world/world.test.ts src/world/drawnSkyline.test.ts src/world/c10rules.test.ts src/scene/model/outside.test.ts`,
`npx tsc -b` and `npx oxlint`. All must be green.

End with a report:
- files changed, with one line each on why;
- the commands you ran and their results;
- every existing expectation you changed, and why.
