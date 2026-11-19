# A truer main scene: the plan (2026-11-19)

Follows `HANDOFF-TRUE-SCENE.md`. Stills that led here: `qa/true-scene/` (prototype `?truescene=1`, dev only).

## Decisions (owner, 2026-11-19)
1. **Truth and illustration are separate.** Everything with a direction in the world is true: the ridges, the sun and
   the moon, the sea, far cities and landmarks, later rain and wind. The place itself is an **illustration**: a
   portrait of the village or city with its main elements, not a map of its houses. (The prototype that drew every
   house from the raster at its true angle was rejected: true, but a scatter of houses that reads as nothing.)
2. **The true view facing south**: east on the left, west on the right (`camera.handed = +1`). Ends the mirror.
3. **Vertical scale stays as today** (`RELIEF.high`) for the land and the sky: the first degrees over the horizon ~6.5×,
   easing off higher up. It changes heights only, never directions or sunrise/sunset times. True scale (no stretch) flattens the land
   to a line; mid and high stretch the houses into towers. The stretch is part of the illustration of height and
   applies to everything the same way, so what hides what stays true (sunrise, sunset).

## The rule for the portrait
- Drawn as today: the house style of the place plus 2–4 key elements (palms, orchard, solar field, mosque or
  synagogue, water tower, towers in a city), composed around the dot.
- **Automatic for every place** (owner, 2026-11-19): elements are chosen by rules from data — OpenStreetMap marks
  (size, kind, wikidata/wikipedia tags as a sign of fame), the built-up raster (house style, towers), WorldCover land
  cover (orchards and trees, fields, water). No per-place hand work; `curated.ts` is phased out, or kept only as a rare
  correction. Limit: only what is mapped or seen from space (Shadmot's palms read as "trees", not as palms).
- **One truth it keeps: the side.** An element east of the village is drawn on the east side, west on the west side.
  Distances and sizes are composed. Nothing north of the place is excluded: the portrait is not a view.
- The dot stands at the village's centre (today some place points sit at an edge: Shadmot's is ~300 m east of it).
- **The portrait's reach comes from the data, not a fixed number** (owner, 2026-11-19): the place's own built-up area
  (its home cluster in the built-up map) out to its farthest corner, plus 1 km for its fields; groves and solar fields
  a km further; halls and towers only within the built-up area (beyond it they are another place's, drawn true). A
  city (its built squares fill the view near it) is drawn true: its skyline is its portrait.
- Done in stage 2 (`src/data/landmarks/portrait.ts`, `markProjection.ts`, `coverMarks.ts`): Shadmot's hand-set list
  removed; trees seen by the satellite (WorldCover) added where the map names no grove.

## Stages, in order (each: stills of the six baseline places × four hours, baseline re-recorded in the same commit)
0. **Clean up.** Remove the turning view's UI (TurnScene, Backdrop, Compass, stage, useHeading, sector strip, the
   `TURN_VIEW` flag and the turn-only branches in ValleyScene/App) and the `?truescene` prototype. Keep the
   infrastructure listed in the handoff §2.
1. **Un-mirror.** `handed: +1` for the main scene; audit every east/west assumption: sea side and its label, the
   twilight glow, the sun-lit face of houses and marks (drawn with the sun on the left today), label placement,
   panorama ray order (`panoramaTerrain` maps ray i to x directly), far city and skyline placement.
2. **Portrait rules, automatic.** Rules that pick the 2–4 key elements of any place from the data above; the side rule
   in `placeMarks`/`hillScene`; hand-set `curated.x` removed; place points moved to village centres where they are off
   (from the built-up raster). Checked on the six baseline places and a handful of others; Shadmot reviewed with the
   owner.
3. **Water (true).** The Mediterranean, the Kinneret and the Dead Sea where they are really in view, at their bearing
   and distance, from WorldCover's water class (the DEM sees the lakes as low land; today only a sea within 8 km of a
   coast is drawn). The dashed "פני הים" line below sea level stays: it is a datum, not water.
4. **Loading stand-in.** The hand-drawn cross-section that pops to the real land: replace with a quiet placeholder
   (open, low priority).

## Status (2026-11-19, end of session)
- Stages 0, 1, 2 done on branch `ccr-85ec24f0-9ayxgu` (stills: `qa/true-scene/stage1`, `stage2`).
- Owner decisions in stage 2: a **city is a portrait too** (its blocks round the dot, its landmarks among them by
  side; more polish later); the data skyline's faces (built squares at their true angle) are gone everywhere, towers
  stay; roofs come from the data where it knows them, from the marks round the place (a minaret and no synagogue:
  flat) where it does not, and are **mixed** (half red-tiled, half flat) where nothing is known.
- (a) done (2026-11-19, stills: `qa/true-scene/stage2b`): each place's population group from the CBS localities list
  (`bycode2022.xlsx`, cut to `scripts/city/cbs-localities.json`: code, point, group, names) is joined to the OSM place
  rows by name near the point (`scripts/city/population.ts`: 1190 of 2187 rows, 1186 of 1246 localities) and sets the
  row's faith: Jewish 1, Arab / Druze / Bedouin 2 (or the worship's Muslim, Christian, Druze), mixed cities 5. Runs in
  the build and, without the OSM extract, on the shipped cells (`npx tsx scripts/city/population.ts`). Roofs now: enough
  mapped roof shapes (5+) decide either way; then the CBS group (Arab, Druze, Bedouin flat; Jewish red tiles); then the
  marks round a nameless cluster; mixed only where nothing is known. Daliyat al-Karmel and Tamra are flat, Shadmot
  Mehola and Nahalal red-tiled.
- (b) done (2026-11-19, stills: `qa/true-scene/stage2c`, before/after): landmarks are chosen from the data for every
  place, the three curated cities too (no more curated-only short cut). **Fame** (`src/data/landmarks/fame.ts`): an OSM
  object with a Wikipedia link (`wikipedia`, `wikipedia:<lang>`) is 2, with only a Wikidata item 1; it adds 3 / 2 to
  the score, so a famous mark beats an anonymous one of its kind (and of duplicates within 300 m the famous one is
  kept). A famous building or structure is a **landmark** of its place: in the portrait it stands among the roofs like
  the old curated marks, at most 4 per portrait (`PORTRAIT_LANDMARKS`, icons first), and it is lifted off the sheet edge
  rather than dropped. Drawn with its kind's generic glyph (Tower of David → castle, Shalom Meir, Sail Tower, Dagon →
  towers, Reading → chimney, Bazan → cooling tower). Hand-drawn **icons** left (`curated.ts`): the Western Wall (no
  kind for a wall; standing in for the Wall's own place of worship and the Temple Mount mosques, as decided
  2026-11-17), the Shrine of the Báb (no kind for a Bahá'í shrine), Azrieli Center (three towers as one sign; standing
  in for the towers at its spot), the Chords Bridge (bridges are lines, not in the data). The shipped cells got fame
  from the 2026-11-19 extract without a rebuild (`scripts/landmarks/fame.ts`; 226 rows); the monthly build keeps it.
  Cache key `shamayim:landmarks:v7`. Jerusalem's satellite groves go when the map names a grove it then does not draw
  (Gethsemane): to look at with vegetation.
- Next: stage 3 (water), stage 4 (loading stand-in: with it, remove the stand-in-only machinery: city fabric, columns,
  neighbours, village plans).

## After (agreed order)
Land colour (season / this week, a subtle tint) → vegetation (orchards, trees, fields where WorldCover says) → rain in
its true direction (cloud over the right ridge; an edge mark when out of view) → wind (dust, cloud drift, tree lean).
