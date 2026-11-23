# D / town: a forest of thin towers (fcd96b26)

Verdict: FAULT in the cities (haifa, tel-aviv, jerusalem; beit-shean's far rows). NOT reproduced in the small places named in the task
(shadmot-mehola, ein-gedi, rosh-pina: every box h/w <= 1.1). Patch: `town.patch` (git diff against fcd96b26, data/world/model files only,
not committed; worktree clean again). The town's light: `../E/town-light.md`.
px = css px at 375 wide. Numbers: fixtures of 2026-11-17 through buildWorld; stills rendered locally.

## 1. The fault in numbers
Scales at the town's near / mid / far rows. Horizontal = f/depth. Tower k = FRAME_SCALE (owner: .18 px/m at 5 km). "Low" = vertical
px/m of fabric under 12.5 m (`lookOf().px`). s = the terrain's vertical scale.

| place | horizontal px/m | k / horizontal | low / horizontal | s / horizontal |
|---|---|---|---|---|
| haifa | .0338 .0249 .0197 | 7.2 | 13.6 | 2.7-4.6 |
| tel-aviv | same | 7.2 | 13.6 | 7.4-12.7 |
| jerusalem | .0364 .0269 .0213 | 6.8 | 12.7 | 2.9-5.1 |
| rosh-pina | .0456 .0336 .0266 | 8.4 | 13.9 | 1.7-2.9 |
| shadmot-mehola | .0745 .0549 .0435 | 11.8 | 11.8 | 1.9-3.3 |
| ein-gedi | .0589 .0434 .0343 | 11.3 | 12.6 | 1.2-2.1 |
| beit-shean | .0553 .0408 .0323 | 10.2 | 13.0 | 3.1-5.3 |
| neve-zohar | .0503 .0371 .0293 | 10.3 | 14.0 | 2.0-3.4 |

A box of true width is drawn 7-14 times too tall for its width, unless its width is put on the height's scale.

Boxes drawn before, and the real town (OSM raster; buildings estimated from coverage and size class):

| place | boxes | h/w median far/mid/near | h/w > 3 | towers | real buildings | real h/w p10/50/90 |
|---|---|---|---|---|---|---|
| haifa | 1851 (339/697/815) | 4.1 / 4.8 / 4.6 | 68 % | 10 | 16 643 | .23 / .75 / 1.41 |
| tel-aviv | 912 | 5.0 / 4.5 / 5.9 | 83 % | 26 | 33 938 | .30 / .75 / 1.27 |
| jerusalem | 1328 | 5.7 / 6.9 / 5.3 | 86 % | 9 | 41 419 | .51 / .75 / 1.44 |
| beit-shean | 185 | 4.4 / .8 / .8 | (29 % > 1.5) | 1 | 2 761 | .27 / .56 / .80 |
| rosh-pina, shadmot, ein-gedi, neve-zohar | 185, 39, 51, 41 | <= 1.1 | 0 | 0 (2 hotels) | 1246, 257, 489, 170 | median .58 .40 .56 .40 |

One box stands for 9-37 buildings, so a width of at least one building is the honest size. Levels p10/50/90: haifa 3/4/8, tel-aviv
2/4/7, jerusalem 3/4/8. Frontage p10/50/90 13/18/45 m (tel-aviv and jerusalem 13/18/26).
Boxes >= 12.5 m: h/w p10/50/90 haifa 4.1/5.3/9.4 (1207 boxes), tel-aviv 3.7/5.3/8.6 (660), jerusalem 4.0/5.9/9.7 (1087). On the
height's own scale their bodies are 3.7-4.2 m wide; the real median frontage is 18 m.

## 2. Root cause
`src/data/city/outsideView.ts:406` (`fabricBoxes`): `legible = look && heightM < HOUSE_TOP_M ? look.house.w * k / frame.k : 0`.
The composed width (a 13 m house at the legible scale) is given only under 12.5 m. A standard 4-storey block is 13.4 m: it takes
the stretched height (x13.6) and falls back to the true horizontal width (~1 px). The jump at the threshold, mid row (w x h px):

| | 9-12.5 m | 12.5-16 m |
|---|---|---|
| haifa | 3.48 x 3.78 | 1.01 x 4.77 |
| tel-aviv | 3.54 x 3.97 | 1.15 x 4.51 |
| jerusalem | 4.07 x 4.42 | 1.21 x 4.88 |
| beit-shean | 4.81 x 5.24 | 1.75 x 6.67 |

A taller neighbour is three and a half times narrower, and the median storey count (4) is just over the line.
Same fault in towers: `:192`, `:275` a silhouette or folded tower has a constant px width (2-3.5) whatever k is.
Proof by replacement: dropping only `heightM < HOUSE_TOP_M`: median h/w of blocks >= 12.5 m 5.3 -> 1.72 (haifa), 5.3 -> 1.97 (tel-aviv),
5.9 -> 2.07 (jerusalem); boxes -> 888 / 384 / 511; towers 11 / 26 / 10. With the real frontage too (the patch): 1.22 / 1.31 / 1.37.
Ruled out: terrain s (moves feet, not heights), the height percentile draw, the min px height, beyond-boundary towns and far-city blocks
(h/w .13-.5 and ~2 at <= 1 px). The pointed brown spikes at ein-gedi and jerusalem are terrain.

## 3. Independent truth
Raster storeys over the side of the size class's area: median h/w .75, p90 1.3-1.4. Fabric drawn at a median of 5 (p10 3.7+) has no
counterpart; only catalogue towers go past 3.

## 4. The fix (patch)
Rule: a body's width is on the same scale as its height. The scale exists already: a 13 m house is drawn `look.house.w` wide, so
`plan = look.house.w / 13` px per metre of frontage at mid depth, times k / frame.k at depth.
- `data/city/form.ts`: `FRONT_M = [13,7,9.5,13,18,26,45,60]` (side of the size class's middle area). `cityRaster.ts`: `front?`.
- `data/city/outsideView.ts`: `OutsideLook.plan`, `planPx(look, frame, frontM, k)`. `fabricBoxes`: width >= max(house width, planPx(front)
  for >= 12.5 m); the existing slot composition now also thins those boxes, so bodies do not overlap. Silhouette/folded tower width =
  max(old px, planPx([18,22,28] m)), the glyphs' own plan widths. `fold` indexes only a folded tower's core (`CORE` .5, with a look), so a
  tower behind another's shoulder still rises as a spire.
- `world/outside.ts`: `lookOf` returns `plan`; `fabricOf` passes `frontM`.
- `scene/model/outsideShape.ts`: a wide body near the text or the dot is trimmed (KEPT 1/.8/.6) instead of dropped.

| place | boxes | all h/w p10/50/90 | > 1.5 | > 3 | towers | body on its own scale |
|---|---|---|---|---|---|---|
| haifa | 1851 -> 822 | .49/1.06/2.09 | 69 -> 18 % | 68 -> 2 % | 10 -> 10 (same list) | 4 -> 9.5/9.5/24 m |
| tel-aviv | 912 -> 349 | .60/1.25/3.69 | -> 36 % | 83 -> 15 % | 26 -> 30 (all 26 kept) | 4 -> 9.5/17/28 m |
| jerusalem | 1328 -> 445 | .49/1.06/2.16 | -> 29 % | 86 -> 2 % | 9 -> 10 | |
| beit-shean | 185 -> 128 | .48/.81/1.08 | 29 -> 0 % | 0 | 1, 2.0 -> 6.2 px wide x 18.8 | |
| neve-zohar | 41 -> 41 | 2 hotels 3.5 x 25 -> ~13.4 x 25 px (1.9) | | | | |
| rosh-pina, shadmot, ein-gedi | signature-identical (bdf082e6, f440517c, 1d052676) | | | | | |

Skyline: all 16 towers >= 150 m in tel-aviv kept; Azrieli's icon and the 350/304 m glyphs unchanged (7.0 x 63/54 px); Haifa's ten
likewise. At the old threshold (haifa): 3.47 x 3.75 then 4.48 x 4.78 px, no jump. Geometry signature is identical at 07:00, 10:00, 12:00, 15:30,
16:00 and in the 2026-03-15 haifa fixture: it does not follow the hour. buildWorld 1179 -> 1142-1172 ms (noise); 2.3-3x fewer boxes to
paint. `outside.test.ts` 109/109, outsideNeighbours, outsideSeats, markOcclusion pass with the patch; tsc: only the missing geotiff module.
Stills looked at: haifa 12:00, 15:30, 16:30, 21:00, 2026-03-15 14:00; tel-aviv real and drawn; jerusalem 13:00; beit-shean rain; neve-zohar
16:00; rosh-pina. The forest is gone and the skyline stands.

Test (fails before, passes after) for `outside.test.ts`: in haifa, tel-aviv, jerusalem (a) median h/w of the place's own seeded blocks
>= 12.5 m is <= 1.6 (5.3 / 5.3 / 5.9 now); (b) a 13.4 m block is not narrower than a 12.4 m house at the same depth (1.0 vs 3.5 px
now); (c) each such body >= planPx(its frontage).

Also changes: pixel references must be re-recorded; the drawn style's `townBlocks` merge becomes mostly a no-op; night windows appear on
bodies >= 1.6 px. Cache keys follow the geometry (no new key). No painter is touched.
Risks: the dot's clear zone reads slightly wider; FRONT_M is a class middle, not a survey.

## 5. Follow-ups, ranked (not in the patch)
1. `world/outside.ts:156-158` `heightAt` ignores mapped levels where built < .2 and draws 1-2 storeys at random. Boxes on such squares
   with mapped levels: haifa 213/766, tel-aviv 57/270, jerusalem 68/399 (real median 4), rosh-pina 96/185, shadmot 27/39, beit-shean 39/128.
   Test `levels > 0` as well.
2. Tel-aviv's core still reads as one solid wall: 194 folded towers at plan scale (102 boxes > 40 m make the remaining 15 % over h/w 3).
   They are real; if the owner wants air between them, compose folded towers in slots as the fabric is.
3. `outside.ts:683` towers beyond the boundary use the angular height, ~8x smaller per metre than the town's own (tel-aviv 120 m beyond:
   2.1 x 2.8 px against ~24 px inside). An owner decision about the boundary, not a cause of the forest.

## Not proven
The full test suite, CI pixel references and painter timings were not run. Real buildings are estimated (coverage x class), not counted;
OSM levels not checked against a survey. A culling bias in `visible()` toward tall boxes was not measured.
