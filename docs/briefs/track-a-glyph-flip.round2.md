# Track A — round 2 fixes (review of commit 94c1d54)

Same rules and Precision section as `docs/briefs/track-a-glyph-flip.md` (read it). Fix exactly these; do not commit;
append a `## Round 2` section to `docs/briefs/track-a-glyph-flip.REPORT.md`. Run only `npx tsc -b`, `npx oxlint` and
`npx vitest run src/scene/paint/glyphs/glyphs.test.ts src/scene/model/marks.test.ts --testTimeout=180000`.

1. **Bug — palm fronds** `src/scene/paint/marks.ts:93-94` (`tree()`): the frond length `l = w * (0.45 + 0.12 * r())`
   shadows the signed-light parameter `l`, so the frond tone weight is length×cos(a) (up to ~2): left fronds are pushed
   past `greenLit` at every hour, night included. Rename the length (`len`, also in the curve/line calls) so the weight
   is the signed light, clamped to 0–1. Add a test that `tree()` fill colours are identical between l = 0 at night and
   l = 0 by day except via tones, or more simply: at l = 0 no frond fill equals/approaches `greenLit`.
2. **Test gap — mirrored glyphs never drawn** `glyphs.test.ts`: seed 43 gives `hand = 1` for every kind. Run the
   22-kind sweep for both `hand: 1` and `hand: -1` (override on the desc). Check the minaret lamp's screen x at
   `hand = -1` equals `d.x − lampX·scale` (i.e. on the unmirrored-then-handed shape, constant over the light).
   Add a direction check: with screen light from the left (faces.left > faces.right), the glyph-space light the kit
   receives is positive for hand 1 and negative for hand −1 (assert via a face colour: the glyph-left side face of a
   `box` is lit for hand 1, shaded for hand −1).
   Add `fill` and `stroke` to the FORM op set so a light-dependent skipped fill is caught.
3. **Unrequested look changes — restore the even-sky look** (at l = 0 the drawing must equal the pre-change look under
   an even sky):
   - `kit.ts:103` box core-shadow strip, and the same pattern `industry.ts:61`: under even light it now draws front tone
     at 0.25 (nothing); before it was shade at 0.25. Base = shade at 0.25, deepening by `kl`; with `kr` that far edge
     turns lit.
   - `scene/paint/farCities.ts:28`: even-light body is `mix(stone, shade, k)`; restore `mix(tier.lit, tier.shade, k)`.
   - `icons/chordsBridge.ts:19`: stays are round cables: both the main fan and the back-stays brighten with |l| toward
     rim (`mix(t.wall, t.rim, k.k)` style), not one per side.
   - `glyphs/nature.ts:84-87` orchard: keep an even-sky underside shade (as `tree()` does), plus the side weighting.
4. **Docs / DRY**: `icons/chordsBridge.ts:8`, `icons/westernWall.ts:8` still describe `side` +1/−1; `glyphs/index.ts:74`
   "the light on its side" — rewrite for the signed light. `scene/model/glyphHand.ts:6` repeats the field test: use one
   shared helper (move `isField` to `world/glyphSpecs.ts` or import it). Drop the redundant condition at
   `glyphs.test.ts:244`. Keep `buildings.ts` ≤ 150 lines (it is 156).

## Precision

Pay attention to subtleties and physical accuracy: a round cable or trunk brightens on whichever side faces the light;
a box's far edge is in its own core shadow under an even sky; the signed light convention is positive = from screen-left,
glyph-space light = hand × screen light. No unstated approximations.
