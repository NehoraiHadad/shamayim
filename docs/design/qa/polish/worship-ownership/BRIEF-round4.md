# Worship ownership, round 4: a legible neighbour (decision B) + re-review fixes

Same worktree and branch; rounds 1–3 are uncommitted. Same process rules: targeted test files only, plus `npx tsc -b`
and `npx oxlint`; never whole folders; never a multi-line `npx tsx -e`; never call live services; do not commit.

## Decision B (2026-11-22, from the owner's "גם אם זה מתרחק מעט מהאמת")

Round 3's kept neighbour glyphs are 1.0–1.6 px (Eleazar still): true size, but they read as dots, not as a mosque in a
village. The 1 px floor only means "a pixel exists". Now:

1. **Legibility floor.** A neighbour glyph (non-own, kept by every round-3 rule) is drawn at
   `max(trueHeight, LEGIBLE_PX)` with `LEGIBLE_PX = 4` (justify in its comment: the height at which the minaret/dome/
   synagogue silhouette in the glyph specs is recognisable at the scene's DPR; check the glyph specs). Width scales with
   the same factor.
2. **Bounded exaggeration.** `factor = drawnHeight / trueHeight` must be ≤ `MAX_EXAGGERATION = 2`. A glyph that would
   need more is culled, never drawn bigger. One shared helper; every place and every kind; no place-specific code.
3. **Still reads as behind home.** Haze uses the far-town haze at the glyph's **true distance** (never derived from its
   drawn size). The gap and the own-town support from round 3 are checked against the **drawn** (exaggerated) box.
   A kept glyph's haze is never lighter than the home roofs'.
4. **Recorded and tested.** Put the factor on each drawn glyph in the scene model (a field, testable). Tests: no kept
   glyph's factor exceeds 2; every kept glyph is ≥ 4 px; culled when the factor would exceed 2; haze computed from true
   distance (fails if computed from drawn size); the round-3 gap and support hold on the drawn box. Each must fail
   without its safeguard; say how you checked. Keep the 117-place fast test under ~60 s.

## Evidence

Stills at 375 px (DPR 2), using `e2e/scene.stills.mjs` with the generic `--flat` option, labelled flat 100 m as before:
Karmei Tzur (osm:way:462664109) and Eleazar (il-31.6607-35.1415), **before** (round 3, already in `stills/`; rename
them with a `-r3` suffix) and **after** (round 4). Also save a 4x crop of the neighbour region for each after-still, so
the glyphs can be judged. Update `stills/README.md`: per glyph, kind, true px, drawn px, factor, gap, slide, haze distance.

## Docs

`REPORT.md` `## Round 4`; `TASKS.md` worship section: decision B with the quote, the floor, the cap, the two guards.
Re-run the audit probe (background) and update `AUDIT-table.md` After: kept and culled neighbour counts, factor histogram.

## Re-review fixes

From the Opus re-review of rounds 2–3 (verify each file:line first).

1. **Over-culling (product, most important).** In practice no neighbour survives outside flat fixtures: `farMarksInView`
   (`src/scene/model/markOcclusion.ts:73-75`) culls every non-own far-layer mark, including famous named far landmarks
   the view used to keep; unseated non-own near marks never pass (of 47 in 40 phase-1 places, 42 had no drawn block in
   their square, 5 had a base off the block); castles, antennas, water towers have no "own town", so the town rule can
   never admit them. The owner wants what is truly visible kept. Make the rule general:
   - A non-own mark that belongs to a town (worship, homes, anything inside a town footprint) needs its own town's drawn
     mass at its foot (near: beyond blocks; far layer: its far-city mass) — round 3's support rule, per layer.
   - A non-own mark outside any town footprint (castle, antenna, tower, lighthouse…) needs no town support: it is kept
     when its foot is visible (occlusion against what is painted in front), its size passes the floor/cap, and its drawn
     box keeps the 6 px gap from the home roofline span.
   - Every kept mark, in every layer, keeps the gap from home and decision B's floor and 2x cap.
   Report per layer how many marks were kept before round 1, after round 3 and after this round, over the 18 recorded
   panoramas and the 117-place set, and list the famous named far landmarks kept or dropped, with the reason for each.
2. **Flaky fast test.** `settlementOwnership.test.ts:25` has a 60 s timeout and claims 32.89 s, but took 80.81 s in one
   run. Split it by width or by place group so each test has 3x headroom, and correct the comment.
3. **Own support hides the mark.** `outsideMarks.ts:36` and `footSpans` (`markOcclusion.ts:45-47`): the support block's
   mass sits at the square-centre `km`, so a mark behind the square centre is hidden by its own support. Exclude the
   supporting block by id.
4. **Seat crest clip.** `beyondSeat.ts:139` dropped `Math.min(…, over)`, while blocks and towers still clip at the
   crest. Restore it, and fix the assertion at `worshipAssertions.ts:66`.
5. **Dead code.** Remove what is now used only by tests or by nothing: `footHidden`, `farMasses` and `layer:'far'` in
   `markOcclusion.ts`; `seatsOnScreen` and `TownBlockSpan` in `outsideSeats.ts`; the dead `sightKm` ternary in
   `scene/model/marks.ts:197`; the `BEYOND_MIN_PX` alias; the `farMasses` branch in `worshipAssertions.ts`. If item 1
   brings any of these back into real use, keep them. Make REPORT.md's file list match the real diff.
6. **Line packing.** Do not keep oversized files at their line count by packing lines. Lines stay at the file's
   previous maximum length or shorter (`sceneHarness.tsx`, `world/marks.ts:170`, `placeMarks.ts`, `outsideMarks.ts`).
   Move logic to small modules instead.
7. **Nits.**
   - `markPerspective.ts:32` and `e2e/scene.stills.mjs`: use `SCENE_W`, not a literal 375. In the stills script, guard
     the missing `source` (it reads `source?.id` and then `source.x`).
   - Comment or remove `MIN_BLOCK_W_PX = .8` and the beyond-tower `Math.max(1.2, w)` width floors.
   - `sceneFixture.ts` should reuse `FLAT_ELEV_M`.
   - `markPerspective.ts:17` should reuse `squareKey`.
   - State the gap N at 1280 px against the house width, and justify the gap in px of the drawn scene.
