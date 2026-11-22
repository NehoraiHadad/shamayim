# Track B, round 6: budget after the final cull, and file sizes

Worktree `P:\projects\Shamayim\.claude\worktrees\fix-mark-ownership-caed9e`. Rounds 1–5 are committed (latest
`6782f0c`; intent in `BRIEF-round4.md`, `BRIEF-round5.md`), and `origin/main` (cc9664f, track C life motion) is merged in as `040985b`. Read `git show 6782f0c`
first. Do not commit, and do not touch `src/test/probe/`.

## Precision

Pay attention to subtleties and physical accuracy: real geometry and scale, units, no unstated approximations. Give
every constant a comment stating its physical meaning and origin. No special cases for particular places in `src/`.
Painters (`src/scene/paint`) untouched. Every file you touch must end no longer than it was at `6782f0c`'s parent where
it was already over ~150 lines (`src/world/marks.ts` 265, `src/scene/model/outside.test.ts` 621), and new files stay
under ~150 lines. DRY. Never run a multi-line `npx tsx -e "..."` (it hangs on this shell); write a temp script file
outside `src/` and run `npx tsx <file>`.

## Fixes

1. **Display budget after the final cull** (`src/world/beyondMarks.ts:81`, `src/scene/model/outside.ts:285`). Today the
   per-kind cap and `nearLimit` for seated marks are applied in `beyondMarks`, before the scene model shrinks a block
   for the screen width or culls it for text clearance. At 320 px two higher-ranked minarets can take the two-minaret
   slots and then both be dropped, while a lower-ranked hall that would fit its own block was already discarded.
   Carry the viable seated candidates (ranked) into the scene model and apply the budget there, after final block
   containment and text clearance, so a slot freed by culling goes to the next viable candidate. Add a test where the
   hall takes a slot freed by culling at 320 px.
2. **File sizes.** Bring `src/world/marks.ts` back to ≤ 265 lines by moving the carried-candidate preparation into a
   small module that shares normalisation and raster de-duplication with the ordinary marks (no copy). Move the round-4
   containment tests out of `src/scene/model/outside.test.ts` into a focused suite (back to ≤ 621 lines).

Then run `npx vitest run src/data/landmarks src/data/city src/world src/scene/model`, `npx tsc -b` and `npx oxlint`.
All must be green. End with a report: files changed with one line each on why; the commands you ran and their results;
line counts of every touched file over 150 lines before and after; every existing expectation you changed, and why.
