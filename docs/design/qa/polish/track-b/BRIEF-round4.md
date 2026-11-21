# Track B, round 4: third review fixes

Worktree `P:\projects\Shamayim\.claude\worktrees\fix-mark-ownership-caed9e`. Rounds 1–3 are committed (`9262908`,
`00473e5`; intent in `BRIEF-neon.md`, `BRIEF-round2.md`, `BRIEF-round3.md`); `origin/main` is merged in (`b0f1976`).
Read `git show 00473e5` and the files named below first. Do not commit, and do not touch `src/test/probe/`.

## Precision

Pay attention to subtleties and physical accuracy: real geometry and scale, units (km against the 0.1 km `reach` of
place points; metres against px), data provenance, and no unstated approximations. Give every constant a comment
stating its physical meaning and where it comes from. Never cite "the brief" as a reason. Write no special cases for
particular places in `src/`. Keep painters (`src/scene/paint`) untouched and every file under about 150 lines (tests
too); do not grow `src/world/outside.ts` or `src/world/marks.ts`, put new logic in small modules. Follow DRY.

## Shell rule

Never run a multi-line `npx tsx -e "..."`: on this Windows shell it waits on stdin and hangs. Write a temporary script
file outside `src/` (e.g. in the OS temp dir) and run `npx tsx <file>`.

## Fixes

1. **Keep the no-raster fallback** (`src/world/marks.ts:49`, `src/world/beyondSeat.ts:108`). Before bounds and raster
   data arrive (a cached visit has a cluster frame first), a mark just outside the frame but within the old 1 km margin
   used to count as the place's own; now it goes to a seat lookup that returns null without a raster, so it vanishes.
   Apply the strict shared ownership (`isOwnSpot`) to settlement marks only when the raster is available; otherwise keep
   the previous fallback (frame + 1 km margin when `lie.inPlace` is absent), for every kind. One predicate, DRY.
2. **Containment against the drawn block** (`beyondSeat.ts:135`, `src/scene/model/outside.ts:247`). The scene model can
   shrink a beyond block for the screen width (e.g. 320 px vs 375 px) or drop it for a label collision, while the seated
   glyph stays. Carry the supporting block's id with the seated mark into the scene model, and there, after the block's
   final screen box and label culling are known, drop the seated mark unless its glyph box lies within that block's final
   x span (and drop it when its block was dropped). Outside the painters.
3. **Seating before the shortlist** (`src/data/landmarks/shortlist.ts:30`). The live canvas gets a pre-ranked shortlist;
   tall minarets on hidden or undrawn squares can fill its slots and the minaret reserve, so a 9 m hall that would seat
   never reaches seating. Carry settlement-kind candidates within `SKYLINE_TO_KM` beyond the place through to seating,
   and apply their display budget to viable seats only. Test it through `loadLandmarkSource` (or the real path the canvas
   uses) with a case where the old shortlist would have excluded the hall.
4. **Split the ownership tests** (`src/world/markOwnership.test.ts`, 329 lines). Split ownership (bundled-data
   Karmei Tzur / Safed / Rosh Pina / Shadmot Mehola) and seating (synthetic) into focused suites near 150 lines each.
   Put the repeated "find a fitting block" setup in one small shared fixture with known block and mark positions.
   Keep every assertion; each must still fail without its safeguard.

Then run `npx vitest run src/data/landmarks src/data/city src/world src/scene/model/outside.test.ts`, `npx tsc -b`
and `npx oxlint`. All must be green.

End with a report: files changed with one line each on why; the commands you ran and their results; every existing
expectation you changed, and why.
