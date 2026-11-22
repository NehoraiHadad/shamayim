# Worship ownership, round 5: review fixes

Same worktree and branch; rounds 1–4 are uncommitted. Same process rules: targeted test files only, plus `npx tsc -b`
and `npx oxlint`; never whole folders; never a multi-line `npx tsx -e`; never call live services; do not commit.
Verify each file:line first. Keep `LEGIBLE_PX` and `MAX_EXAGGERATION` as single exported constants (a product decision
on their values is pending; everything must follow from them, with no second copy).

## Fixes

1. **Cull-bound candidates take selection slots.** `placeMarks.ts:42` drops non-own candidates only below
   `MARK_MIN_PX = 1`, while `neighbourSize.ts:13` later culls anything under `LEGIBLE_PX / MAX_EXAGGERATION`. A 1.5 px
   minaret can win `fewLandmarks`/`select` over a 3 px castle and then be culled. Export
   `NEIGHBOUR_MIN_TRUE_PX = LEGIBLE_PX / MAX_EXAGGERATION` from `neighbourSize.ts` and use it at every pre-selection
   floor for non-own marks (`placeMarks.ts:42` when `perspective` is set, `beyondMarks.ts:45`, `seatMark` in
   `beyondSeat.ts:138`). Test: a sub-floor candidate no longer displaces a legible one.
2. **Near neighbours occlude each other.** `outsideMarks.ts:32-38` evaluates unseated non-own glyphs without adding
   each kept glyph to the mass, and seats before them. Evaluate seated and unseated near candidates together, nearest
   first, pushing each kept glyph's mass, as `farNeighbourMarks.ts:26-38` does; share one routine between both layers.
   Test: two slid glyphs at the same x, the farther one's foot hidden by the nearer one, is culled.
3. **The end-to-end test trusts the `town` flag.** `neighbourAssertions.ts:41` checks support only `if (glyph.town)`.
   Assert independently that worship and homes kinds have `town === true` and that `supportId` is set whenever `town`.
4. **DRY.** One haze guard (`evaluateNeighbour.ts:23` and `neighbourPlacement.ts:34` duplicate it; the `homeHaze`
   mutation must then really fail a test). `evaluateNeighbour.ts:18` reuses `neighbourSize`'s factor. Extract one helper
   for `min(crestPx, apparentHeight(heightM, sightKm, baseAngle(...)))` (`neighbourDisplay.ts:12`,
   `markPerspective.ts:26,35`).
5. **File size and line length** (against `git show HEAD:<file>`): `scene/model/types.ts` (608→617) and
   `world/outside.ts` (870→871) must not grow: move the neighbour fields on `GlyphDesc` into a small
   `NeighbourEvidence` type in its own module. `world/beyondSeat.test.ts` back to ≤150 lines and its HEAD max line
   (130). `beyondMarks.ts:51` ≤133 chars. `e2e/scene.stills.mjs` ≤131. New files: no line over 120
   (`markOcclusion.ts:63`, `worshipAssertions.ts:51`, `settlementOwnership.test.ts:34`).
6. **File list.** Make REPORT.md's file list match the full diff against HEAD (all rounds), one line each, why.
7. **Comment** in `worshipAssertions.ts:49-52` that it reimplements `farMasses` on purpose as an independent check,
   and why `b.km ?? tier.km` differs.

Then re-run the audit probe (background) and update REPORT.md `## Round 5` with per-layer kept counts (18 recorded,
117 set) and the famous far landmarks table, before → after this round.
