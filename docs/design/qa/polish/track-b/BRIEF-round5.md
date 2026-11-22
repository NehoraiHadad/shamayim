# Track B, round 5: keep the portrait contest unchanged

Worktree `P:\projects\Shamayim\.claude\worktrees\fix-mark-ownership-caed9e`. Round 4 is uncommitted in the working tree
(`BRIEF-round4.md`); read `git diff` first. Do not commit, and do not touch `src/test/probe/`.

## Precision

Pay attention to subtleties and physical accuracy. No special cases for particular places in `src/`. Painters untouched,
files under about 150 lines, DRY. Never run a multi-line `npx tsx -e "..."` (it hangs on this shell); write a temp
script file outside `src/` and run `npx tsx <file>`.

## The regression

Round 4's `panoramaShortlist(..., 'landmark')` (`src/data/landmarks/shortlist.ts`) appends every settlement-kind mark
within `SKYLINE_TO_KM` to `sceneMarks`. Those extra marks include the place's **own** marks, so they also enter the
place's own portrait contest in `marksOf`, which the change was never meant to touch. Measured on the bundled data
(375 px, `marksOf` own portrait marked `*`):

- Tel Aviv: `church* 3.79 km` is replaced by `minaret* 3.86 km`.
- Haifa: gains `minaret* 2.90 km` (a fifth mark).
- Jerusalem: gains `minaret 4.73 km / 9 m` (non-portrait, seated beyond). This one is the intended effect.

## Fix

The carried candidates must reach **beyond seating only**. The place's own marks and every non-settlement path must
see exactly the shortlist they saw before round 4.

- Keep the old shortlist as is.
- Carry the extra seat candidates separately, e.g. as a second field next to `sceneMarks` in `useLandmarks.ts` and
  through to `MarksInput`, or tagged on the candidates.
- In `marksOf`, a carried candidate is used only when it is beyond the place (not `ofPlace`) and goes through
  `beyondMarks` seating.
- Bump the landmark cache key if the cached shape changes.
- Add a test that fails today: with the extra candidates present, the own portrait set equals the set without them.
- Keep the round-4 `loadLandmarkSource` hall test passing.

Then run `npx vitest run src/data/landmarks src/data/city src/world src/scene/model/outside.test.ts`, `npx tsc -b` and
`npx oxlint`. All must be green. End with a report: files changed with one line each on why; the commands you ran and
their results; every existing expectation you changed, and why.
