# Track B, round 3: second review fixes

Worktree `P:\projects\Shamayim\.claude\worktrees\fix-mark-ownership-caed9e`. Rounds 1 and 2 are committed in `9262908`
(intent: `BRIEF-neon.md`, `BRIEF-round2.md`). Read `git show 9262908 --stat` and the files named below first. Do not
commit, and do not touch `src/test/probe/`.

## Precision

Pay attention to subtleties and physical accuracy: real geometry and scale, units (km against the 0.1 km `reach` of
place points; metres against px), data provenance, and no unstated approximations. Give every constant a comment
stating its physical meaning and where it comes from. Never cite "the brief" as a reason. Write no special cases for
particular places in `src/`. Keep painters (`src/scene/paint`) untouched and new files under about 150 lines; do not grow
`src/world/outside.ts` or `src/world/marks.ts`, put new logic in small modules. Follow DRY.

## Fixes

1. **Landmark cache** (`src/data/landmarks/useLandmarks.ts:17`). Bump `shamayim:landmarks:v7` to `v8` with a comment
   (rows cached before this change carry the old 30 m / 25 m defaults). Add a test that a fresh `v7` entry is not used.
2. **Evidence travels with the rows** (`israelData.ts:57`, `scripts/landmarks/build.ts:92`). The index and the cells are
   cached separately by the service worker, so a stale legacy index can pair with a rebuilt cell. Write the evidence
   marker into each cell the build writes, e.g. `{ heights: 'evidence', rows: [...] }`. `loadCell` accepts both the
   legacy bare array (legacy defaults read as `HALL_M`) and the new object (heights as given). The index flag is then
   no longer the source of truth; remove it from the loader decision (keep or drop it in the index, your call, but DRY).
   Tests: a legacy array cell gives `HALL_M`; an evidence cell keeps a 30 m minaret.
3. **A seat must lie on its drawn block** (`src/world/beyondSeat.ts:116`). A mark's own projected x can fall outside
   the x span of the rectangle drawn for its raster square (perspective). Reject the seat unless the mark's projected x,
   and its glyph's half-width at that seat, lie within the block's drawn span `[x − w/2, x + w/2]` as `seatBeyond`
   computes it. Keep the mark at its own true x.
4. **Seat before the metre gate** (`src/world/marks.ts:202`). A settlement-kind mark beyond the place within
   `SKYLINE_TO_KM` goes to seating before the old 20 m filter; its pixel size (`BEYOND_MIN_PX`) decides, not its metres.
   The 20 m filter keeps applying to the other kinds. A 9 m hall on a drawn town block is drawn if it clears the px floor.
5. **One ownership rule for marks and blocks** (`marks.ts:55` vs `beyondSeat.ts:76`). Without bounds, `marksOf` adds a
   1 km margin to the place while the town blocks use the strict frame, so one spot can be both home and beyond. Use one
   shared predicate (exported from one module) for "is this point the place's own" for both settlement marks and town
   blocks when raster data is available.
6. **Tests that can fail** (`src/world/markOwnership.test.ts`, `src/data/city/clusters.test.ts`).
   - Separate synthetic cases, each failing without its safeguard: an off-centre mark whose x falls outside its block's
     span (no seat); a mark on a square with no drawn block (`seatMark` returns null, asserted directly); a mark hidden by
     the land in front on a visible block (`seatMark` returns null, asserted directly); a 9 m hall on a drawn block that
     is drawn (fix 4).
   - Shadmot Mehola: today's case compares two calls that both omit `own`, so it proves nothing. Instead, through the
     same path `lieOf` uses, give a place name that matches no cluster and assert its bounds equal `placeBounds` without
     `own`; and state in the test what the matched name changes.
   - `clustersForCache`: fill the budget with other clusters so the named home survives only when reserved; assert it is
     kept with the name and dropped without it.
7. **Name the inherited thresholds** (`beyondSeat.ts:75`): the 0.5 km eye clearance, the 4 px overscan, the 0.8 px
   minimum block width. Named constants, each with units and origin; keep `beyondTowns` output bit-identical.

Then run `npx vitest run src/data/landmarks src/data/city src/world/markOwnership.test.ts src/world/world.test.ts src/world/drawnSkyline.test.ts src/world/c10rules.test.ts src/scene/model/outside.test.ts`,
`npx tsc -b` and `npx oxlint`. All must be green.

End with a report: files changed with one line each on why; the commands you ran and their results; every existing
expectation you changed, and why.

## Shell rule

Never run a multi-line `npx tsx -e "..."`: on this Windows shell it waits on stdin and hangs. Write a temporary script
file (outside `src/`, e.g. in the OS temp dir) and run `npx tsx <file>`.
