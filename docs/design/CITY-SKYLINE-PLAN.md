# City skyline plan: cities that look like the real place

Status: plan only, 2026-11-18. Extends `LANDMARKS.md` (data, projection) and `ILLUSTRATION.md` (seat, tones, light, night).
Owner goal: "as real as possible; if we can reproduce the real skyline, even better". Villages keep today's look.

## 0. Findings (measured today unless marked `?`)

| Fact | Number | Source |
|---|---|---|
| Near layer scale | 15.625 px/km = **64 m per px**; far 6.25 px/km = 160 m per px | `project.ts` |
| A real 30 m wide building | 0.47 px wide. A drawn 6 px block = 384 m = a whole street block | arithmetic |
| True-scale 200 m tower | 3.1 px. Drawn today: 32 px (`markHeight`), terrain is ~6-10x exaggerated | `project.ts`, `scene-2-5d-plan.md` |
| Israel landmark file | 261 cells (0.1 deg), 570 KB, 8 448 rows, **579 high-rise rows** (after the 300 m merge) | `public/data/landmarks/il` |
| Petah Tikva (32.087, 34.887 approx) | 21 merged high-rise rows within 2.5 km, incl. Kiryat Arye **152 m, 100 m, 99 m at dx -1.5..-2.2, dy +0.5..+1.0** | cells |
| Same, band +-1.5 km, per 2 km of x, west to east | 12, 22, 14, 3, 13, 7, 4, 0, 0, 0, 2, 0 (77 rows): towers all the way to the coast | cells |
| Heights over 260 m | 5 rows. Two unnamed 400 m rows near Dimona (30.97, 35.10) are tag errors; the three named Tel Aviv rows (Spiral 350 m, Beyond 307 m, ToHa 2 304 m) are real tall towers (built or under way), **not** errors (review 2026-11-18) | cells |
| Why PT's own towers lose | `useLandmarks.ranked()` keeps the top 8 by `score`; score has `-|dx|/6` only, `-4*|dy|/band`, `+h/20`: a 238 m tower 9 km west at dy 0.2 beats a 100 m tower 1.5 km away at dy 0.8. Then `CAPS.highrise = 4` | `useLandmarks.ts`, `rank.ts` |
| Large cluster cost today | up to 32 blocks x ~15-25 SVG nodes (faces, panes, tanks, shadow, strip clip) = roughly 500-800 nodes | `settlement.ts`, `blocks.tsx` |
| Geofabrik extract on disk | none (CI downloads it in `.github/workflows/landmarks.yml`) | repo |

**The scene is an orthographic west-east section looking north, not a perspective view** (`scene-2-5d-plan.md` §1: far and near are the
same line at two zooms). Consequences that shape everything below:
- x is kilometres east. Nothing shrinks with east-west distance; a tower 8 km west is simply 125 px left of the dot.
- Depth is north-south (`dy`). South of the line is in front, north is behind.
- One px is 64 m, so **per-building drawing is impossible for ordinary buildings**; only towers are individually drawable. The honest unit of
  city fabric is the **column** (a slice of x), described by how built-up it is and how tall.

OSM coverage in Israel, first reading (§8 has the table):
- **Footprints: good in Jewish cities and in Nazareth (460-760 buildings/km2), nearly absent in some West Bank Arab towns** (Karmei Tzur +
  Beit Ummar box: 182 buildings in 17 km2 for a town of ~17 000). `landuse=residential` polygons exist almost everywhere.
- **Heights: poor everywhere.** `building:levels` on 11-12 % of buildings in Gush Dan, 3 % in Jerusalem and Modi'in, 0 % in Nazareth and
  Beit Ummar. `height` on ~1 %. Towers are the exception: they are tagged (579 merged rows nationally).
- So: extent and density can be real in most cities; **ordinary building height is mostly inferred**; only towers carry real heights.
  The plan is built for exactly that. Not measured (Overpass was overloaded): Tel Aviv core, Haifa, Umm al-Fahm, Be'er Sheva, moshavim.

## 1. Realism strategy

| Option | What it is | Verdict |
|---|---|---|
| (a) Per-building projection | Each OSM footprint projected to x, depth-sorted, one silhouette each | **No.** 0.5 px per building; Petah Tikva's 24 x 8 km strip holds 66 000 footprints, 89 % without levels; result after merging is (c) anyway, at 50x the data |
| (b) Density band | Built-up share along x from landuse + building counts, procedural blocks sized by it | Fixes "empty hill between towers" and the fixed width. Alone it has no real skyline: no real tower where a tower is, no height differences between Bnei Brak and Savyon |
| (c) **Hybrid (recommended)** | (b) as the base, from a rasterised **built-form grid** (footprint share + typical levels + upper height per ~120 x 230 m cell), **plus every real tower >= 40 m at its true x and height**, plus curated hand glyphs on top | Real extent, real density, real height gradient where tagged, real towers. Degrades cleanly: no heights -> typical levels by building type; no footprints -> landuse; nothing -> today's cluster |

Decision: **(c)**. What is true and what is licence, to state in `LANDMARKS.md`:
- True: where the city is along x, where it stops, how dense each stretch is, which stretch is taller, every tower's x, order and height rank.
- Licence: individual low blocks are drawn (seeded) to stand for the column's fabric; heights use one square-root scale (§2).

## 2. Geometry

**Band (north-south depth).** Fabric: `|dy| <= 3 km` (same as curated today; Petah Tikva's band then holds Bnei Brak, north Ramat Gan, the
Diamond Exchange, Azrieli). Towers: `|dy| <= 3 km`, and `<= 5 km` when `h >= 100 m`. Three depth rows:

| Row | dy (km) | Base y | Tone | Detail |
|---|---|---|---|---|
| back | +0.75 .. +3 | `ground(x) - 1` (behind the crest, sunk 2 px) | `--mark-back` | silhouette, no panes; sparse lights at night |
| line | -0.75 .. +0.75 | `ground(x) + 1` (R2 seat) | wall tones | hero blocks near the dot, merged mass elsewhere |
| front | -3 .. -0.75 | `ground(x) + min(5, VISIBLE_BOTTOM - SHEET_CLEAR - ground(x))` | wall tones, lightest | as line; dropped where the offset is < 2 px (flat coast near the sheet edge) |

**Occlusion.** Orthographic, so painter's order back -> line -> front is exact. Per column a rear row is emitted only where its top is
>= 1.5 px above the top of the rows in front; otherwise it is hidden and costs nothing. Towers sort into the same order by their own `dy`
and overlap up to 30 % (existing rule), rear one in `--mark-back`.

**Height scale: one law for everything in a city.** `skyHeight(m) = clamp(2.2 * sqrt(m), 4, 34)` px.

| Real | 2 st / 6 m | 4 st / 13 m | 8 st / 26 m | 40 m | 60 m | 100 m | 150 m | 200 m | 238 m |
|---|---|---|---|---|---|---|---|---|---|
| px | 5.4 | 7.9 | 11.2 | 13.9 | 17.0 | 22.0 | 26.9 | 31.1 | 33.9 |

It meets `markHeight` at the top (238 m -> 34), so curated glyphs keep their size. A 200 m tower reads 3.9x a 4-storey block (today 2.5x;
reality 15x). Constant 2.2 is judged on the Petah Tikva still; allowed range 2.0-2.6. Far layer: x 0.6, min 3.
Villages and non-city marks keep `markHeight` and `STOREY` unchanged.

**Distance.** No scaling by `|dx|` (the ridge is not scaled either; scaling buildings only would detach them from the land). Distance from
the dot changes **level of detail**, not size: hero zone `|dx| <= 1.5 km` (+-23 px) gets drawn blocks with faces, panes and roof clutter;
beyond it the fabric is a merged mass. Depth (`dy`) alone drives tone (table above). Haze: all near rows keep `1 - var(--near-fade)`.

**Seat.** Hero blocks: `seat()` as today. Mass: the base edge follows `ground(x)` sample by sample; block tops are horizontal steps, so
the skyline is stepped and the foot never floats. Columns whose ground elevation is `<= 1 m` (water) are skipped, as marks are today.

**Far layer (|dx| 12-30 km, 160 m/px).** Drawn only where `farY <= nearY - 4` (existing rule). Fabric = one stepped silhouette strip
1.5-4 px high in `--ridge-far` (built share >= 0.25 over a 2 px bin), towers `>= 60 m` as 2.5 px slabs x 0.6. Night: 1 px warm dots,
alpha .6, count proportional to built share: the far city glows. `farFade >= 0.85` hides it (existing `hideFar`).

## 3. Data pipeline

**Offline (extends the monthly workflow).** Per place is impossible (any geocoder point is a place), so per grid cell:
- New osmium pass: `a/building`, `a/landuse=residential,commercial,industrial,retail` -> geojsonseq. The file is large (`?` ~1 GB), so the
  builder **streams by line** (today's `build.ts` reads everything into one string; do not copy that).
- `public/data/city/il/<lat*10>_<lon*10>.json`, same keys as landmark cells, all-empty cells not written:
  ```json
  { "v": 1, "r": [[row, colStart, "<base64, 2 bytes per grid cell>"], ...], "t": [[lat, lon, heightM, wClass, "name"?], ...] }
  ```
  - Grid per cell: **80 columns x 48 rows** (lon step 0.00125 deg ~ 118 m, lat step ~232 m). Byte 0: built share 0-15 (high nibble),
    typical levels 0-15 (low nibble). Byte 1: upper height in m (p90 of the cell, cap 80). `r` holds only non-empty runs.
  - Built share = footprint area / cell area; where a landuse polygon covers the cell and no footprints exist, 0.35 x polygon cover.
  - Height per building: `height` -> `building:levels` x 3.2 -> by `building=` type (house/detached/residential 2, apartments 4,
    industrial/warehouse/retail 8 m) -> median of tagged buildings within 500 m -> 3 levels. Heights > 260 m are kept only when the building is named (real supertalls in Tel Aviv); unnamed ones are rejected as tag errors.
  - `t`: every building `>= 40 m` or `>= 12` levels, **not merged**, `wClass` 0/1/2 from the footprint's east-west width (< 25 m, 25-50, > 50).
    Keep the tallest 250 per cell.
- `public/data/city/il/far.json`: one national file, 500 m x 1 km grid, 1 byte (built share nibble + height class nibble), plus towers `>= 80 m`.
- Budgets (to confirm in C2, fail the build if exceeded): cell <= 16 KB raw (~6 KB brotli); `far.json` <= 60 KB raw; whole set <= 1.5 MB raw.
  A place loads 4-8 near cells + `far.json` once: typical 5-15 KB, worst (central Tel Aviv) <= 50 KB on the wire.
- Build prints a coverage report per region box (share of built cells whose height came from tags vs type vs default): the standing measure.

**Client.**
- `src/data/city/cityData.ts` (mirrors `israelData.ts`): index, `cellsForBand(place, 12, 3)`, decode. SW runtime-caches `/data/city`.
- `columns.ts`: for the place, 188 near columns of 2 px (128 m) x 3 depth rows: `built` (mean), `levels` (built-weighted mean), `upper` (max).
  Result (~3 KB) cached in `localStorage` `shamayim:city:v1:{placeId}`, 30 days, like landmarks.
- Seeds are **geographic** (hash of the grid column and row), so the same stretch of Bnei Brak looks the same from Petah Tikva and from Ramat Gan.

**Outside the cache / abroad.** One light Overpass call for the near band: `way[landuse~"residential|commercial|industrial|retail"]; out bb;`
(bounding boxes only, a few KB) + the existing high-rise filter. Boxes are rasterised at 0.6 fill into the same column structure with
levels by `settlementType` (city 4, town 3, else 2). If it fails or is empty: today's `composeSettlement` cluster. Never fetch footprints live.

**Overpass path.** Landmarks: unchanged (still the source outside Israel). Inside Israel coverage Overpass is already never called.
High-rise rows stay in the landmark cells for villages and far marks; city mode reads towers from `t` instead (unmerged, with width).

## 4. Rendering

**City mode** is on when the place is `large` or `settlementStyle = 'blocks'` **and** columns exist with `built >= 0.12` over >= 24 px around
the dot. Otherwise today's path, untouched. (Phase 4 adds neighbour mass for villages.)

**Synthesis (pure, `fabric.ts`).** Walk each row's columns west to east; a run is consecutive columns with `built >= 0.12`.
- Block width 4-9 px (seeded). Height `skyHeight(levels * 3.2)` +-1 storey (seeded); every ~5th block takes `skyHeight(upper)` so mid-rise
  shows where the data has it. Gaps: none to 1 px at `built >= 0.5`; 2-4 px at 0.3-0.5; 4-9 px at 0.12-0.3.
- Hero zone: blocks become `House` records and are drawn by today's `BlockHouse` (panes, tanks, faces), window rows at pitch >= 1.9 px
  (group storeys when tighter). Max 14 hero blocks at 375 px.
- Elsewhere: blocks are merged into **mass paths**.

**SVG budget at 375 px (mid phone): <= 320 nodes near, <= 12 far** (today's large cluster alone is 500+).

| Part | Nodes |
|---|---|
| Mass, per depth row: 1 body path, 1 sun-side faces path, 1 roof-edge path, 1 day-panes path (line/front only), 1 night-lights path | <= 14 total |
| Hero blocks: 14 x ~14 | ~200 |
| Towers: <= 10 x ~8 (body, lit strip, plant box, window grid as one path, aviation) | ~80 |
| Contours, contact line | <= 6 |
| Far: 1 silhouette, 1 lights path, <= 3 towers | <= 12 |

Paths are memoised on (place, width, sun side, night); scrubbing the hour changes classes only. No filters, no gradients.

**Style consistency.** Same tokens (`--mark-wall`, `--mark-lit`, `--mark-back`, `.recede`, `.night`), same sun source (`sunX`, `shaded`).
Mass has no cast shadows, only the lit side face (1.2-2.2 px strip per block on the sun side, built into the faces path) and a 0.6 px
roof edge in `--mark-lit`. Block tints (`washed`, `stone`) apply per hero block; the mass uses the plain wall tone, so the home town is the
most coloured part of the frame.

**Night.** Lit share = `life.litShare`. Hero blocks as today. Mass: one path of 0.9 x 1.1 warm panes, count = built x litShare x 0.5 per px
of width (front/line), x 0.25 (back). Towers: 2-column grid + aviation when `h >= 60 m`. Lights keep `1 - 0.7 * fade` (existing).

**Curated cities (Tel Aviv, Jerusalem, Haifa).** Hand glyphs stay and remain the top level of detail. The data fabric replaces the generic
cluster under and around them. A data tower within 250 m of a curated mark is suppressed; other data towers are drawn in `--mark-back`
when within 12 px of a curated glyph so the hand-drawn one leads. Jerusalem's stone tint applies to its hero blocks.

**Villages** (`tile`, `flat-hill`, `flat-desert`, and `blocks` towns without fabric data): `composeSettlement` and `SettlementGlyph` unchanged.

## 5. What replaces the cluster, keep-clear, caps

- `composeSettlement` stays for villages. City mode calls `composeCity(columns, towers, ground, ...) -> { hero: House[], mass: MassRow[],
  towers: PlacedMark[], labelTop, halfWidth }`. `Settlement` gains nothing; `hillScene.ts` picks one or the other.
- Removed for cities: fixed `HALF`, `ROWS`, `REACH`. Extent is the data's. Vertical guards remain: top >= 4 px, top >= 22 px for x < 110 or
  x > 265 (corner captions), base <= `VISIBLE_BOTTOM - SHEET_CLEAR`.
- **Dot:** no block of the line or front row within `DOT_R + 1.5` px of the dot (a gap of ~12 px on the line row); back row may pass behind it.
- **Label:** `placeLabel` gets the hero boxes plus one box per 16 px of mass per row as obstacles; front-row columns under the label box
  (46 x 13) are removed first, as `underLabel` does today. Sea label and sun caption use the existing `keepOut` boxes as column masks.
- **Towers leave the `select` contest in city mode** (like absorbed marks). `selectTowers`:
  1. prominence = `h * (1 - 0.15 * |dy| / 3)`, `+10` if named;
  2. the 2 most prominent within 3 km of the place are always kept (Kiryat Arye for Petah Tikva);
  3. then the most prominent per 12 px slot of x;
  4. cap **10** at 375 px, +2 per extra 150 px, max 16; min centre spacing 5 px; far cap 3.
  Other kinds keep `near <= 5` and their caps. `CAPS.highrise = 4` remains for villages only.
- The "houses give way to an absorbed mark" rule applies to worship halls, water towers and silos only, never to `highrise`.

## 6. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Heights mostly untagged: a flat monotone carpet | Type priors + 500 m median + seeded +-1 storey; `upper` peaks; towers carry the skyline. C0 measures it before any drawing work |
| Clutter at 375 px; dot and label drowned | Squint test (blur 2 px) per still; hero cap 14; mass has no panes in the back row; constant 2.2 may drop to 2.0 |
| Flat coastal ground near the sheet edge: rows do not fit | Front row dropped below 2 px offset; line row only |
| Data size, request count, stale service worker | Budgets fail the build; runtime cache only; columns cached per place; cache key versioned |
| Wide strip of invented-looking blocks breaks the "honest rule" | Licence stated in `LANDMARKS.md`; every column traces to a grid value; no block where `built < 0.12` |
| Geojsonseq of all buildings exhausts CI memory | Streaming reader; rasterise per feature; no in-memory feature list |
| Curated glyphs fight data towers | 250 m dedupe + back tone near curated glyphs |
| Scrub performance | Geometry memoised; hour changes toggle classes |

## 7. Rollout (each phase ships something visibly better)

| Phase | Ships | Data |
|---|---|---|
| **1 (small)** | Petah Tikva shows its own towers; Ramat Gan keeps houses around towers; rows no longer vanish on slopes | existing cells only |
| 2 | Continuous city: fabric extent, density and height from the grid; fixed width gone (mass drawn with today's block look) | new city cells |
| 3 | Real skyline: unmerged towers with width classes, `skyHeight`, mass paths + night lights, node budget met | `t` lists |
| 4 | Far-layer city glow; curated cities on data fabric; neighbour mass beside villages; abroad via landuse boxes | `far.json`, Overpass `out bb` |

Phase 1 scope, exactly:
1. `settlement.ts`: the absorbed give-way test skips marks of kind `highrise` (pass `kind` in `absorbed`).
2. `settlement.ts`: `REACH.blocks` -> `{ up: 40, down: 24 }` (top/floor guards already bound it).
3. `useLandmarks.ranked()`: keep up to 8 non-high-rise + up to 12 high-rise candidates; high-rise band 3 km; drop unnamed `heightM > 260`.
   Cache key `v2 -> v3`.
4. `rank.ts`: for `large` places `CAPS.highrise` 4 -> 6, of which the 2 best within 3 km of the place are reserved.
Stop there. No new data, no new drawing.

## 8. Coverage measurement (task C0)

Cheap, repeatable, from the extract (not Overpass): `osmium tags-filter israel-and-palestine.osm.pbf a/building -o b.pbf`, then
`osmium export b.pbf -f geojsonseq`, stream it through `scripts/city/measure.ts`, which prints per region box: buildings, buildings/km2,
% with `building:levels`, % with `height`, % with a usable `building=` type, landuse polygon count.

First reading, taken today with Overpass `out count` on small boxes (indicative only; rerun on the extract):

| Box | Buildings | per km2 | with `building:levels` | with `height` | levels >= 5 | landuse polygons |
|---|---|---|---|---|---|---|
| Petah Tikva band 24 x 3 km | 33 528 | 464 | 12 % | 1 % | 1 485 | 51 |
| Petah Tikva band 24 x 8 km | 66 018 | 343 | 11 % | 1 % | 2 668 | 129 |
| Ramat Gan / Bnei Brak (17 km2) | 12 719 | 755 | 12 % | 1 % | 531 | 22 |
| Jerusalem centre (37 km2) | 19 147 | 519 | 3 % | 1 % | 247 | 73 |
| Nazareth (13 km2) | 7 010 | 555 | 0.3 % | 0 % | 13 | 9 |
| Modi'in (21 km2) | 4 660 | 221 | 3 % | 0.3 % | 62 | 179 |
| Karmei Tzur + Beit Ummar (17 km2) | 182 | 11 | 0 % | 0 % | 0 | 9 |
| Tel Aviv core, Haifa, Umm al-Fahm, Be'er Sheva, Shadmot Mehola | not measured (server timeouts) | | | | | |

What it means per option: (a) would draw 66 000 boxes of guessed height; (b) works everywhere landuse exists; (c) gets real extent and
density in cities, real towers, and falls back to landuse in towns like Beit Ummar.

Already decided by this reading: tagged heights are too sparse to drive the carpet alone. So the height chain's 500 m median is used
only where >= 5 tagged buildings fall inside it (Gush Dan: ~55 tagged/km2, fine; Jerusalem ~15/km2, marginal; Nazareth: never), and
type priors carry the rest. C0 on the extract confirms the numbers, fills the unmeasured rows, and adds the share of buildings with a
usable `building=` type (the prior's real strength, unknown today). Optional C0b `?`: check whether an open height dataset (Overture
buildings, Google Open Buildings 2.5D) covers Israel with a licence compatible with ODbL attribution; unverified, not assumed.

## 9. Tasks (TASKS.md style)

Lanes: **Codex** = plumbing and pure logic with tests. **Claude** = anything that draws SVG or decides how it looks. QA stills:
`SHOT_PLACE='<Place JSON>' node scripts/shot.mjs http://localhost:5173 qa/city/<name>.png` at day (~10:00) and night (21:00).
Reference places: Petah Tikva, Ramat Gan, Bnei Brak, Tel Aviv, Jerusalem, Haifa, Umm al-Fahm, Be'er Sheva, Karmei Tzur (village control).

### Phase 1: towers and houses together (no new data)
- [ ] P1.1 Before stills of the nine reference places, day + night -> `qa/city/before-*.png` (Claude; no code)
- [ ] P1.2 Give-way rule skips `highrise` (Codex). Files: `settlement.ts`, `hillScene.ts` (pass kind), `settlement.test.ts`.
      Test: a 30 px tower absorbed at x 200 removes no house; a minaret still does
- [ ] P1.3 `REACH.blocks` 40/24 (Codex). Files: `settlement.ts`, `settlement.test.ts`. Test: on a 25 deg synthetic slope a large `blocks`
      cluster keeps >= 3 rows and every base is inside `[4, floor]`
- [ ] P1.4 Home-first towers (Codex). Files: `useLandmarks.ts` (split `ranked` into `src/data/landmarks/shortlist.ts`), `rank.ts`,
      `landmarks.test.ts`. Test: Petah Tikva fixture (the 21 rows of §0 + Tel Aviv rows) -> the 152 m and 100 m Kiryat Arye rows are placed;
      an unnamed 400 m row is dropped, a named 350 m row is kept; a village fixture still gets <= 4
- [ ] P1.5 After stills + owner look (Claude). `qa/city/p1-petah-tikva-{day,night}.png`, `p1-ramat-gan-*.png`, Karmei Tzur unchanged

### Phase 2: the fabric (continuous city)
- [ ] C0 Coverage measurement (Codex). Files: `scripts/city/measure.ts`, workflow step (manual trigger). Output: the §8 table from the
      extract, pasted here. Gate: numbers confirmed (or the height chain adjusted) before C2 ships data
- [ ] C1 Grid maths (Codex). Files: `src/data/city/types.ts`, `grid.ts` (cell key, col/row <-> lat/lon, encode/decode runs), `grid.test.ts`.
      Test: round trip; a point maps to the same cell key as `israelData.cellsForBox`
- [ ] C2 Offline builder (Codex). Files: `scripts/city/build.ts` (stream + write), `raster.ts` (footprint -> cells), `heights.ts`
      (height chain), `.github/workflows/landmarks.yml`. Tests: `heights.test.ts` (chain order, unnamed > 260 m reject), `raster.test.ts` (a 100 x 100 m
      square fills the right share). Gate: budgets of §3 printed and enforced
- [ ] C3 Client loader + columns (Codex). Files: `src/data/city/cityData.ts`, `columns.ts`, `useCity.ts`, tests. Test: synthetic grid with
      a built stripe 2-5 km west -> columns 31..78 px west of centre are built, others empty; three depth rows split at +-0.75 km
- [ ] C4 `composeCity` layout (Codex for rules, Claude reviews numbers). Files: `src/data/city/fabric.ts`, `cityZones.ts` (dot, label,
      captions, sheet), `fabric.test.ts`. Tests: no block where `built < 0.12`; dot gap; label box clear; geographic seed stable across two places
- [ ] C5 Draw the fabric with today's block look (Claude). Files: `src/ui/scene/marks/city/CityFabric.tsx`, `hillScene.ts`, `HillMarks.tsx`.
      Stills: `p2-petah-tikva`, `p2-ramat-gan`, `p2-bnei-brak`, `p2-beer-sheva`; Karmei Tzur and Umm al-Fahm pixel-equal to before
- [ ] C6 Service worker runtime cache for `/data/city`, attribution unchanged (Codex). Files: `vite.config.ts`. Test: second load offline

### Phase 3: the skyline
- [ ] S1 `skyHeight` + tower list (Codex). Files: `src/data/city/cityHeight.ts`, `towers.ts` (`selectTowers`), tests: table of §2;
      Petah Tikva fixture keeps Kiryat Arye; <= 10 at 375, <= 16 at 900; spacing >= 5 px
- [ ] S2 Mass paths (Claude). Files: `src/ui/scene/marks/city/massPath.ts` (pure path strings), `CityMass.tsx`, `marks.module.css`.
      Test: `massPath.test.ts` node count <= 5 per row; base follows ground at both ends. Stills: day with sun west / east / noon
- [ ] S3 Towers in city mode (Claude). Files: `city/CityTowers.tsx`, reuse `generic/industry.tsx` Highrise with `wClass` widths 3.5 / 5 / 7.
      Stills: `p3-petah-tikva`, `p3-ramat-gan` (Diamond Exchange cluster reads as a cluster)
- [ ] S4 Night (Claude). Files: `city/CityLights.tsx`. Stills at 21:00 and 03:00; fog still (`?wx=`) keeps lights over walls
- [ ] S5 Node budget + scrub check (Codex). Test: DOM count <= 320 near for the Petah Tikva fixture; no path rebuild on hour change
- [ ] S6 Owner look test on the phone: Petah Tikva, Ramat Gan, Be'er Sheva, day and night. If the carpet reads flat, tune 2.2 and jitter, not the data

### Phase 4: far city, curated, neighbours, abroad
- [ ] F1 `far.json` in the builder + loader (Codex). Files: `scripts/city/far.ts`, `src/data/city/farData.ts`, tests
- [ ] F2 Far silhouette + glow (Claude). Files: `city/FarCity.tsx`, `FarLand` hook-up. Stills: Modi'in and Rosh HaAyin looking at Gush Dan, night
- [ ] F3 Curated cities on data fabric (Claude). Files: `hillScene.ts`, `city/CityTowers.tsx` (250 m dedupe, back tone). Stills: Tel Aviv,
      Jerusalem, Haifa day + night; nothing curated lost
- [ ] F4 Neighbour mass beside villages (Claude draws, Codex gates). Mass LOD only, outside the village's `halfWidth + 6`. Still: Karmei Tzur
      with Beit Ummar's mass to the west
- [ ] F5 Abroad: landuse boxes via Overpass `out bb` (Codex). Files: `overpass.ts` (second query builder), `src/data/city/boxColumns.ts`,
      tests. Still: one foreign city (owner picks)
- [ ] F6 Docs: update `LANDMARKS.md` §1-2 and `ILLUSTRATION.md` §4 with city mode and the stated licence (Claude)
