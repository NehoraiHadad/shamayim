# Track B, round 7: review fixes on round 6

Worktree `P:\projects\Shamayim\.claude\worktrees\fix-mark-ownership-caed9e`. Round 6 (`BRIEF-round6.md`) is uncommitted
in the working tree; read `git diff` and the new files first. Do not commit, and do not touch `src/test/probe/`.

## Precision

Pay attention to subtleties and physical accuracy. No special cases for particular places in `src/`. Painters untouched.
Already-oversized files must not grow past their size at round 6's start (`marks.ts` 265, `outside.test.ts` 621,
`scene/model/outside.ts` 383, `types.ts` 516); new files under ~150 lines. DRY, no dead exports. Never run a multi-line
`npx tsx -e "..."` (it hangs on this shell); write a temp script file outside `src/` and run `npx tsx <file>`.

## Fixes

1. **Seats the scene budget drops must not affect the world** (`src/world/beyondMarks.ts:58`, `src/world/place.ts:114`,
   `src/world/world.ts:171`, `src/world/drawnSkyline.ts:50`). `world.marks` now holds every viable seat. But
   `besideDot` (the dot's label placement) treats each one as an obstacle, and `drawnSkyline` (the sun/moon "behind
   the land" line) blocks a column for each. So a town with 8 viable minarets, of which at most 2 can be drawn, still
   pushes the label away and can hide a low sun behind a minaret that is never drawn.
   - Keep a provisional world-width budget (the old `beyondMarks` budget at `SCENE_W`) in `world.marks` for these
     consumers.
   - Carry the full ranked pool separately (e.g. `world.seatPool`) for `outsideMarks` to re-budget after the final
     cull. Re-budgeting can only drop or swap seats within that pool.
   - Add a test with a crowded neighbour (more viable seats than the cap) showing that the label and skyline see only
     the budgeted ones.
2. **Keep the seat cap at the world width** (`src/scene/model/outsideMarks.ts:24`). The world is laid out at `SCENE_W`
   (375) and the place's own marks use `nearLimit(375)`. Use `nearLimit(SCENE_W)` for the seat budget too, not the CSS
   width, so a wide screen keeps today's cap of 5. Add a case at 1280 px.
3. **Revert the `model.test.ts` filter** (`src/scene/model/model.test.ts:47-49`) to the original (all non-far
   `world.marks`); it passes on every fixture and keeps the check able to see a seat under the label.
4. **Nits.**
   - Remove the unused `export { namedOnly }` re-export (`marks.ts:19`) and make `namedOnly` module-private in
     `markCandidates.ts`.
   - Point `place.ts` and `model.test.ts` at `markGeometry` directly and drop the re-export shims (`marks.ts:20`,
     `types.ts:355`) if nothing else needs them.
   - Build the seated object once in `outsideMarks.ts:55`.

Then run `npx vitest run src/data/landmarks src/data/city src/world src/scene/model`, `npx tsc -b` and `npx oxlint`.
If a suite you did not touch fails only in the full run, re-run it alone and report both results. End with a report:
files changed with one line each on why; the commands you ran and their results; line counts of the touched files over
150 lines; every existing expectation you changed, and why.
