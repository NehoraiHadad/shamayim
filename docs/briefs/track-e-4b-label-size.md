# Track E, brief 4b — one height-label size for drawing and collisions (approved by the coordinator)

The overlay draws the height label at `--text-caption` = 0.75rem = 12 px, `line-height: 1` (`src/scene/react/Scene.module.css`
`.depth`, token in `src/index.css`). The layout still reserves 11 px in three places: `src/world/place.ts` `besideDot`
(`textWidth(text, 11)`, line ~133), `src/world/layout.ts` `LABEL_H = 11`, and `src/scene/model/layout.ts` `const LABEL_PX = 11`.
So a landmark or the datum line can pass the clearance check and still touch the drawn label.

Fix at the root, one constant, no second literal:
1. In `src/world/layout.ts` export `LABEL_PX = 12` with a comment naming its source (`--text-caption`, `.depth` line-height 1),
   and derive `LABEL_H` from it (line-height 1 → `LABEL_H = LABEL_PX`). `scene/model` already imports from `world/layout`, so
   that is the shared place.
2. `src/world/place.ts` `besideDot`: `textWidth(text, LABEL_PX)`. Touch only that line and the import — another track edits
   lines ~30, 73, 83, 108 of this file.
3. `src/scene/model/layout.ts`: delete the local `LABEL_PX` and import it from `world/layout`.
4. Tests: replace the literal `11` in `src/world/datum.test.ts` and `src/scene/model/model.test.ts` with `LABEL_PX`. Add one test that
   ties the constant to the CSS: read `src/index.css` and `src/scene/react/Scene.module.css` as text, check `--text-caption` is
   `0.75rem` (× 16 = `LABEL_PX`), `.depth` uses `var(--text-caption)` and `line-height: 1`. Add one test that the collision box
   from `besideDot` (or the model's clear zone) has the width and height of the label drawn at 12 px, and that a mark inside the
   12 px box but outside an 11 px one is detected as a collision.
5. Run the scene-model and world suites that use the label (`src/world/*.test.ts`, `src/scene/model/model.test.ts`,
   `src/scene/model/layout*.test.ts` if present, plus `datum.test.ts`). If a placement test now moves the label, check the new
   position is the correct consequence (clear of the line/marks), not a broken expectation; report each changed expectation.

## Precision — pay attention to subtleties and accuracy
One source of truth, exact pixel geometry, no other visual change. Files < 150 lines, DRY. Finish with `npx tsc -b`, `npx oxlint`,
targeted vitest — all green; never the full suite, never network. Do NOT commit; report what changed and why.

Never run a multi-line `npx tsx -e "..."` (it waits on stdin and hangs on this Windows shell): write a temp script file and run `npx tsx <file>`.
