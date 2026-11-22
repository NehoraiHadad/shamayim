# Landmark size, round 2: review fixes

Branch `claude/fix-landmark-size-3b7e`, a33105f7 committed and CI green. `src/test/landmarkSizeAudit/` stays
untracked (it was removed from the commit: 830k lines of JSON and a 1,781-place test). Same process rules: targeted
test files only, `npx tsc -b`, `npx oxlint`; never whole folders; never a multi-line `npx tsx -e`; never call live
services; do not commit. Verify each file:line first.

1. **Committed tests must guard the clamp end to end.** No bundled icon reaches 16 px and fixtures draw 0 seated
   glyphs, so removing the ceiling or the near-layer clamp fails no committed scene test. Add committed tests: one
   synthetic far famous glyph and one synthetic seated famous glyph with true height ~30 px, run through `sceneModel`
   (not only `neighbourSize`), asserting drawn height 16 and factor 16/30; and one with true ~1 px asserting 6.
   Add DPR 1 to the fixture loop in `settlementOwnership.test.ts:28` if it stays under ~60 s per test (else a separate
   committed test for DPR 1 on a small group). Each must fail without its safeguard; say how you checked.
2. **Oversized files must not grow** (vs `git show HEAD~1:<file>`): `scene/model/outside.ts` 322→329,
   `scene/model/marks.ts` 180→182, `scene/paint/glyphs/glyphs.test.ts` 234→244, `src/test/worshipAssertions.ts`
   137→152, `data/landmarks/placeMarks.ts` 148→151, `scene/model/outsideSeats.test.ts` 149→152. Bring each back to its
   previous count or below (≤150 for those that were under). Move the famous-tone refresh (outside.ts:268-271) into
   `landmarkAtmosphere.ts` (e.g. `refreshLandmarkGlyph(world, glyph, km)`) and the famous tone oracle
   (worshipAssertions.ts:106-116) into its own helper. Unpack `outside.ts:271` (124 chars) and `glyphs/index.ts:64`
   (128 chars) to the file's previous max length.
3. **DRY.** One exported "famous non-own" predicate (today restated in `markDescriptor.ts:27`, evaluateNeighbour,
   outside.ts, farNeighbourMarks) and one geometry helper in `neighbourSize.ts` for the "famous → `neighbourSize`, else
   `glyphAtHeight`" ternary (`beyondMarks.ts:49`, `beyondSeat.ts:142`, `markPerspective.ts:42`).

Append `### Round 2` to REPORT.md `## Landmark size`: what changed and the results.
