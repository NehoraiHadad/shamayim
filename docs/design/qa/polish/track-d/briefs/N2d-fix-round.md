# N2d — small fix round for N2c (shadow ranking cost, a real perf guard)

The Opus review (round 7) of N2c (b3995b8) found the datum, shadow geometry and visibility check correct. Keep them.
Jerusalem's "30 ms vs 7.6 ms" was test order, not shadow cost: the first `sceneModel` on a world pays about 10 ms of
per-world colour and key work (`tone.ts`, `keys.ts`), and that cost predates N2. Fix the items below without committing.

## Must fix (ranked)
1. **Rank before terrain work** (`src/scene/model/cloudShadows.ts:99-120`). Today `onGround` (up to 12 `heightAt`
   calls) and `blockedKm` run on all of the ~280 cells that pass the alpha cull, before the sort and the 64 cap.
   - Sort candidates by an eye-level displaced distance with no terrain call: `(x − h·eastPerUp, y − h·northPerUp)`.
   - Walk that order, doing `onGround` and visibility lazily, and stop at 64 visible blobs. Re-rank the accepted blobs
     by true distance if the order matters.
   - State the error of the eye-level proxy as a bound (how far the order can differ from the true order).
   - Target ≤ 1 ms on recorded Jerusalem and Haifa.
2. **Make the perf test a real guard** (`src/scene/model/cloudShadowPanorama.test.ts:56-63, 81`).
   - Replace the panorama `groundAt` reference with a fixed allocating CPU loop, like `referenceLoop` in
     `density.perf.test.ts`. Set the ratio limit from today's measured ratio × about 1.5, so that it maps to about the
     1 ms budget. Share the reference loop rather than copying it.
   - Measure the model increment without order bias: build each world twice, or alternate field and no-field on
     identical frame sets. Guard the increment at ≤ 2 ms by default.
   - Keep the absolute checks under `FIELD_PERF=1`.
3. **Correct the Round 3 report table** (`N2-report.md`). The "Scene model" against "without shadow field" gap is test
   order, not shadow cost. Say so, and give the unbiased increment.
4. **Make the local set green.** In my run of `vitest run src/world src/scene/model` at b3995b8, 11 of 704 failed:
   - the two field budgets (`serves all four layers within the 15 ms cold` and `2 ms warm scrub`);
   - 9 that took 38–82 s: planes, the 22° ring, sea glitter, trails, flocks, the haifa and tel-aviv life hand-offs,
     the mist-before-data case, and the rain-from-banks case.
   Find out whether each one is a timeout under parallel load or a wrong value. Fix any real cause in our code.
   - Do not raise timeouts or loosen budgets.
   - If a test is slow only because it rebuilds a forecast per minute, apply N2b item 13: build one `worldInput` per
     test and vary `selected`. That is allowed in `src/scene/model` tests.
   Report each one's cause.
5. Optional: `src/world/flightTerrain.ts` is 163 lines. Split it along a real seam if one is clean.

## Out of scope
- The first-call `sceneModel` cost (`tone.ts`, `keys.ts`, `planeLight`, `outsideLayer`) predates N2. Only measure and
  report it.
- The painters, glyph lighting (track A), and life, planes and birds code (track C).

## Precision
- Every approximation gets a comment with its error bound, computed, not guessed.
- Timing comparisons must be free of order and warm-up bias. Say how you removed it.

## Rules
- Never run a multi-line `npx tsx -e "..."`. Write a temp script and run `npx tsx <file>`. Use
  `./node_modules/.bin/<tool>`, because the npx shim is broken here.
- Pure and seeded. Caches are deterministic memoisation only. Files ≤ ~150 lines, DRY. Remove dead code.
- Edit only `src/world/`, `src/scene/model/` (`cloudShadows` and the tests named above), `scripts/` and the report.
  Do not commit.
- Run `tsc -b`, `oxlint src/world src/scene/model scripts`, and `vitest run src/world src/scene/model`. The whole set
  must pass. No full suite, perf or Playwright.
- Append `## Round 4` to `N2-report.md`:
  - per-item changes;
  - shadow ms and the unbiased model increment on Jerusalem, Haifa and Tiberias;
  - the guard's calibration;
  - the cause of each of the 11;
  - anything not done.
