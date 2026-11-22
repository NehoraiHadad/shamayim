# Worship ownership, round 7: review fixes for round 6

Round 6 and a merge of origin/main are committed (bc019df, CI green). Same process rules: targeted test files only,
`npx tsc -b`, `npx oxlint`; never whole folders; never a multi-line `npx tsx -e`; never call live services; do not
commit. Verify each file:line first.

1. **Famous means truly famous.** `isLandmark` admits fame 1 (Wikidata-only, "known" in `fame.ts`). In the audit this
   puts 1,215 far icons in ridge mode with factors up to 43× (e.g. a water tower at 0.09 px drawn at 4 px), including
   614 high-rises and 200 synagogues. The owner's class is the famous named set (Nimrod, Yehiam, Bar'am church, Mount of
   Beatitudes…). The uncapped landmark rule applies only to `fame === 2` or curated marks (find how curated marks are
   marked; one predicate, from data, used everywhere `neighbourRule` asks "famous"). Fame-1 marks fall to the ordinary
   rule (non-own worship → hidden; others 4 px / 2×). Test: a fame-1 synagogue is hidden, a fame-1 tower needing 3× is
   culled, a fame-2 church needing 5× is kept.
2. **Seated marks mix frames.** `beyondMarks.ts:56-58` takes `sourceTopY`/`sourceGroundY` from the home-eye panorama at
   the panorama bearing, then overwrites `bearingX` with `seat.x` (outside projection);
   `evaluateNeighbour.ts:131-132` (`hiddenFoot`) and `landmarkRidge.ts:9,24` compare that evidence with the outside ridge
   at `seat.x`. Compute top/ground evidence in the outside frame at `seat.x` for seated marks (one frame per comparison),
   or keep seated marks out of ridge mode and skip the `hiddenFoot` gate when a town support exists. Measure how far
   `seat.x` and the bearing drift on the audit set and report it. Test: a famous mark seated on a visible block is kept
   with base `foot`; a seated mark with no proven top at `seat.x` is never put on a ridge.
3. **Sheet clearance.** `markFitting.ts:76-80`: the famous branch skips the dot nudge and the
   `VISIBLE_BOTTOM - SHEET_CLEAR` check. Apply the same checks as other marks.
4. `src/test/worshipAssertions.ts:719`: split the 138-char line (file's previous max 117); remove the
   `HEIGHT_TOLERANCE_PX` slack added to "nothing covers the foot", or justify it physically in a comment.
5. `src/world/beyondSeat.test.ts:877`: kinds became `['highrise','church','synagogue','highrise','highrise']`; dedupe and
   restore `homes`.
6. DRY: hoist `neighbourRule(glyphOf(mark) ?? mark.kind, …)` once in `placeMarks.ts:43,44,54`; share the ridge-line
   lookup between `neighbourAssertions.ts:50` and `worshipAssertions.ts:77-78`; drop the redundant `base`/`x` re-spread at
   `landmarkRidge.ts:276`.

Then: re-render the round-6 stills (Karmei Tzur clean; Dafna → Nimrod must still keep Nimrod, which is fame 2; if it
does not, say why), re-run the audit probe (background), and add REPORT.md `## Round 7` with the kept counts and the
famous landmarks table before → after, plus the factor histogram of kept famous icons. TASKS.md: note the fame-2 rule.
