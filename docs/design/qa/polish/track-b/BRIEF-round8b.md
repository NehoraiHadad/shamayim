# Track B, round 8b: narrow round 8 to the label cull

Worktree `P:\projects\Shamayim\.claude\worktrees\fix-mark-ownership-caed9e`. Round 8 (`BRIEF-round8.md`) is
uncommitted in the working tree; read `git diff` and the untracked files first. Do not commit, and do not touch
`src/test/probe/`.

## Decision (manager)

Fix 2 of round 8 is withdrawn: the world stays built at the world width (`SCENE_W`), one world state for every view.
Round 8 made the world depend on the render width (`src/world/sceneWidth.ts`, `bindSceneWidth`/`worldForScene`, the
viewport measured before the world in `CanvasScene.tsx`, `useWorld.ts`, `SceneCanvas.tsx`, `sceneHarness.tsx`,
`scene/model/index.ts`). That rebuilds the heavy world on every resize and forks the world state silently. The light
versus drawn-skyline mismatch at non-375 px widths already exists for culled town blocks, towers and trees. It is
recorded as a follow-up for all of them together, not fixed for seats alone.

## Do

1. **Revert every fix-2 change.**
   - Delete `src/world/sceneWidth.ts`.
   - Restore the files above to their state at `HEAD`, plus whatever fix 1 needs there.
   - The world's celestial clearance and light use the provisional world-width seats, as at `HEAD`.
   - Remove fix 2's test.
2. **Keep fix 1**: the backed elevation label culls overlapping seated glyphs before the budget, and the town blocks
   under it stay drawn.
   - Keep the shared clearance geometry (`src/world/sceneClearance.ts`, `src/world/outsideSeats.ts`) only as far as
     fix 1 needs it, and drop what only fix 2 used.
   - Make fix 1's regression build the world it draws without spreading a derived world.
3. **Keep fix 3**: `src/world/place.ts` ≤ 234 lines.
4. **Nits from review.**
   - Make the glyph top the same in `finalSeats` and the ordinary path (`base - h * scale`).
   - Export named types instead of `ReturnType<typeof …>` / `Parameters<typeof …>[0]`.
   - Keep the `world.ts` comment that cites the owner's 2026-11-20 report on the drawn land hiding the sky.

Precision: physically accurate, no special cases for particular places, painters untouched, files already over ~150
lines must not grow past `HEAD`, DRY, no dead code. Never run a multi-line `npx tsx -e "..."` (it hangs on this shell).

Then run `npx vitest run src/world src/scene/model`, `npx tsc -b` and `npx oxlint`. If a suite you did not touch fails
only in the full run (30 s timeouts under load), re-run it alone and report both. Report: files changed with one line
each on why, the commands and results, line counts of touched files over 150 lines, every expectation changed and why.
