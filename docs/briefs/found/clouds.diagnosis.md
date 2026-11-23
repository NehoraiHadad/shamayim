# D / clouds: the model (fcd96b26)

Verdicts: 1 eggs/barrels/vases: FAULT (the dome's scale, not the cells' own size); flat base: PARTLY. 2 gaps: TRUE in size, PARTLY
too regular. 3 square holes: FAULT (an overhead round cell on a cylinder dome; the grid only squares the corners). 4 icicles:
FAULT. Near tower's neck: MODEL. Prototype: `clouds.patch` (git diff against fcd96b26, not committed; worktree left dirty). It
touches only `src/scene/model/`: new `cloudSheetSeen.ts` (110 lines), 4 lines of `cloudSheet.ts`, 15 of `cloudCells.ts`.
Typecheck clean except the missing `geotiff` module (not mine). No test, no browser, no still was run on it.

px = css unless "png" (x2). Numbers: `npx tsx` on the fixtures, elevation = the panorama's ground, so cells match the stills.

## 1. Eggs, barrels, vases
What the model gives. Low/mid cells are never bodies: `cloudSheet.ts` samples one thin sheet at base + meanV/2
(`density.ts:25`), so a cell shows only its foreshortened disc: no side, no flat base, whatever its v.
The cells themselves are wider than tall: Ac v/w .05-.25, Cu humilis .4 (`dimensions.ts`). Not the cause.

Cause: `sky.ts:69-70`. Azimuth 1.5 px/deg everywhere. Altitude scale (px/deg): 5deg 5.95, 10 2.59, 15 1.67, 20 1.45, then above
DOME_ALT = 22: 25 6.08, 30 5.25, 40 4.65, 50 4.35, 70 4.01 (to fill the portrait sky). So vertical/horizontal, as a true angle:
.97 at 20deg and 4.06 at 25deg: a 4x kink at one line (y = 645 png). A flat disc's drawn h/w: .31 @20, 1.55 @25, 1.51 @30, 1.53 @40,
1.43 @50; true sin(alt): .34, .42, .50, .64, .77.

| still | cell | drawn w x h (png) | h/w | true disc |
|---|---|---|---|---|
| tel-aviv egg (262,385) | ac w 2.63 km, v .49, alt 46 | 112 x 165 | 1.48 | .74 |
| tel-aviv barrel (275,580) | ac w 4.2, alt 25 | 82 x 121 | 1.47 | .45 |
| haifa 15:30 egg (95,460) | sc w .74, v .48, alt 35 | 125 x 193 | 1.54 | .62 |
| neve-zohar blob (560,250) | cu w .54, v .22, alt 58 | 209 x 250 | 1.20 | .87 |

(The tel-aviv "cumulus" are the Ac patches: low cover is 0 there.) A cloud that straddles 22deg is stretched above and squashed
below: the vase/barrel, and the shelf at y = 640 in both styles.
Proof by replacement: over 8 places x 4 hours + haifa 15:30 + 15.3 haifa, every lone cloud wholly above 23deg: 30 of 30 taller than
wide, mean h/w 1.42. With only the shapes changed (dome, placing, v untouched): 8 of 26, mean .87. Both styles: same desc, same
outlines (compared; the drawn hand only rounds them).

Truth. Perspective: a thin disc's h/w is sin(alt) <= 1, and its side adds (v/w)cos(alt); fair Cu v/w .4 gives 1.0 at 35-60deg, Ac .2
gives .85 at 45. So Ac patches and flat Cu are wider than tall or at most round; only growing Cu exceeds it. Flat base at the LCL
is seen as a line only low down: the base's arc depth over its width is sin(alt)/2 (.09 at 10deg, .32 at 40), so overhead a round underside is TRUE;
below 22deg the drawn lens (no domed top over a flat bottom) is a FAULT of the thin sheet, small (heights 5-20 png px).

Fix A (recommended, prototyped). `cloudSheetSeen.ts`: a cell whose near edge is above DOME_ALT keeps its place and its area and takes
the eye's proportions:
  stretch = (drawn h/w of its disc on this dome) / ((near - far)/across + min(.5, v/w) cos alt), >= 1
  semi-axes: r/sqrt(stretch) along the range, r*sqrt(stretch) along the circle of its range (polar, so nothing drifts outward);
  faded to 1 as the cell comes overhead (d/r 1.5 -> 1). Below DOME_ALT nothing changes (SPEC 196 kept: sun and relief).
Continuous in altitude; derived from the dome itself, so another dome or screen gives its own numbers.
tel-aviv egg 112x165 -> about 147x125 png by the formula (measured row: 54x90 -> joins its neighbour with the new outlines).

Others, ranked: B (dome): join the relief and the dome with one slope (C1) at about 7deg, removes the kink and shelf but not the 2.7x
stretch, and clouds at 7-22deg leave the sun/relief (28 px at 22deg): breaks SPEC 196, moves stars and contrails. Owner's call.
C: Ac/Ci drawn solid while the light takes their gaps: `transmit.ts:77` gap .35/.5, but `cloudSheet.ts` alpha = 1-exp(-tau slant):
Ac tau 7 draws .999, the light gets .65 of it. Drawn and lit should agree: alpha_ac = (1-gap)(1-exp(-tau slant)). Not prototyped
(changes the Ac look everywhere). D: low Cu as rays through the cell (`rayCell.cellInterval`): gives side and base, but with
the relief's 2-6x stretch below 10deg it draws towers, so it needs Fix A's rule there too. Later, if flat bases matter.

## 2. Gaps
33 moments, low and mid, ground plane (r < 5 / 20 km). Clear chord / cloud chord equals (1-c)/c to 2 digits (identity; it
checks the measure), and the realised cover scatters round the input (low .33: .30-.45; .44: .33-.51). Low: clouds .9-1.4 km, gaps
1.1-2.1 km, spacing 2.0-2.4 x layer height at cover .33-.44: what Cu fields show (2-3 x the mixed depth). TRUE.
Mid Ac: patches 3.4-6.4 km, gaps 4.7-18 km at 4.2 km: true for patches of 3-15 km (SPEC), but one patch fills the sky above 22deg.
Regularity: mean nearest neighbour / Poisson's: 1.09-1.57, mean 1.43 (1 = chance, 2.15 = hexagonal). Satellite Cu fields are 1 or below
(random to clustered; Sengupta 1990, Weger 1992: from memory, not re-read). So PARTLY: too even. Cause: `lattice.ts:104-105` jitter .7 pitch,
one site per pitch, Q = 1 at cover >= .33 (low). Fix (not prototyped, low rank): jitter 1.0 pitch and `0.35` -> `0.5` in `visitDay.ts:23,47,48`;
needs the COVER_CORRECTION table recalibrated (more overlap), and moves every cloud of every place. Not worth it alone.

## 3. Square holes (neve-zohar 16:00, mid As cover .823, sheet grid 48 x 25: columns 16 png, rows up to 47 png)
Hole (150-330, 385-560) png. Which edge is whose (distance of the edge from the cell's middle / its r):
- top, (160,375), (230,370), (300,378): 1.01, 1.00, .99 of ONE cell: d 1.4, r 5.6 km, tau 16: it covers the zenith.
- right, (330,440), (330,480): .98 of the cell at 4.7 km r 3.6, .99 of the one at 9.2 km r 4.0.  Left: 1.03 of the cell at 5.0 km r 3.4.
- second hole's top, (560,490), (620,490): 1.08, 1.01 of the same overhead cell.
A disc round the zenith is a nearly horizontal line on a panorama dome (all azimuths, nearly one altitude: 47-49deg over 150 px);
discs to the side are near-vertical lines under the 4x stretch. Two of each make a box. And the rim is a step: tau 16 (1-rr^2) is
alpha .94 at .95 r (`rasterNodes.kernel`).
Which step it is not (same region, dense 8 png samples):
- thin sheet, no grid: same box, arcs instead of steps (mean alpha .588 vs drawn .619);
- exact volume rays (`transmitAlong`): same box with a straight top, 30 png lower (.664). So neither the mask nor the sheet;
- the 48x25 grid + linear resample adds: alpha goes 92 -> 0 in one row over 11 columns (a straight 168 png lintel), 16 png stairs at the
  sides; `soften` then rounds the corners. The real hand shows that; the drawn one warps it into a lozenge.
Truth: clouds' outlines are fractal (perimeter dimension 1.35, Lovejoy 1982), never arcs; an As deck of 8 tenths has torn gaps. The gap
itself, its place and size are true to the cover.
Fix A2 (recommended, in the same patch): as a cell nears (near edge 22 -> 44deg) it takes an outline of its own: lobes m = 2..9 round
it, amplitude m^-1.15 (= -(2-1.35+1/2)), radius scatter .18, phases from `cell.seed`, area kept; interpolated from a 96 table, cached per
seed. It stays with the cell through drift and the midnight handover, so nothing crawls.
Result, same grid: the top's longest level run (within 8 png, alpha .5) 168 -> 80 png, the hole's bbox fill .62 -> .50, flat-side share .35 -> .24.
Doubling the grid (96x49) also tried: no visible gain once the outlines are in, +24 ms. Dropped.

## 4. Icicle far towers (15.3 haifa 14:00)
| png x | km | true angular aspect | drawn tall/w | after |
|---|---|---|---|---|
| 254 | 18 | 1.07 | 2.11 | 1.39 |
| 54 | 18 | 1.34 | 2.66 | 1.73 |
| 543 | 25 | 1.51 | 2.86 | 1.63 |
| 19 | 37 | 1.42 | 2.57 | 1.45 |
| 713 | 38 | 1.18 | 2.13 | 1.20 |
| 124 | 41 | 1.43 | 1.00 (merged cap) | 1.00 |
Cause: `cloudCells.ts:41,52,73`: every tower's own aspect is multiplied by sceneStretch^.55 = 2.85^.55 = 1.78 (the whole sky's mean
stretch) though a far one stands on the relief; at 40 km `MERGE_KM` caps it at 1.0, so there is a 2.6x step at 40 km. Then
`towerHeads.ts:11,13`: tall/w > 1.1-2.2 makes the column .78 w narrowing to .6 of that: 2.66 becomes 3.4 at the foot and 5.7 at the top:
the icicle. Not the cells: v/2r 1.2-1.6 for Cb is right (SPEC 8-12 km by 5-15 km), though `visitDay.ts` scales r by sqrt(share) and
leaves v, so a growing or dying Cb of share .3 is 2.9 (42 km, drawn capped).
Truth: a Cb at 18 km of 9.5 x 11.3 km is 30 x 32 deg: as tall as wide. A photograph shows 1.07.
Fix T (recommended, in the patch): `shapeOf(aspect, stretch, aTop)`: own aspect, or its stretched one up to as tall as wide; towards the
stretched one as its top climbs the dome (22 -> 60deg). Near towers (4-5 km) unchanged: tall/w 2.00, 2.29 before and after; Cg unchanged below 40 km.
The merged mass past 40 km is kept as it was; the step at 40 km is 1.45 -> 1.0 (was 2.57 -> 1.0).
Test that fails today: for `cb` with 5 < rangeKm < 40 and aTop < 22: tall/w <= max(1, v/2r) (2.57 and 2.13 today). `towerHeight.test.ts`'s lower
bound (sqrt(stretch) x shape for < 30 km) contradicts it and must become `shapeOf`; it was written with STAND (3daa7f51), no owner decision found.
Near tower's silhouette (vase, anvil neck): MODEL geometry, `towerHeads.headsOf/halfAt` (main .78-.8 w, base head .94, flare 1.6 from .58 of
the height); `paint/towerShape` and `paint/drawn/towerMass` read those heads and only add noise. Left.

## Before / after of the whole patch
| 34 moments | before | after |
|---|---|---|
| lone clouds above 23deg: taller than wide | 30/30 | 8/26 |
| mean h/w | 1.42 | .87 |
| mean alpha above 23deg, low / mid | .413 / .507 | .402 / .492 |
| ground cover, 400 drawn lattices: Ac, As, Cu | .461 .803 .392 | .468 .798 .397 (se .002-.003) |
| far Cb tall/w (5-40 km) | 2.11-2.86 | 1.20-1.73 |
| all cloud layers' model, ms, 40 fresh runs: neve-zohar / haifa 15:30 / tel-aviv / 15.3 | 13 / 27 / 17 / 21 | 13-17 / 35-40 / 20-23 / 29-31 |

## What else it changes
- Every low/mid cloud above 22deg at all places and hours, both styles; single moments' cover above 23deg move (largest: shadmot 16:00 mid
  .745 -> .535): one overhead cell's outline decides the zenith. The mean holds within .015.
- `OVERLAP` 1.07: the sites are more regular than chance, so longer shapes overlap more (-.015 to -.03 without it). Calibrated, not derived.
- Land light, cloud shadows and the sun's veil stay on round cells. Above 22deg a body is not drawn where the dome has the cloud
  (bodies on the relief), so no visible disagreement there is new; below 22deg nothing changed.
- `layerKey` hashes alpha, so caches follow. `sheetCache` is per snapshot/world/colours and the geometry is in its key.
- Cost: +3 to +13 ms on cellular grids (144x73) here, noisy machine. `cloudSheet.perf.test` (<= 3.5 ms, <= 25 % increment) MAY fail:
  restrict the cells per row first (a row is one range: only |d - range| < reach).
- `cloudCells.ts` is 151 lines: move `shapeOf` + `sceneStretch` to `towerStorms.ts` or a file of their own.

## Tests to add (fail before, pass after)
1. `cloudSheetSeen`: for alt 25..60, a lone Ac cell (v/w .2) on the sheet: alpha > .5 component's h/w <= 1.05 (today 1.4-1.55).
2. Same cell below 22deg: sheet byte-identical with and without (`seenDepth` null).
3. Ground cover of 100 drawn lattices within .01 of the round cells'.
4. An overhead cell's rim (d < r) has no row-straight run over 1/4 of the width at alpha .5.  5. The tower test above.

## Not proven
No still was made: how the softeners and the drawn hand paint the new outlines, whether 1.07/.18 look right, and the CI perf gate are
open. Midnight handover and drift continuity are argued (shape depends on seed and position), not run. Scatter .18 is a choice: only the spectrum's slope has a source.
Literature values are from memory. Vase/shelf at the 22deg kink is reduced (shapes), not removed (Fix B). C (Ac gap) not prototyped.
