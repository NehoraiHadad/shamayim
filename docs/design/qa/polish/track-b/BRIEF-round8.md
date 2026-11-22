# Track B, round 8: last review fixes

Worktree `P:\projects\Shamayim\.claude\worktrees\fix-mark-ownership-caed9e`, at `47897ac` (rounds 1–7 plus main).
Read `git show 4a151fb` (rounds 6–7) first. Do not commit, and do not touch `src/test/probe/`.

## Precision

Pay attention to subtleties and physical accuracy. No special cases for particular places in `src/`. Painters untouched.
Files already over ~150 lines must not grow (`src/world/place.ts` must end ≤ 234, `src/world/world.ts` ≤ 270,
`src/scene/model/outside.ts` ≤ 370); new files under ~150 lines. DRY. Never run a multi-line `npx tsx -e "..."` (it
hangs on this shell); write a temp script file outside `src/` and run `npx tsx <file>`.

## Fixes

1. **The height label must cull a backfilled seat** (`src/scene/model/outsideMarks.ts:28`,
   `src/scene/model/layout.ts:27`). At 320 px, a hall freed into a slot can sit directly under the backed elevation
   label, because the scene leaves backed labels out of its clearance checks.
   - Include the backed label's screen box in the seated-glyph cull, before the budget is applied.
   - Keep the continuous town backdrop under the label as it is today: only seated glyphs are culled.
   - Add a regression through `sceneModel`.
2. **Light and the drawn skyline use the same final seats** (`src/world/world.ts:172`, `outsideMarks.ts:34`). When the
   scene swaps a seat, the sun or moon "clear of the land" test (the direct-light calculation) still uses the
   provisional seats. A replacement spire taller than its roof can then hide a low moon in the drawn land, while the
   light still counts the moon as clear.
   - Use the scene's final seat selection for the scene-specific celestial clearance and direct light.
   - Keep the provisional budget for world layout (the label placement).
   - If the celestial test lives in the world and cannot see the scene's selection, make the light use the same seat
     set the land draws: one source of truth. Say which way you chose and why.
   - Add a test.
3. **`src/world/place.ts` back to ≤ 234 lines** (it is 235 after the merge), keeping both branches' imports and
   behaviour.

Then run `npx vitest run src/world src/scene/model`, `npx tsc -b` and `npx oxlint`. If a suite you did not touch fails
only in the full run (30 s timeouts under load), re-run it alone and report both. End with a report: files changed with
one line each on why; the commands you ran and their results; line counts of the touched files over 150 lines; every
existing expectation you changed, and why.
