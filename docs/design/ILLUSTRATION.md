# Illustration (v7): marks that belong to the hill

Extends `LANDMARKS.md` (data, projection, life rules stay) and replaces its §3 "Drawing style", the `homes` glyphs and the generic
vocabulary. `ATMOSPHERE.md` still wins on weather. Sizes are CSS px at the 128 px scene height, 375 px width. Curated city glyphs are not
redrawn this round; they inherit §2 (seat, light, depth) through the shared wrapper.

Owner verdict on the current build: **"מודבק"** (pasted on). That is the brief. A mark must look like part of the slope and lit by this sky.

## 1. Critique: why it reads as stickers
Seven causes, all visible in the QA stills:
1. **One tone.** Every mark is `--ridge-near`, so it only exists where it breaks the skyline. Anything on the hillside is invisible
   (the homes), and what is visible is a black cut-out with no surface.
2. **Everything stands on the edge.** All bases are on the ridge line itself, like cake toppers. Nothing sits on the face of the slope,
   nothing is half hidden behind the crest. Real villages drape over a hill.
3. **Flat base on sloped ground.** The glyph box is horizontal, the ground is not: one corner floats, the other is buried.
4. **Single objects, even rhythm.** Lone pins at near-equal gaps (Karmei: 4, Umm al-Fahm: 5) read as fence posts or antennae. Places are
   clusters with one or two things rising out of them.
5. **Uniform scale and no depth.** A mark 1.4 km behind the section line is drawn like one 1.4 km in front of it.
6. **Light ignores the sun.** The sun disc sits left or right, yet no mark has a lit side; at night nothing but 1.5 px dots.
7. **The place itself is missing.** The dot marks a bare crest. The biggest shapes in the frame belong to somewhere else.

Per still:
| Still | What fails |
|---|---|
| karmei-day | Bare crest under the dot: homes are 12×6 px in ridge colour on ridge. The only marks are 4 identical 10 px pins on the west saddle, evenly spaced: fence posts, not minarets. Nothing says Gush Etzion. |
| karmei-night | No window is visible anywhere on the crest. The pins carry dots too small to read. Night is the easiest time to show a village and it shows none. |
| jerusalem-day | Best of the set because it is a cluster that breaks the skyline, but 4 objects on an empty hill: no city mass under them, one flat tone, bases on the edge. The bridge mast leans into the dot. |
| jerusalem-night | Cluster becomes a dark knot; the gold dome is the only thing that survives. No lit city below it. |
| telaviv-day | Towers stand on a bump well above and beside the dot, so the dot is not "in" the city. Chimney floats at the shoreline with a flat foot. Sun is directly behind, yet no rim light. Elevation label touches the sheet edge. |
| haifa-day | Dark marks on a dark teal sky: contrast gone. The cooling tower is a lone stub on the valley floor at the frame edge: a bollard. |
| shadmot-day | Everything lives in a 6 px strip on the valley floor in the floor's own tone; palms unreadable; elevation label, dot and sea label crowd the marks. |
| roshpina-day | The largest shapes are two blocks on the west hill, not the village; the dot sits in an empty saddle. Two turbines at the east edge read as typographic asterisks and are clipped. |
| mitzpe-ramon-day | Nothing drawn. The crater cliff is right, the town does not exist. |
| umm-al-fahm-day | Right raw material (minarets on a summit) but five identical pins at equal gaps, colliding with the dot, and a city of ~55 000 has no mass. |

## 2. Integration rules (apply to every mark)
**R1 Three planes from real `dy`.** The view looks north, so north–south offset is depth. Near-layer marks get `plane`:
- `behind` (`dy > +0.3 km`): stands behind the crest. Sink `25 % · clamp(dy/1.5)` of its height below the skyline, scale `1 − 0.2·clamp(dy/1.5)`,
  body tone `--mark-back`. No face detail, one light at most.
- `line` (`|dy| ≤ 0.3`): on the skyline, full size, body `--ridge-near` with lit side (R4).
- `face` (`dy < −0.3`): drawn **on the hillside**, base at `groundY(x) + 3 + 9·clamp(−dy/1.5)`, in face tones (R3). Low kinds (orchard,
  vineyard, solar, castle, homes) are always `face` or `line`, never `behind`.
Far-layer marks: silhouette only in `--ridge-far`, scale 0.6, no lit side, no windows, aviation light only.

**R2 Seat.** Base is horizontal at `max(groundY(x − w/2), groundY(x + w/2)) + 1`: the downhill corner touches, the uphill corner is buried.
Never a floating corner. If the two edge heights differ by more than `0.6·w`, shrink `w` to 70 % once; still too steep → drop the mark
(homes: skip that slot). Face marks additionally get a 1 px `--mark-shade` line under the base, 1 px wider than the mark on the side away
from the sun (the only "shadow"; none at night or under overcast).

**R3 Tones (new tokens on `.scene`, all derived, so theme / dusk / night / haze follow for free).**
```css
--mark-back:  color-mix(in srgb, var(--ridge-far) 35%, var(--ridge-near));
--mark-wall:  color-mix(in srgb, var(--sky-horizon) 38%, var(--ridge-near));   /* limestone lit by this sky */
--mark-lit:   color-mix(in srgb, var(--sky-horizon) 55%, var(--ridge-near));   /* sun-side strip */
--mark-shade: color-mix(in srgb, #000 28%, var(--ridge-near));
--mark-roof:  color-mix(in srgb, #B5553C 55%, var(--ridge-near));              /* terracotta */
--mark-green: color-mix(in srgb, #5E7B4A 45%, var(--ridge-near));
--mark-panel: color-mix(in srgb, #3E5C7A 50%, var(--ridge-near));
```
Because walls borrow `--sky-horizon`, they are pale at noon, warm at dusk and almost ridge-dark at night without any per-phase code.
All mark groups keep `opacity: calc(1 − var(--near-fade))`, so fog takes walls and ridge together. Check contrast: wall vs ridge
≥ 1.25:1 luminance by day (subtle on purpose), roof vs wall clearly darker. No strokes, no gradients, min feature 1.5 px.

**R4 Light from the sun side.** `lightSide = sun ? (sun.x < markX − 40 ? 'w' : sun.x > markX + 40 ? 'e' : 'top') : glow?.side ?? null`.
Off when `cloudCover ≥ 80`, haze heavy, or night. Drawing: reuse the body path as a `clipPath`; inside it one rect over the sun-side 35 % of
the glyph box, fill `--mark-lit` (afterglow: opacity .5). `top` → a 1 px rect along the top 1.5 px instead. `line` and `face` marks only.
Homes: the wall facing the sun uses `--mark-lit`, the other `--mark-wall`.

**R5 Clusters, not pins.** Marks that belong to the place (within 0.6 km of the centre: synagogue, water tower, mosque, church, silo) are
**absorbed** into the settlement cluster (§4) and stand among its roofs. Elsewhere a tower kind standing alone gets its `skirt` (2–3
low roofs drawn with it, see §3) so it never stands as a bare pole. Gaps between neighbours are seeded, never equal.

**R6 Night.** Lights are the picture at night: every house gets a window chance (§4), worship halls glow, minarets carry a green lamp.
Body tones collapse toward the ridge by themselves (R3).

## 3. Glyph system (generic path)
Each glyph is drawn in a viewBox whose units equal px at the stated size (so 1.5 px rules can be checked), anchored bottom-centre, and
scaled only by plane (R1). `w × h` at `line` scale. Heights for towers still come from `markHeight(heightM)`; widths scale with it.

| Kind | Size | Silhouette (bottom → top) | Tone / light | Night |
|---|---|---|---|---|
| **house-tile** | 7 × 6 | wall 6 × 3; hip roof 7 wide, 3 high, flat 2 px ridge on top (trapezoid, not a spike). Every 3rd house is 9 × 7 with an L-step | wall `--mark-wall`/`--mark-lit`, roof `--mark-roof` | 1 window 1.5 × 1.5 at wall centre, `#FFD9A0` |
| **house-flat** | 6–8 × 5–8 | plain box, flat top; 40 % carry a 2 × 1.5 roof box (stair head / water tank) at one end; stack: boxes overlap 1–2 px and step with the slope | wall tones only, roof = wall top 1 px `--mark-lit` | 1–2 windows |
| **block** (city) | 6–9 × 9–15 | slab; flat roof with 2 × 1.5 plant box; 2 px gaps or 1 px overlaps | wall tones; back row `--mark-back` | 2–4 windows in a column grid (x step 2, y step 2.5) |
| **synagogue** | 11 × 9 | hall 11 × 6; shallow gable 3 high over the middle 7 px; three narrow arched windows 1.5 × 3.5, gap 1.5, centred. Taller than every house beside it | wall + roof tones (roof flat-toned in flat-roof clusters) | the three windows are always lit when lights are on (opacity 1): the tell |
| **mosque** (`minaret`) | 14 × `hPx` (≈ 17–20) | hall 9 × 5 with a dome r 3 on it (centre x 4.5); beside it the minaret: shaft 2.5 wide; balcony disc 5.5 × 1.5 at 68 % height; shaft 2 wide above it for 3 px; cone cap 2.5 wide × 4 high; 1 px finial | hall wall tone, dome + shaft `--ridge-near` + lit strip | green lamp `#7CE0A0`, 1.5 px dot + 3 px halo α .3, just under the balcony (green minaret lights are common in the region; per-site unverified); hall 1 window |
| **church** | 12 × 14 | nave 8 × 6 with gable 3; square tower 3.5 wide at one end to full height, pyramid cap 3 high, 1 px cross | wall tone, roofs `--mark-roof` | 1 arched window in the tower |
| **waterTower** | 9 × `hPx` (≈ 16) | tapered concrete shaft 3 → 2.4 wide, 60 % of height; tank = inverted cone 2.4 → 9 wide over 2.5 px, then cylinder 9 × 3.5, flat lid with a 2 × 1 nub (mushroom / goblet type; older kibbutz towers are plain cylinders on legs, not drawn) | `--ridge-near` + lit strip; tank underside `--mark-shade` | none (aviation dot only if `h ≥ 60`) |
| **castle / ruin** | 16 × 8 | tower stub 5 × 8 with two 1.5 px merlons at the west end; wall stepping down 6 → 4 → 2.5 in jagged steps; one arch gap 2.5 × 3 | wall tone, no roof colour | none |
| **orchard** | 16–28 × 8 | **face patch**, not trees on a stick: 3 rows of round crowns r 1.4, pitch 3.5, rows offset half a pitch, each row following `groundY` | `--mark-green`; sun-side crowns +10 % `--mark-lit` | none |
| **vineyard** | 20 × 7 | face patch: 4 parallel 1 px lines following the slope, 2 px apart, ends staggered | `--mark-green` | none |
| **solar** | 18 × 6 | face patch: 3 rows × 4 panels, each a 3.5 × 1.5 parallelogram leaning 30° toward the south (down-slope) | `--mark-panel`; top edge 0.75 px `--mark-lit` when sun is up | none |
| **palms** | as today | keep (the only crown that sways) | trunk ridge tone, crown `--mark-green` | none |
| **highrise** | 6–7 × `hPx` | slab, roof plant 2.5 × 1.5 off-centre; two or more within 30 px overlap 30 %, rear one `--mark-back` | ridge + lit strip | 3–6 windows in a 2-column grid; aviation if tall |
| **chimney** | 3.5 → 2.5 × `hPx` | straight taper, 1 px rim at the top, on a 9 × 3 plant block | ridge + lit strip | aviation dot |
| **cooling** | 12 × 14 | hyperboloid: base 12, waist 8 at 65 % height, rim 9 | ridge + lit strip (wide: 40 %) | none |
| **turbine** | tower 1.6 → 1 × `hPx` | nacelle 2.5 × 1.5; three blades 1.2 → 0.5 wide, 0.42·`hPx` long, at 90° / 210° / 330° when parked | `--mark-back` when far; no lit strip | aviation dot at the nacelle |
| **mast** | 5 → 1 × `hPx` | open lattice: two legs + 2 cross bars (not a filled line), 1 px top spike | ridge, opacity .8 | aviation dot if tall |

`skirt` (R5), drawn with a lone mosque / church / water tower / synagogue outside the cluster: 2 houses of the local roof type, one each
side, 1 px overlap with the hall. Sizes above are minimums for readability; do not shrink a glyph below them to fit: drop it instead.

Reality notes. Israeli water towers: concrete, tapered or cylindrical shaft with a flared tank. Gush Etzion / community settlements:
red-tile roofs stepping down terraces. Arab hill towns: dense flat-roofed cube houses, often with rooftop tanks, minarets above them.
Negev towns: low flat-roofed blocks in rows. Rooftop solar water tanks are near-universal in Israel but below our pixel budget (the roof
box on flat houses stands in for them). Synagogues have no single silhouette; the tall three-window hall is a chosen convention, not a fact.

## 4. The settlement cluster (the place's own homes)
Replaces `homes-small/medium/large`. A pure function composes it: `composeSettlement(place, terrain, marks, width) → Settlement`.

**Style, from data we have** (first match):
| Style | Rule | Houses |
|---|---|---|
| `blocks` | `population ≥ 50 000` or `settlementType = city` | block |
| `flat-hill` | ≥ 2 `minaret` marks within 1.5 km of the centre and no `synagogue` there | house-flat, stacked |
| `flat-desert` | `lat < 31.25`, or `regionHe` contains נגב / ערבה / ים המלח | house-flat in straight rows, 2 px gaps, no stacking |
| `tile` | otherwise | house-tile |
OSM gives `place=village` for moshav, kibbutz and community settlement alike, so **we cannot tell them apart and do not pretend to**. A
kibbutz reads as one only through marks that are really there (water tower, silo, orchards).

**Size, from `population` (fallback `settlementType`, as `placeHomes` does today).**
| Size | Rule | Skyline row | Face rows | Width |
|---|---|---|---|---|
| small | < 2 000 / village, hamlet | 5 | 4 + 3 | 54 |
| medium | < 50 000 / town | 8 | 7 + 5 | 86 |
| large | else | 10 (mixed heights 9–15) | 9 + 7 (heights 7–10) | 124 |
The cluster is wider than the real place (Karmei Tzur is ~0.6 km ≈ 9 px). Same stated licence as tower spacing: order and position are
true, extent is not. Scale counts with width: +1 house per row per extra 120 px of scene width.

**Composition.**
- Centre on the dot. Skyline row: houses at pitch 9 (tile) / 7 (flat) / 8 (blocks) with seeded jitter ±1.5 px in x and ±1 px in height;
  each seated by R2 at its own `groundY`, so the row **follows the crest**.
- Face rows: row `r` (1, 2) sits at `groundY(x) + 5.5·r`, offset half a pitch, 1 house fewer at each end, so the cluster tapers down the
  slope like a draped triangle. Row 2 houses are 85 % size. Between rows one 1 px `--mark-shade` contour, following the ground, spanning the
  row and fading over the last 6 px: the terrace / street. This is the single biggest "belongs to the hill" cue; no contours elsewhere.
- `flat-hill`: rows overlap vertically by 1.5 px (stacked cubes), no contours. `blocks`: face rows use `--mark-wall`, skyline row behind
  them uses `--mark-back`, so the city has mass and depth.
- **Dot.** No skyline house within ±6 px of the dot centre; the dot sits in that gap on the crest, its existing ring separating it.
- **Label.** The elevation label moves **below the cluster**: `top = centerY + 7 + faceDepth` (`faceDepth` = 5.5 × rows + 2). If that
  exceeds 116, drop face row 2, then row 1, until it fits. Face houses never enter the label box (label width 46 × 13).
  Below sea level (label at `seaY + 6`) and in a sea-label collision: same drop order.
- **Absorbed marks** (R5) replace the house in the slot nearest their true x, on the skyline row, keeping west→east order. At most 3.
- **Never drawn:** over water samples, where the seat test fails, under the hour readout zone (top < 22), or when a highrise within 1 km
  already makes the skyline (then only the face rows are drawn, as `block`s, under the towers).
- **Night.** Lit share per house = `life.litShare` (seeded per house, stable between renders). Storm / fog daytime 30 %. Windows keep
  `(1 − 0.7·fade)` so the village glows through haze. No halo below `farFade 0.4`.

## 5. Density and priority
- Budgets at 375 px: settlement cluster (1, not counted) + **line/behind marks ≤ 5** + **face patches ≤ 2** + **far ≤ 2**. +1 line mark
  per extra 150 px, cap 8.
- Per-kind caps: minaret 2 (3 at ≥ 600 px), mast 1, orchard/vineyard patches 2 (merge all within 1 km into one patch; width 16 px for 1,
  22 for 2–3, 28 for ≥ 4), solar 1, highrise 4.
- Diversity: after a kind is picked, later candidates of that kind score −3. Weights change: waterTower 7, synagogue 6 (new), castle 6,
  mast 1; others as in `rank.ts`.
- What wins when crowded: named > absorbed-in-cluster > tall industrial > worship > water tower / castle > fields > mast.
- Spacing: line marks ≥ 6 px between boxes (was 3), seeded so gaps differ by ≥ 2 px; the cluster width is a blocked zone for
  non-absorbed marks; face patches may tuck under line marks but not under the cluster or the label. Max shift 24 px, else drop the lower score.
- Edges: no mark box within 8 px of the scene edge (fixes the clipped turbines).
- Far marks: `--ridge-far`, ×0.6, min width 3 px, existing fade / bleach / `hideFar`.

## 6. Look test (owner approval gate)
One place, two stills, 375 × 128 CSS px at DPR 2 and 3, real data cell: **Karmei Tzur, clear day ~10:00 (sun east) and 21:00.**
Expected picture: a `tile` cluster of 12 red-roofed houses draped over the crest and its south face, dot in the gap, "951 מ׳" under the
cluster; to the west two mosques (hall, dome, minaret; Beit Ummar side), one water tower, an orchard patch on a face, the castle or the
solar field if it survives ranking. Night: ~12 warm windows on the crest, two green minaret lamps, everything else ridge-dark.
Acceptance (each is pass/fail):
1. A person who knows the place names it, or at least says "a settlement on a hilltop with Arab villages beside it", from the still alone.
2. Count the houses: ≥ 10 distinguishable at 375 px, roofs visibly a different colour from walls by day.
3. Minaret is recognisably a minaret (balcony + cone + dome hall), and is not confusable with the water tower or a cypress.
4. No mark, house or contour overlaps the dot ring, the elevation label, the sun caption or the sea label (bounding boxes, 2 px margin).
5. No floating corner: every base is at or below the ground at both ends.
6. Lit sides face the sun in the day still; the night still has no lit side.
7. Squint test (blur 2 px): the cluster still reads as one lighter mass on the hill, not as speckle.
8. Regression pass on Umm al-Fahm (flat-hill, minarets inside the cluster), Mitzpe Ramon (flat-desert rows on the rim), Rosh Pina (tile
   cluster in the saddle, turbines inside the frame), and the four curated cities (seat + light only, nothing lost).
If 1–3 fail, change the drawing, not the thresholds.

## 7. Implementation notes
Implementer may be Codex or Claude; the numbers above are the contract. Files ≤ 150 lines, no new dependencies, glyphs are pure SVG
function components with no state.
- `src/data/landmarks/types.ts`: add `'synagogue' | 'vineyard'` to `MarkKind`; `PlacedMark` gains `plane: 'behind' | 'line' | 'face'`,
  `wPx`, `absorbed?: boolean`. New `House { x, baseY, w, h, type, row, lit: boolean }`, `Settlement { style, houses, contours, faceDepth, halfWidth }`.
- `overpass.ts` `classify`: `religion=jewish` + building → `synagogue` (9 m); `landuse=vineyard` → `vineyard` (needs a line in
  `filters.ts`, hence a rebuild of the monthly static file). Until rebuilt, vineyards simply do not appear.
- New `src/data/landmarks/settlement.ts` (`settlementStyle`, `composeSettlement`) and `seat.ts` (R2, shared by marks and houses).
  `placeMarks.ts`: delete `placeHomes` / `withPlaceHomes` homes glyph logic and the `homes-*` strings; add plane (R1), seat, caps, edge
  margin; it is at 105 lines, so move label / blocked-zone logic into `rank.ts` or a new `zones.ts` rather than growing it.
  `rank.ts`: new weights, per-kind caps, diversity penalty, 6 px gap, orchard merge.
- `src/ui/scene/marks/`: `Settlement.tsx` (one `<svg>` with `viewBox = 0 0 sceneWidth 128`, so no stretch; houses, contours, windows);
  `MarkLight.tsx` (R4 clip + rect); split `glyphs/Generic.tsx` into `glyphs/generic/{homes,worship,towers,industry,fields}.tsx` + an
  `index.ts` map; remove the old `paths` entries that are replaced. `Landmarks.tsx`: pass `lightSide`, render by plane order
  (behind → line → face → settlement), drop `windows()` in favour of per-glyph window slots. `marks.module.css`: R3 tokens, `.face`,
  `.back`, `.lit`, `.shade`, `.lamp`.
- `ValleyScene.tsx`: compute `lightSide` inputs (`sun`, `glow`, `cloudCover`), pass `settlement.faceDepth` into the `.depth` label top.
  Sway now applies to palms only (orchards are patches); update `CALM-LIFE.md` wording.
- Motion: nothing new moves. Existing sway / turbine keep their reduced-motion and Save-Data guards; lights and lit sides are static.
- Tests (pure, vitest):
  1. `settlementStyle`: pop 60 000 → blocks; 3 minarets ≤ 1.5 km, no synagogue → flat-hill; lat 30.6 → flat-desert; Karmei Tzur → tile.
  2. `composeSettlement` small: 12 houses, none with centre within 6 px of the dot, all inside `center ± 27`, rows taper 5/4/3.
  3. Seat: for every house and mark, `baseY ≥ groundY` at both box ends (no floating corner) on a 30° synthetic slope.
  4. Label: label box intersects no house box; with `centerY = 108` face rows are dropped and the label stays ≤ 116.
  5. Plane: dy +1.0 → behind, scale ≈ 0.87, sunk; dy 0.1 → line; dy −1.0 → face, base ≈ ground + 9.
  6. Caps: Karmei fixture (24 minarets, 4 water towers, 40 orchards, 1 castle, 1 solar) → ≤ 2 minarets, ≥ 1 water tower, ≤ 2 patches,
     ≥ 3 distinct kinds, all gaps ≥ 6 px and not all equal, no box within 8 px of the edge.
  7. Light: sun.x 60, mark x 200 → 'w'; sun.x 190 → 'top'; night → null; cloud 85 → null.
  8. Glyph size table: every generic glyph's declared `w × h` ≥ the minimum in §3; DOM test that a `tile` house renders two fills.
  9. Lit houses are stable for the same seed and equal `round(litShare · n)` ± 1.
- Build order: tokens + seat + plane → settlement (Karmei look test, stop for approval) → worship / water tower / castle glyphs →
  field patches → light strip → caps / diversity → regression stills for the other nine captures.
