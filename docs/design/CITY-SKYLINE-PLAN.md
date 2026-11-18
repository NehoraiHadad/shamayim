# City skyline plan: cities that look like the real place

Status: plan only, 2026-11-18. Extends `LANDMARKS.md` (data, projection) and `ILLUSTRATION.md` (seat, tones, light, night).
Owner goal: "as real as possible; if we can reproduce the real skyline, even better". Villages keep today's look
(phases 1-3); **§10 (phase 4V) puts villages, moshavim, kibbutzim and small towns on the same data.**

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
The elevation profile is a due west–east transect at the observer's latitude (dy = 0). Fabric uses the 1 km grid row
containing that line and towers use the same row. At 375 px, the far projection is `x = 187.5 + 6.25 * dx` with dx in km.

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
  The regular geographic grid uses 31.5° N as its 500 m longitude reference. Source tiles contribute by area overlap,
  with uncovered area counted as empty. Share is rounded to the nearest fifteenth. Class 0 is empty and classes 1–15
  follow the nearest whole footprint-weighted storey count, capped at 15. Built area without levels uses three storeys.
  The version 1 payload stores base64 runs (24-bit big-endian flat start, 8-bit length, nonzero tile bytes) and
  tower triples `[lat, lon, heightM]`.
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

**Villages** (`tile`, `flat-hill`, `flat-desert`, and `blocks` towns without fabric data): `composeSettlement` and `SettlementGlyph` unchanged
through phase 3. Phase 4V (§10) feeds the same composer from the grid where the data is good enough; the template stays as the fallback.

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
| 4V (§10, first) | Villages from data: true heights, home extent and shape from the footprint, style per cluster, neighbours at their true x | city cells `v2` (form byte, place nodes) |
| 4 | Far-layer city glow; curated cities on data fabric; abroad via landuse boxes | `far.json`, Overpass `out bb` |

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

**C0 on the extract (2026-11-18, `city.geojsonseq` from the Geofabrik extract, 1 029 425 features):**

| Box | km2 | buildings | per km2 | levels % | height % | typed % | landuse |
|---|---|---|---|---|---|---|---|
| Gush Dan | 656 | 139 123 | 212 | 8.2 | 1.3 | 13.5 | 322 |
| Tel Aviv core | 21 | 14 182 | 675 | 19.1 | 1.9 | 20.9 | 17 |
| Petah Tikva | 29 | 14 040 | 478 | 11.7 | 0.5 | 26.9 | 18 |
| Jerusalem | 84 | 31 099 | 369 | 1.9 | 0.5 | 5.2 | 82 |
| Haifa | 94 | 17 690 | 189 | 4.8 | 0.5 | 7.4 | 322 |
| Nazareth | 21 | 8 912 | 427 | 0.4 | 0.1 | 1.9 | 8 |
| Umm al-Fahm | 17 | 301 | 18 | 0.3 | 0.3 | 0.3 | 2 |
| Be'er Sheva | 44 | 13 933 | 313 | 6.0 | 0.8 | 5.3 | 32 |
| Modiin | 25 | 5 800 | 230 | 4.4 | 0.3 | 17.5 | 173 |
| Shadmot Mehola | 9 | 321 | 34 | 0.0 | 0.0 | 1.6 | 5 |
| Beit Ummar | 9 | 56 | 6 | 0.0 | 0.0 | 0.0 | 2 |

What changed because of it: (1) `building=yes`/`residential` carries no storey information (most of the 87–98 % untyped),
so the chain is tag → explicit type (house 2, apartments 4 levels, employment 8 m) → median of >= 5 tagged within 500 m →
footprint area in residential land (< 150 m2 2 levels, < 450 4, < 1 200 6, more 8; elsewhere 2–3) → 3 levels. The first
build put the generic "residential = 3 levels" prior before the median and flattened 88 % of Gush Dan to 3 storeys.
(2) Footprints are near-absent in Umm al-Fahm and Beit Ummar, so landuse-only squares are stored with levels 0 (unknown)
and city mode needs mapped footprints at the dot (`measured >= built / 2`); such towns keep today's cluster.

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
- [x] C0 Coverage measurement (Codex). Files: `scripts/city/measure.ts`, workflow step (manual trigger). Output: the §8 table from the
      extract, pasted here. Gate: numbers confirmed (or the height chain adjusted) before C2 ships data
- [x] C1 Grid maths (Codex). Files: `src/data/city/types.ts`, `grid.ts` (cell key, col/row <-> lat/lon, encode/decode runs), `grid.test.ts`.
      Test: round trip; a point maps to the same cell key as `israelData.cellsForBox`
- [x] C2 Offline builder (Codex). Files: `scripts/city/build.ts` (stream + write), `raster.ts` (footprint -> cells), `heights.ts`
      (height chain), `.github/workflows/landmarks.yml`. Tests: `heights.test.ts` (chain order, unnamed > 260 m reject), `raster.test.ts` (a 100 x 100 m
      square fills the right share). Gate: budgets of §3 printed and enforced
- [x] C3 Client loader + columns (Codex). Files: `src/data/city/cityData.ts`, `columns.ts`, `useCity.ts`, tests. Test: synthetic grid with
      a built stripe 2-5 km west -> columns 31..78 px west of centre are built, others empty; three depth rows split at +-0.75 km
- [x] C4 `composeCity` layout (Codex for rules, Claude reviews numbers). Files: `src/data/city/fabric.ts`, `cityZones.ts` (dot, label,
      captions, sheet), `fabric.test.ts`. Tests: no block where `built < 0.12`; dot gap; label box clear; geographic seed stable across two places
- [x] C5 Draw the fabric with today's block look (Claude). Files: `src/ui/scene/marks/city/CityFabric.tsx`, `hillScene.ts`, `HillMarks.tsx`.
      Stills: `p2-petah-tikva`, `p2-ramat-gan`, `p2-bnei-brak`, `p2-beer-sheva`; Karmei Tzur and Umm al-Fahm pixel-equal to before
- [x] C6 Service worker runtime cache for `/data/city`, attribution unchanged (Codex). Files: `vite.config.ts`. Test: second load offline

### Phase 3: the skyline
- [x] S1 `skyHeight` + tower list (Codex). Files: `src/data/city/cityHeight.ts`, `towers.ts` (`selectTowers`), tests: table of §2;
      Petah Tikva fixture keeps Kiryat Arye; <= 10 at 375, <= 16 at 900; spacing >= 5 px
- [x] S2 Mass paths (Claude). Files: `src/ui/scene/marks/city/massPath.ts` (pure path strings), `CityMass.tsx`, `marks.module.css`.
      Test: `massPath.test.ts` node count <= 5 per row; base follows ground at both ends. Stills: day with sun west / east / noon
- [x] S3 Towers in city mode (Claude). Files: `city/CityTowers.tsx`, reuse `generic/industry.tsx` Highrise with `wClass` widths 3.5 / 5 / 7.
      Stills: `p3-petah-tikva`, `p3-ramat-gan` (Diamond Exchange cluster reads as a cluster)
- [x] S4 Night (Claude). Files: `city/CityLights.tsx`. Stills at 21:00 and 03:00; fog still (`?wx=`) keeps lights over walls
- [ ] S5 Node budget + scrub check (Codex). Test: DOM count <= 320 near for the Petah Tikva fixture; no path rebuild on hour change
- [ ] S6 Owner look test on the phone: Petah Tikva, Ramat Gan, Be'er Sheva, day and night. If the carpet reads flat, tune 2.2 and jitter, not the data

### Phase 4: villages from data (4V, §10), then curated, far city, abroad
Order: V0-V8 first (the owner's question), then F3, F1, F2, F5, F6. Every V step after V0 ends with stills in `qa/city/p4v-*.png`.
Reference places (Place JSON for `SHOT_PLACE`): Nahalal 32.69, 35.1967 · Kfar Vitkin 32.3817, 34.8767 · Kibbutz Yagur 32.7417, 35.0764
(second kibbutz: Mizra 32.6508, 35.2864) · Ein Mahil 32.7233, 35.3530 (Arab village, Lower Galilee, footprints mapped) · Kafr Qara
32.505, 35.05 (Wadi Ara, zoning only) · Daliyat al-Karmel 32.6933, 35.0467 (Druze) · Karmei Tzur 31.6047, 35.1081 (fallback) ·
Petah Tikva 32.087, 34.887 (city control).

- [ ] V0 Measure before building (Codex). Files: `scripts/city/measure.ts`, `survey.ts` (extra counters only), workflow manual step that
      also exports `places.geojsonseq`. Output, pasted into §10.9: per reference box the footprint-area histogram (7 classes of §10.3),
      share of buildings with `roof:shape` / `roof:material` / `roof:colour`, place nodes by kind and how many carry `population`,
      worship places by `religion`, and the 3x3 cover of each box. Gate: the thresholds marked `?` in §10 are confirmed or changed here
- [ ] V1 Builder `v2`: village heights, form byte, place nodes (Codex). Files: `scripts/city/heights.ts` (`footprintHeight`),
      `places.ts` (new: read nodes, `reach`, `faith`, `PlaceIndex.nearest`), `raster.ts` (3 bytes per square), `survey.ts` (cover pass),
      `build.ts` (`v: 2`, `p`, changed-square report), `src/data/city/form.ts` (new: `encodeForm` / `decodeForm`, shared),
      `grid.ts` (`stride`), `types.ts`, `.github/workflows/landmarks.yml`. Tests: `heights.test.ts` (table of §10.5 row by row; an
      `urban` building returns exactly what `footprintLevels` returns today), `form.test.ts` (round trip), `raster.test.ts` (two 130 m2
      houses and a 900 m2 shed in one square -> size class 3, big share class 3), `build.test.ts` (budget, `p` rows).
      Gate: every square whose buildings are all `urban` keeps bytes 0-1 identical to `v1` (script prints the count per region box);
      largest cell <= 24 KB, set <= 1.0 MB. Stills: `p4v-petah-tikva-{day,night}` equal to `p3` except in rural stretches of the
      band, which drop by 1-2 px; `p4v-afula-day` (Jezreel moshavim in a city band now 1-2 storeys)
- [ ] V2 Client: decode `v2`, clusters (Codex). Files: `src/data/city/grid.ts`, `cityData.ts` (accept `v` 1 and 2, pass `p`),
      `clusters.ts` (new: `findClusters`, `splitByPlace`), `homeCluster.ts` (new: `homeCluster`, `homeTier`), `useCity.ts` (cache key
      `v3 -> v4`, validate `clusters`), `types.ts`. Tests with fixtures cut from real cells (`326_351` Nahalal, `316_351` Karmei Tzur,
      `327_350` Yagur, `326_350` Daliyat + Isfiya, plus adjoining cells as needed): Nahalal home = 104 squares,
      1.99 x 2.55 km at the 2nd–98th percentile, tier A; Karmei Tzur tier C (1 square);
      Daliyat and Isfiya come out as two clusters once `p` is present; no cluster under 4 squares; geographic ids stable from two places
- [ ] V3 Home village from the footprint (Codex for rules, Claude judges the numbers on stills). Files:
      `src/data/landmarks/settlementPlan.ts` (new: today's `ROWS` / `HALF` / `offsets` moved out of `settlement.ts`, which is over 150
      lines, as `templateRows`), `src/data/landmarks/villageExtent.ts` (new: `villageWidth`, `villageRows`),
      `src/data/city/villageStyle.ts` (new: `clusterStyle`), `settlement.ts` (`composeSettlement` takes `plan`),
      `src/ui/scene/marks/homeMode.ts` (new: picks city / village / template, so `hillScene.ts` stays small), `hillScene.ts`,
      `placeMarks.ts` (`homeHalf` parameter instead of `settlementHalfWidth(size)`). Tests: `settlementPlan.test.ts` (six recorded
      template fixtures deep-equal before and after the move), `villageExtent.test.ts` (width table of §10.1; dot gap; a dot at the
      east edge gives a west-only village; no house where the footprint is empty), `villageStyle.test.ts` (table of §10.4),
      `hillScene.test.ts` (tier C calls the template with the same input as today). Stills day + night: `p4v-nahalal`,
      `p4v-kfar-vitkin`, `p4v-yagur`, `p4v-ein-mahil`, `p4v-daliyat`; `p4v-karmei-tzur` and `p4v-petah-tikva` **pixel-equal** to the
      V1 stills (whole frame)
- [ ] V4 House forms from the data (Claude). Files: `src/ui/scene/marks/houses.tsx` (`Shed`; `TileHouse` gets `storeys`),
      `SettlementGlyph.tsx` (`Body` picks by `house.kind`), `settlement.ts` (`House.kind?: 'shed'`, `dims` from the plan),
      `marks.module.css` (one roof tone for sheet-metal roofs). Test: `glyphs.test.ts` node count (shed <= 5, tile house <= 7).
      Stills: Nahalal (sheds on the outer ring), Yagur (farm yard on its real side), Mizra; squint test at blur 2 px
- [ ] V5 Neighbours at their true x (replaces F4; Claude draws, Codex gates). Files: `src/data/city/neighbours.ts` (new:
      `composeNeighbours`), `city/massPath.ts` (`roof: 'flat' | 'pitched'`), `city/CityMass.tsx`, `homeMode.ts`, `HillMarks.tsx`.
      Tests: `neighbours.test.ts` (true x within 1 px of `187.5 + 15.625 dx`; nothing inside the home zone; caps; row by centroid
      `dy`; an urban component goes through `rowHouses`), `massPath.test.ts` (<= 5 nodes per row and roof kind). Stills: Nahalal with
      Kfar Yehoshua west and Migdal HaEmek's mass east; Kfar Vitkin; Yagur with Nesher's mass; Karmei Tzur **pixel-equal inside
      x = dot +- 33 px** and Beit Ummar's zoned mass outside it; Petah Tikva pixel-equal
- [ ] V6 Marks, label, captions, budget (Codex). Files: `placeMarks.ts` (marks inside a neighbour cluster share its foot),
      `neighbours.ts` (give-way), `cityZones.ts` (reused as is), `hillScene.ts` (label obstacles). Tests: a minaret at a neighbour's
      x removes the mass block behind it and stands on the same base; label box overlaps no neighbour box; DOM count <= 320 near for
      the Nahalal and Kfar Vitkin fixtures at 375 px; no path rebuild on hour change
- [ ] V7 Zoned extent, tier B (Claude; **needs the owner's yes**, default is the template). Files: `homeCluster.ts`, `villageExtent.ts`.
      Stills: Kafr Qara, Deir Hanna, Umm al-Fahm (still a cluster, now at its real width)
- [ ] V8 Owner look on the phone: Nahalal, Kfar Vitkin, Yagur, Ein Mahil, Daliyat, day and night. Tune the width constant 36 (allowed
      32-40) and the neighbour cap, not the data
- [ ] F3 Curated cities on data fabric (Claude). Files: `hillScene.ts`, `city/CityTowers.tsx` (250 m dedupe, back tone). Stills: Tel Aviv,
      Jerusalem, Haifa day + night; nothing curated lost
- [ ] F1 `far.json` in the builder + loader (Codex). Files: `scripts/city/far.ts`, `src/data/city/farData.ts`, tests
- [ ] F2 Far silhouette + glow (Claude). Files: `city/FarCity.tsx`, `FarLand` hook-up. Stills: Modi'in and Rosh HaAyin looking at Gush Dan, night
- [x] F4 Superseded by V5-V6 (neighbour clusters for every home mode, not mass only beside the template)
- [ ] F5 Abroad: landuse boxes via Overpass `out bb` (Codex). Files: `overpass.ts` (second query builder), `src/data/city/boxColumns.ts`,
      tests. Village homes abroad keep the template (no grid, so no clusters); boxes feed city mode and urban neighbours only.
      Still: one foreign city (owner picks)
- [ ] F6 Docs (Claude): `LANDMARKS.md` §1-2 (city mode, village mode, the two stated licences: `skyHeight` and `villageWidth`),
      `ILLUSTRATION.md` §4 (style and size tables replaced by §10.1 and §10.4; the "we cannot tell them apart" paragraph rewritten)

## 10. Villages from data (phase 4V)

Why the city algorithm did not reach villages: phases 2-3 gate on `built >= 0.12` per 128 m column averaged over a 1.5-2.25 km deep
row. A village covers 7-20 % of its own ground and a fifth of the row's depth, so its columns read 0.01-0.05 and never pass. The data
is there; the gate and the unit are wrong for it. Villages need the **cluster** (a connected footprint in 2-D) as the unit, not the column.

Measured on the shipped grid (2026-11-18, `public/data/city/il`, 280 cells, 671 834 bytes, 119 701 stored squares, 92 950 with footprints):

| Place | Home footprint (8-connected squares) | E-W x N-S km | Storeys in the grid | Squares within 0.6 km of the dot: mapped / zoned only |
|---|---|---|---|---|
| Nahalal | 104, all mapped; the ring is ~13 squares | 2.34 x 2.55 (ring 1.5) | 3: 78, 4: 21, 2: 4 | all mapped |
| Kfar Vitkin | 95, 69 mapped; 70 % of it lies west of the dot | 2.70 x 3.71 | 3: 34, 4: 22, 2: 12 | 19 / 15 |
| Kibbutz Yagur | 38, 37 mapped | 1.40 x 1.86 | 2: 21, 3: 15 | 36 / 1 |
| Kibbutz Mizra | 24, all mapped | 0.70 x 1.62 | 3: 20, 2: 4 | 25 / 0 |
| Daliyat al-Karmel | 682: one component **with Isfiya** | 5.62 x 6.49 | 4: 339, 3: 269 | 77 / 0 |
| Ein Mahil | 1 014: one component **with Nof HaGalil and Nazareth** | 8.90 x 8.81 | 4: 531 | 35 / 20 |
| Kafr Qara | 241 zoned, **2 mapped** | 3.64 x 2.78 | unknown | 1 / 73 |
| Karmei Tzur | **1 square** near the dot. The mapped village (16 squares) is 0.6-1.2 km **west** of the place point | - | 4 | 0 / 0 |
| Petah Tikva | 5 758 (Gush Dan) | 18 x 14 | 4: 2 082 | 77 / 0 |

Three things follow. (1) The storeys are wrong in every village: 36 % of all mapped squares are "3" and 31 % are "4", also among sparse
squares (share <= 3/15: 35 % and 31 %). The source is not the last-resort `9.6` in `resolveHeight` (unreachable: `shape.area` is always
set) but `footprintLevels`: an untagged footprint >= 150 m2 outside residential land gets 3 levels, and 150-450 m2 **inside** residential
land gets 4 (Kfar Vitkin, Karmei Tzur, Daliyat; Savyon's villas read 4-6). (2) Built-up land is contiguous where places touch, so
"this place" cannot be cut by gaps alone; named place nodes are needed, and the repo has none (search is live Open-Meteo + Nominatim;
landmark cells carry no `place=*`). (3) Footprints are missing in most Arab and Druze localities: of 37 sampled in the Galilee, Wadi Ara
and the Carmel, 8 pass the tier-A test below (Daliyat, Isfiya, Ein Mahil, Reineh, Ilut, Jish, Majd al-Krum, Musmus); the rest are zoning only.

### 10.1 Scale: one width law for the home, true scale for everything else

At 375 px one px is 64 m. Nahalal's ring is 23 px and its whole footprint 37 px; Yagur is 22 px; a 0.6 km village is 9 px, the size of
the dot with its ring (9 px), under a 46 x 13 label. A drawn tile house is 8.75 px = 560 m: houses are icons, about 40x life size,
and stay so. So full true scale leaves the home place of most users as 0-2 houses behind the dot. That is not legible and not chosen.

**Decision.** Positions, order and gaps are true everywhere. Only the home settlement is widened, by one stated law that mirrors
`skyHeight` (compressive, monotone, meets true scale where the city begins):

`villageWidth(W) = max(15.625 * W, clamp(36 * sqrt(W), 30, 83))` px at 375 (times `width / 375`), `W` = the home footprint's east-west
extent in km (2nd-98th percentile of footprint area along x, so one stray barn does not stretch it).

| W km | 0.3 | 0.6 | 1.0 | 1.4 (Yagur) | 1.9 | 2.34 (Nahalal) | 2.7 (Kfar Vitkin) | 3.5 | 5.3 |
|---|---|---|---|---|---|---|---|---|---|
| true px | 4.7 | 9.4 | 15.6 | 21.9 | 29.7 | 36.6 | 42.2 | 54.7 | 83 |
| drawn px | 30 | 30 | 36 | 42.6 | 49.6 | 55.1 | 59.2 | 67.3 | 83 |
| lens M | 6.4 | 3.2 | 2.3 | 1.95 | 1.67 | 1.51 | 1.40 | 1.23 | 1.0 |
| tile houses on the crest row (pitch 9) | 3 | 3 | 4 | 4-5 | 5 | 6 | 6-7 | 7 | city |

Today's template draws 54 / 86 / 124 px by population class (Nahalal 86 px = 2.3x its footprint, 3.7x its ring). The floor of 30 px is
the smallest cluster that still reads as a village around a 12 px dot gap: one house each side on the crest row and 3 + 2 below.
The law meets true scale at 5.3 km, so a growing town slides into city mode with no jump. Constant 36 is judged on the Nahalal and
Yagur stills (allowed 32-40).
- The lens is applied **about the dot**: `x = dot + M * (xTrue - dot)`. The dot keeps its true place inside the village (Kfar Vitkin's
  dot sits east of centre, so 70 % of its houses stand west of it), and internal gaps scale with the rest.
- **Neighbours are drawn at true scale** (M = 1), not with the home's lens. Reason, with numbers: around Kfar Vitkin the open gaps
  between clusters are 0.24-0.7 km (4-11 px); the same law would add 4-9 px to each side of every 1-2.5 km cluster and close them all.
  The cluster north-west of Nahalal begins 1.3 km (20 px) from the dot, already inside Nahalal's lensed half-width of 27.5 px. Open land between places is what makes the frame read as countryside, and it is the
  thing the template hides today. Relative sizes **among neighbours** and all distances stay exact; the home alone is under the lens, and
  the mass level of detail already tells the eye it is not the subject. Stated in `LANDMARKS.md` next to the height licence.
- Vertical size is unchanged: home houses keep the template's px (tile 7.5-8.75 px tall); neighbours use `skyHeight` (a 2-storey house
  5.6 px), so a neighbouring village is lower than a neighbouring city's 4-storey mass (7.9 px), as it is in life.

### 10.2 Extent and shape: the cluster

`src/data/city/clusters.ts`, pure, run once in the loader on the decoded grids (the columns of §3 are kept for city fabric):
```ts
export type Cluster = {
  id: number                       // hash of its south-west square: the geographic seed
  dx: [number, number]; dy: [number, number]   // true extent, km from the place (2nd-98th percentile east-west)
  centre: { dx: number; dy: number }           // weighted by footprint share
  squares: number; measured: number; shareSum: number   // counts; shareSum in 1/15 of a square
  levels: number; upper: number    // typical storeys of mapped squares (0 = unknown), tallest p90 in m
  form: { size: number; big: number; pitched: number; flat: number; evidence: number }  // §10.3, zeros on v1 cells
  bands: { dy: number; runs: [number, number][]; big: [number, number][] }[]            // 1-3 north-to-south bands of true x runs
  place?: { name: string; kind: 0 | 1 | 2 | 3; faith: 0 | 1 | 2 | 3 | 4 | 5 }
  urban: boolean                   // wider than 5.3 km or more than 400 squares: drawn by the city fabric
}
export function findClusters(place: Coordinate, grids: ReadonlyMap<string, Uint8Array>, places: PlaceRow[]): Cluster[]
export function homeCluster(clusters: Cluster[]): Cluster | null     // homeCluster.ts
export function homeTier(home: Cluster | null): 'A' | 'B' | 'C'
```
- **Built square:** share nibble >= 1 (a mapped footprint or zoned land). **Link:** 8-connected. Tested on the grid: bridging even one
  empty square (118 m) chains Nahalal to Migdal HaEmek through single farm buildings (604 squares, 9.4 km); 8-connection gives the 104
  squares above. Components under 4 squares or `shareSum < 4` (lone barns, pumping stations) are dropped.
- **Split by place** (`splitByPlace`): a component that holds two or more place nodes is divided by weighted distance: each square goes
  to the node with the smallest `d / reach`; squares with `d / reach > 2` for every node stay an unnamed part. `reach` comes from the
  builder (§10.3). This is what separates Daliyat from Isfiya, Ein Mahil from Nof HaGalil, Kfar Vitkin from Kfar Haim, and a moshav from
  the city it touches. Without `p` (old cached `v1` cell) components stay whole, and a home wider than 5.3 km falls to tier C.
- **A neighbour 1 km away** is therefore a different cluster for one of two measured reasons: unbuilt squares between them (any gap of
  >= 118 m east-west or 232 m north-south), or a different nearest place node. No distance threshold on the gap itself.
- **Home cluster:** the cluster with a built square whose centre is within **0.45 km** of the place point (largest `shareSum` if several).
  0.45 km covers a hollow village centre (Nahalal's green) and the usual offset of a geocoder point, and stops short of adopting the
  next village.
- **Rows replace `ROWS`.** The home's grid rows are cut into bands by its north-south extent `D`: 1 band under 0.35 km, 2 under 0.8 km,
  else 3 (equal thirds, north first). Band 0 is the crest row, bands 1-2 the face rows, drawn with today's `ROW_STEP`. Each band keeps
  its own true x runs, so the outline is the place's: Nahalal comes out as a lens (narrow, wide, narrow), Kfar Vitkin as a long strip
  leaning west, a street village as one or two thin rows. Today's taper ("one house fewer at each end") is used only by the template.
- **Extent replaces `HALF`.** `villageRows(home, style, input): RowPlan[]` (`villageExtent.ts`) lays candidate house centres at
  `PITCH[style]` across each band's lensed runs, jitter +-1.5 px from the geographic seed, and keeps a candidate only if its **true** x
  (`dot + (x - dot) / M`) lies in a run. `composeSettlement` receives `plan?: RowPlan[]` and runs the same seat, dot, label, floor,
  keep-out and give-way guards as today; with no plan it calls `templateRows(size, style, extra)`, today's code moved unchanged.
  `halfWidth` is the kept houses' reach as now, and `placeMarks` takes it as `homeHalf`.
- **Names.** `p` (below) gives each cluster its name. Names are not drawn at 375 px (a 46 px label per neighbour does not fit beside the
  dot label and the corner captions); they go into the mass group's `<title>` / `aria-label` and the QA overlay. A visible neighbour
  label on wide screens remains a rendering decision beyond V2.

### 10.3 Data change: cells `v2`

| Field | Layout | Why |
|---|---|---|
| `r` runs | **3 bytes per square** (was 2). Bytes 0-1 unchanged: share nibble + levels nibble; p90 height in m | old fields untouched |
| byte 2, bits 0-2 | size class: count-median footprint area of the buildings centred in the square: 0 none, 1 < 60 m2, 2 60-120, 3 120-220, 4 220-450, 5 450-1 200, 6 1 200-5 000, 7 more | house, villa, family house, block, hall |
| byte 2, bits 3-4 | big-roof share: part of the square's footprint area in buildings >= 450 m2: 0 < 10 %, 1 10-40, 2 40-75, 3 more | farm yard, industry, apartment slabs |
| byte 2, bits 5-6 | roof tags: 0 none, 1 pitched (`roof:shape` gabled / hipped / half-hipped / pyramidal / gambrel, or `roof:material` roof_tiles / tile), 2 flat (`roof:shape=flat` or `roof:material=concrete`), 3 both | the only direct roof evidence OSM has; mostly absent in the reference boxes (§10.9) |
| byte 2, bit 7 | height evidence: 1 when the square's median height came from a tag, an explicit type or tagged neighbours; 0 when from the footprint prior | the drawing knows what is measured |
| `p` | `[[lat, lon, kind, faith, reach, "name"], ...]` per cell, from `n/place=city,town,village,hamlet,isolated_dwelling`. `kind` 0 city, 1 town, 2 village, 3 hamlet. `reach` in 0.1 km: `max(min, sqrt(pop / (pi * rho)))`, rho = 4 000 /km2 for city and town, 1 500 for village; min 2.0 / 1.0 / 0.5 / 0.3 km, x1.5 when `population` is missing. `faith`: worship places inside the reach by `religion`: 0 none mapped, 1 jewish, 2 muslim, 3 christian, 4 druze, 5 mixed (second faith >= 30 %) | names, the split, the style of §10.4, the setting of §10.5 |

Workflow: one more `osmium tags-filter ... n/place n/amenity=place_of_worship -o places.osm.pbf` and a point export to
`places.geojsonseq`. `grid.ts`: `encodeRuns(bytes, stride)`, `decodeRuns(runs, stride)`; the client accepts `v` 1 (stride 2, no `p`)
and 2, because the service worker may hold `v1` cells for a month.
**Size (computed on today's cells):** runs grow from 354 404 to 478 804 base64 chars (3 bytes fill a base64 quad exactly); set
671 834 -> 796 234 bytes; largest cell `320_348` 17 686 -> 21 250. `p`: 2 187 rows, 94 881 bytes on the measured extract. Total about
0.9 MB. Budgets: cell stays **<= 24 KB**, set **<= 1.0 MB** for village data (the 1.5 MB ceiling keeps room for `far.json`).
Cached clusters: <= 24 per place, <= 6 KB in `shamayim:city:v4:{placeId}`.
Rejected: per-settlement records only (no byte 2). Cheaper (~10 KB), but form then cannot differ inside one place (old core against
a new villa quarter), and the big-roof squares lose their position, which §10.4 draws.

### 10.4 Building type per cluster

`clusterStyle(cluster, desert, fallback?): SettlementStyle` in `src/data/city/villageStyle.ts`, first match:

| Style | Rule from the cluster | Reads as |
|---|---|---|
| `blocks` | `place.kind` city; or `levels >= 3.5` with `evidence >= 0.3`; or median size class >= 5 with `big >= 0.5` in a town | apartment blocks; if `hasCityFabric` also passes, the place enters **city mode** (a medium town such as Migdal HaEmek, drawn as tile houses today) |
| `flat-desert` | the home place's region rule (lat < 31.25, נגב / ערבה / ים המלח); neighbours inherit it (they are within 12 km) | flat roofs in straight rows |
| `flat-hill` | roof tags flat on more squares than pitched (>= 5 tagged); or `faith` 2, 3 or 4; or, with no place node, today's rule (a `minaret` mark inside the cluster and no `synagogue`) | flat concrete and stone, 2-4 storeys, stacked |
| `tile` | otherwise | 1-2 storey houses, red tile |

What is honest and what is not:
- **Honest:** footprint size and big-roof share (geometry), storeys where bit 7 is set, roof tags where they exist, place kind,
  worship places that are mapped, latitude. Druze villages have no minaret, which is why Daliyat reads as `tile` under today's rule;
  `religion=druze` on a khalwa fixes that from data. Worship tag counts and coverage limits are in §10.9.
- **Not available, not pretended:** kibbutz against moshav as a label (OSM has `place=village` for both). They differ in the drawing
  only through what is measured:
  - *Sheds.* `shedCount = clamp(round(4 * big), 0, 4)` long low buildings (11-14 x 3.5-4.5 px), placed at the lensed x of the band's
    `big` runs: Nahalal's farm buildings sit on the outer ring, a kibbutz farm yard on its real side, a community settlement has none.
  - *House size.* Share of the 9 x 7 house = share of squares with size class >= 4 (today: every third house). Size class 2 (kibbutz
    dwellings, 60-120 m2) draws the 7 x 6 house only.
  - *Storeys.* `levels < 1.5`: single-storey houses (1 px lower); else the share of two-storey houses is `clamp(levels - 1, 0, 1)`.
    `flat-hill`: house height 5.5 / 7 / 8.5 px for 2 / 3 / 4 levels.
  - *Shape and gaps* from §10.2: a kibbutz is compact, a moshav is a ring or long streets with open plots, an Arab village a dense core.
- Water towers, silos, minarets and churches stay real marks (unchanged rule: at most 3 absorbed at the home).

### 10.5 Heights of small settlements (`scripts/city/heights.ts`)

Chain order is unchanged: tag -> explicit type -> median of >= 5 tagged within 500 m -> footprint. Only the footprint step changes:
```ts
export type Setting = { rural: boolean; kind?: 0 | 1 | 2 | 3; faith?: number; cover: number }
export function footprintHeight(area: number, residential: boolean, setting: Setting): number   // metres
```
`rural` = the nearest place node by `d / reach` is a village or hamlet with `d / reach <= 2`; or no node that close and `cover < 0.10`.
`cover` = footprint share of the 3 x 3 squares around the building (354 x 696 m), from a per-square area sum added to survey pass 1.
Not rural: exactly today's `footprintLevels(area, residential) * 3.2`, with one changed row for towns (last row).

| Footprint | What it is in a village | Height | Nibble | With `faith` 2-4 (flat-roof village) |
|---|---|---|---|---|
| < 60 m2 | store room, garage, caravan | 3.0 m | 1 | 3.0 m |
| 60-140 m2 | single-storey house: eaves 3.1 m, tile roof at 30-40 % rising ~1.8 m over a 10 m span | **4.0 m** (eaves + half the rise) | 1 | 6.4 m (2 storeys) |
| 140-300 m2 | two-storey house or semi-detached pair: eaves 6.2 m | **7.0 m** | 2 | 9.6 m (ground + 2, the family house that grows a floor per generation) |
| 300-600 m2 | kibbutz row house, club, clinic, small barn | 5.5 m | 2 | 9.6 m |
| >= 600 m2 | chicken house (12 x 80 m, ridge 4.5 m), open cowshed (ridge 8-10 m), packing house, greenhouse, workshop | 6.0 m | 2 | 6.0 m |
| not rural: town with `faith` 2-4, residential, 150-450 m2 | family house, not a walk-up block | 9.6 m (was 12.8) | 3 | - |

Reasoning: "a larger footprint means more storeys" holds only under land pressure, where a 300 m2 footprint is a stairwell block. In a
village a 300 m2 footprint is a wide low building, and above 600 m2 it is a farm or communal hall whose height is set by what it
shelters, not by storeys. Pitched houses store eaves + half the roof rise, the mean height of the silhouette, so the nibble separates
one storey (1) from two (2); the ridge would round both to 2. Drawn result for a neighbour: 6.8 px today -> 4.0-5.6 px.
Left open, measured in V0 and **not** shipped in V1 so that city squares stay byte-identical: the villa guard (`cover < 0.12` and
footprint < 600 m2 inside a town or city -> 2 storeys; Savyon reads 4-6 storeys today).
`columns.ts`: `UNMEASURED_LEVELS` (3) stays for city columns; a zoned-only **cluster** takes 2 (`tile`) or 3 (`flat-hill`, `blocks`).

### 10.6 Neighbours

`composeNeighbours(input): NeighbourMass[]` (`src/data/city/neighbours.ts`), `NeighbourMass = { row: 0 | 1 | 2; roof: 'pitched' | 'flat';
houses: House[]; name?: string }`. Drawn for the village and template home modes; city mode keeps its own fabric unchanged.
- **Which.** Clusters other than the home with centroid `|dy| <= 3 km`, true width >= 4 px (0.26 km). Prominence
  `shareSum * (1 - 0.15 * |dy| / 3)`; cap **8** at 375 px, +2 per extra 150 px, max 14; at most 60 mass blocks in all.
- **Where.** True x from its runs (`187.5 + 15.625 * dx`, scaled to width). Depth row by centroid `dy` (back > +0.75, front < -0.75),
  base from `cityBase` (front row dropped where the offset is under 2 px), tone and night lights by row as §2. Painter's order:
  back, line, home, front; the occlusion rule of §2 applies between rows.
- **How.** `urban` clusters: `rowHouses` over the cluster's columns (other columns masked), the city's block mass as in phase 3.
  Village clusters: houses 4-6 px wide (smaller than the home's 8.75 px), height `skyHeight(levels * 3.2)` (unknown: 4.8 m `tile`,
  9.6 m `flat-hill`), style from `clusterStyle`. Gaps from the sightline rule already used in `fabric.ts`, with the cluster's own
  depth `D`: opacity `o = 1 - (1 - c)^(D / 20 m)`, gap = `w * (1 - o) / o`, clamped 0.5-6 px. A core (c = 0.13, D = 500 m) gives
  o = 0.97, a solid row of roofs; an edge (c = 0.07, one grid row) gives o = 0.55, every second house missing.
- **Mass only.** `massPaths(houses, { ...light, roof })`: `pitched` draws the wall at 55 % of the height and one roof path of gable
  shapes in the tile tone; `flat` is today's box and parapet. No cast shadows, no washes, day panes for `blocks` only, one lit pane
  per house at night by `litShare` (x 0.5; x 0.25 in the back row). <= 5 nodes per depth row and roof kind.
- **Home zone.** Nothing of a line-row or front-row neighbour inside `[homeLeft - 6, homeRight + 6]` (the home's drawn extent): blocks
  there are dropped, and a cluster left under 4 px is dropped whole. This is the price of the lens and is where the lens hides real
  ground (up to 9 px = 0.6 km each side of Nahalal; its nearest line-row neighbour, Kfar Yehoshua, starts 3.4 km west). Back-row neighbours
  pass behind the home, as the cluster 1.3 km north-west of Nahalal does.
- **Dot, label, captions.** Every block passes `cityBuildingFits` (dot radius + 1.5 px for line and front rows, top >= 4 px, top >= 22 px
  for x < 110 or x > 265, floor, the sea-label and sun-caption `keepOut` boxes). `placeLabel` gets one obstacle box per neighbour per row.
- **Marks.** A near mark of an absorbable kind (minaret, church, synagogue, water tower, silo) whose true position lies inside a
  neighbour's extent keeps its place in `select` and its caps (near <= 5, minaret 2: no extra marks appear), takes the cluster's base
  (`cityBase`), and the mass gives way around it with today's `givesWay`. So a neighbour's minaret rises out of its roofs instead of
  standing on an empty hill beside them.

**Node budget at 375 px, village mode (<= 320 near, as §4):**

| Part | Nodes |
|---|---|
| Home houses: <= 22 x ~10 (tile: 5-6 shapes, shadow, 2 groups) | <= 220 |
| Home sheds: <= 4 x 5; contours <= 2 | <= 22 |
| Neighbour mass: 3 rows x 2 roof kinds x <= 5 | <= 30, usually 10-15 |
| Other marks (existing caps) | ~50 |

### 10.7 Fallback tiers (the exact test for "sparse")

| Tier | Test on the home cluster | Extent | Style, storeys |
|---|---|---|---|
| A footprints | a cluster within 0.45 km of the place point, **and** `measured >= 5`, **and** `measured >= squares / 2`, **and** width >= 0.35 km (3 squares), **and** not `urban` | data (§10.2), lens of §10.1 | data (§10.4) |
| B zoned (V7, owner's yes) | a cluster within 0.45 km with `squares >= 12` that fails A | data: the zoned outline | today's `settlementStyle` and `dims` |
| C template | anything else, any place outside coverage, any load error | today's `HALF` / `ROWS` by population | today's, unchanged |

`measured >= squares / 2` is the rule `hasCityFabric` already uses (zoning alone is not a footprint). Checked: Nahalal 104/104, Yagur
37/38, Mizra 24/24, Kfar Vitkin 69/95 (73 %) are A; Kafr Qara 2/241, Deir Hanna, Arraba, Sakhnin, Umm al-Fahm are B (C until V7);
Karmei Tzur is C: its seeded cluster is one square. Tier C calls `composeSettlement` with exactly today's input, so the still is
pixel-equal; V5 then adds neighbours only outside the template's `halfWidth + 6`, which also covers the mapped village 10-19 px west.

### 10.8 Risks

| Risk | Answer |
|---|---|
| The home is widened and its neighbours are not, so home-to-neighbour size is off by M (1.2-3.2) | Stated licence; M is a published table; gaps and positions stay exact. If the owner prefers one factor for all, the cost is merged villages wherever places stand under ~2.5 km apart |
| Most Arab and Druze villages have zoning but no footprints (29 of 37 sampled), so the owner's "Arab village" case is the template until V7 | V7 gives them their real outline; the still for the footprint case is Ein Mahil |
| Karmei Tzur's place point is 0.9 km east of the mapped village; the template is drawn at the dot and the real cluster is hidden under it | Kept as the brief asks. Open decision: adopt the cluster named like the place when it lies within 1.5 km (then Karmei Tzur becomes tier A, drawn west of its dot) |
| Place nodes, `population` and worship tags are unverified (no extract on disk today) | V0 measures them before V1; without `p` everything still runs (no split, today's minaret rule) |
| 3.2 m per nibble is coarse for 4-7 m buildings | Heights chosen to round to 1 or 2 on purpose; byte 1 keeps metres |
| "Petah Tikva unchanged" after a data rebuild | Urban squares byte-identical (V1 gate); rural stretches of its band get lower by design, shown in the V1 still |
| Conurbation splits look arbitrary at the seam | The seam is a nearest-node line, drawn with no gap; styles may change across it, as they do on the ground |

### 10.9 V0 results
Local Israel and Palestine extracts, 2026-11-18. The reference boxes extend 1.5 km east, west,
north and south. Buildings are counted by footprint centroid. The cover column uses the nine
squares around the reference point and unquantized footprint area. At 32°N those squares span
about 354 m east–west and 696 m north–south. Percentages exclude zoning.

| Reference | Buildings | Footprint classes 1–7 | Roof shape / material / colour (%) | 3 × 3 cover (%) |
| --- | --- | --- | --- | --- |
| Nahalal | 974 | 63 / 147 / 324 / 238 / 110 / 86 / 6 | 0.00 / 0.00 / 0.00 | 17.78 |
| Kfar Vitkin | 472 | 21 / 42 / 259 / 92 / 38 / 18 / 2 | 0.00 / 0.00 / 0.00 | 0.33 |
| Yagur | 410 | 7 / 32 / 105 / 177 / 59 / 25 / 5 | 0.00 / 0.00 / 0.00 | 24.14 |
| Mizra | 246 | 14 / 40 / 114 / 48 / 15 / 11 / 4 | 0.81 / 0.00 / 0.00 | 3.97 |
| Ein Mahil | 452 | 6 / 21 / 194 / 142 / 82 / 6 / 1 | 0.00 / 0.00 / 0.00 | 1.78 |
| Kafr Qara | 2 | 0 / 0 / 0 / 0 / 1 / 1 / 0 | 0.00 / 0.00 / 0.00 | 0.00 |
| Daliyat al-Karmel | 4128 | 27 / 412 / 1943 / 1426 / 296 / 24 / 0 | 0.00 / 0.00 / 0.00 | 24.92 |
| Karmei Tzur | 158 | 20 / 36 / 57 / 37 / 7 / 1 / 0 | 40.51 / 40.51 / 0.00 | 0.00 |
| Petah Tikva | 7688 | 1004 / 627 / 1730 / 3105 / 1149 / 65 / 8 | 4.10 / 3.08 / 1.18 | 40.78 |

| Place kind | Nodes | Population present |
| --- | --- | --- |
| city | 8 | 8 |
| village | 1644 | 266 |
| town | 179 | 106 |
| suburb | 712 | 42 |
| neighbourhood | 632 | 6 |
| farm | 44 | 0 |
| region | 13 | 0 |
| quarter | 52 | 1 |
| hamlet | 316 | 47 |
| locality | 86 | 0 |
| isolated_dwelling | 47 | 0 |
| country | 2 | 1 |
| state | 3 | 2 |
| square | 34 | 0 |
| proposed | 1 | 0 |
| city_block | 4 | 0 |
| island | 1 | 0 |
| islet | 2 | 0 |
| allotments | 1 | 0 |
| unknown | 1 | 0 |
| `*` | 1 | 0 |
| borough | 1 | 0 |

| Worship religion | Nodes |
| --- | --- |
| christian | 165 |
| jewish | 607 |
| druze | 8 |
| muslim | 1177 |
| (missing) | 96 |
| multifaith | 1 |
| buddhist | 1 |

| Urban region | Buildings | Height tags (%) | Explicit types (%) |
| --- | --- | --- | --- |
| Gush Dan | 139103 | 8.26 | 9.09 |
| Jerusalem | 31097 | 2.05 | 4.39 |
| Haifa | 17690 | 4.84 | 5.15 |
| Nazareth | 8915 | 0.44 | 1.70 |
| Be'er Sheva | 13941 | 6.04 | 1.84 |

Decisions from the measurements

- Keep footprint size boundaries at 60, 120, 220, 450, 1,200 and 5,000 m². The 120–220 m²
  class dominates Nahalal, Kfar Vitkin, Mizra, Ein Mahil and Daliyat, while the 220–450 m² class
  leads in Yagur and Petah Tikva. Keep the 450 m² big-roof threshold and 10/40/75% class boundaries.
- Keep both roof evidence bits and the five-tag style floor. Six of nine boxes have zero
  shape or material tags. Karmei Tzur is a mapped exception at 40.51% for both tags.
- Keep 0.10 for the rural fallback when no node is within twice its reach. Mapped villages
  straddle that cover threshold, so place kind takes precedence where available. Petah Tikva is
  at 40.78%. The proposed 0.12 urban villa guard remains outside V1.
- Keep the 30% second-faith threshold. The 2,055 worship nodes include eight tagged Druze
  and 96 without a religion. Presence is useful evidence, while zero mapped sites is
  inconclusive. Keep the 1.5× missing-population multiplier since only 427 of the 2,194
  eligible place nodes carry population.
- Replace the estimated place payload with 2,187 written rows and 94,881 UTF-8 bytes for
  the serialized arrays. The rebuilt set meets both budgets. Daliyat and Isfiya have faith 0 in the written
  place rows because no supported worship node falls inside their reaches on this extract.
- The wide-screen label question is a rendering decision for V3 or later. V0 does not set
  a visual threshold for it.

The V1 rebuild wrote 280 cells and 899,103 bytes including the index. The largest cell,
`320_348`, was 23,085 bytes. In the urban-only comparison, the v1 raster and v2
bytes 0–1 matched on every square.

| Region | Urban-only squares | Changed squares across all settings | Urban-only changes |
| --- | ---: | ---: | ---: |
| Gush Dan | 8,528 | 1,115 | 0 |
| Jerusalem | 2,301 | 24 | 0 |
| Haifa | 1,654 | 30 | 0 |
| Nazareth | 255 | 284 | 0 |
| Be'er Sheva | 1,123 | 0 | 0 |
| All | 43,460 | 42,925 | 0 |

The V2 Nahalal fixture remains 104 mapped squares and tier A. Its east–west extent
is 1.99 km after the 2% tail trim in §10.2, while its north–south extent is 2.55 km.
The 2.34 km in the earlier table is the untrimmed bounding span.
Karmei Tzur's one-square component is filtered before home selection, so it is tier C.
The joined 682-square Daliyat–Isfiya component splits into 485 and 148 named squares
and 49 unnamed squares.
