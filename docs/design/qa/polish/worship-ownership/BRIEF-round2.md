# Worship ownership, round 2: review fixes

Same worktree and branch; your round-1 change is uncommitted. An Opus review (file:line refs below are from it; verify
each before changing). Do not commit. Run only the test files you touch or that cover the modules you change, plus
`npx tsc -b` and `npx oxlint`; never whole folders (the full suite runs on GitHub CI). Never a multi-line `npx tsx -e`.

## Principle

One distance frame per comparison. Everything the outside layer draws (own skyline, beyond blocks, beyond towers, seats,
unseated non-own marks) is compared, hazed and sized in that layer's own frame (`beyondKm(frame, baseKm, dx, dy)` for
depth order and haze, `outsideDistance(eyeN, dx, dy)` for angular size), against only what is painted in front of it.
State that frame in a comment on `DrawnMass` and `footHidden`.

## Fixes

1. **Unseated non-own marks in the outside layer** (`placeMarks.ts:62-63` sets `sightKm = distanceOf(place, mark)`;
   used at `outsideMarks.ts:25,35`). Use the outside frame as seats do. Proven case in the Karmei Tzur test world:
   `il-silo-31.56601-35.10073` (4.8 km S) drawn at x 200.5, 3.52 px, foot 91.7 behind blocks at 8.98–9.67 km (tops
   90.8); it must be culled, and its true size is ~2.2 px. Make `assertDrawnSeats` (`worshipAssertions.ts:52-59`) check
   in the same correct frame and cover every non-own kind, not only worship.
2. **Occluders are only what is painted in front.** Far-city masses (z 16) and far/back ridges are painted under the
   outside layer (z 38): drop them from the outside layer's occluders (`scene/model/outside.ts:212`, `markOcclusion.ts:45`);
   keep far-city masses as occluders for the far marks layer (`index.ts:59`). For outside items, test the near ridge
   and own land only. Remove `world.air.visibilityKm` and `farCities` from the outside cache key (`outside.ts:200-202`)
   so scrubbing hours does not rebuild the layer. Fix `worshipVisibility.test.ts:104`, which asserts the wrong behaviour.
3. **Beyond raster towers at true size** (`world/outside.ts:653` `look.px(tower.heightM, k)`): use `apparentHeight` with
   `outsideDistance(...)`, same floor, so towers match their blocks and occlude at their true height.
4. **Size at the mark's base angle** (`apparentHeight.ts:8` uses `horizonSlope()`, the 0° scale): use
   `anglePx(a0 + h) − anglePx(a0)` with a0 the base's elevation angle, for glyphs and blocks alike.
5. **Own skyline exaggeration** (`lookOf` boost): either the own roofs used as occluders are their true drawn geometry
   (they are what the viewer sees, so occlusion against what is painted is right), or say in REPORT.md exactly why the
   painted height is the right occluder. Do not change the own skyline's look in this round.
6. **Committed test across settlements.** The all-settlements check lives only in the excluded probe (542 s). Commit a
   fast test using `worshipAssertions.ts` and `bundledCityClusters.ts`: all 18 recorded panoramas plus a deterministic
   sample of bundled settlements (every synagogue-only place whose phase-1 audit had a non-synagogue row, plus a seeded
   sample), at 375 and 1280 px; state its runtime in a comment and keep it under ~60 s. The full audit stays a probe.

Nits: `elevationAt` must use `SCENE_W`, not `375`; get `src/data/landmarks/rank.ts` back to ≤150 lines; give
`MARK_MIN_PX` its source; restore `c9.test.ts`'s block-count expectation to a physical bound (say why) and give
`assertTownScale` a lower bound too; a seat occludes with its drawn glyph's width, not its box; simplify
`budgetVisibleSeats`'s signature; `scene/model/outside.ts` should not both import and re-export `landBehind`; revert
unrelated blank-line edits in `world/outside.ts` and `scene/model/marks.ts`.

Not in scope: mosque default heights (`HALL_M` for no tower evidence is Track B's evidence rule; the floor culling a
9 m hall at distance is correct). Keep the one-world-state rule.

Then re-run the audit probe (it is fine to run that one locally, in the background) and update `AUDIT-table.md`'s After
section and `REPORT.md` with a `## Round 2` section: what changed, every changed expectation and why, counts before → after.
