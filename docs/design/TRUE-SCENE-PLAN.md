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
  stay; roofs are **mixed** (half red-tiled, half flat) where nothing is known.
- Owner decision (2026-11-19): **roofs have nothing to do with who lives in a place, only with which roofs it has.**
  Roofs come only from evidence about the roofs: 5+ mapped OSM roof shapes (the majority decides; a town of blocks,
  a desert place flat), else mixed. Removed: the CBS population-group join (98bdf12: `scripts/city/population.ts`,
  `cbs-localities.json`, its patch of the shipped faith; reverted, roofs were its only use), the faith of the worship
  round the place as a roof rule, and the marks rule (a minaret and no synagogue: flat). The place rows keep their
  worship faith: the city build still uses it for footprint heights (`scripts/city/heights.ts`). Daliyat al-Karmel,
  Tamra, Nahalal, Shadmot Mehola and Rosh Pina are all mixed now (none has 5 mapped roof shapes; stills:
  `qa/true-scene/stage2d`). The drawn stand-in (no panorama) keeps its red tiles, as before.
- Roofs from satellite colour: tried, **not wired in** (`scripts/city/roofColour.ts`). EOX Sentinel-2 cloudless 2017
  (10 m, CC BY 4.0), share of reddish pixels over each place's built squares. Tile / flat: Nahalal .67 / Daliyat .52,
  Shadmot .69 / Tamra .15, Rosh Pina .87 / Umm al-Fahm .49, Zikhron .68 / Sakhnin .45, Kfar Tavor .79 / Dimona .00 —
  a cut at .54 splits these and a second set of 15 Galilee places, but a third set fails 9 of 18 (Omer .17, Lehavim
  .18, Meitar .23, Savyon .28, Kfar Shmaryahu .35 read flat; Qalansawe .60, Jaljulia .65, Mas'ade .70 read tiled):
  at 10 m a pixel is mostly garden, road and soil, so the share follows the soil, not the roofs. Needs imagery of
  ~1 m that is openly licensed (none found) before it can say anything.
- Next, before stage 3 (agreed): (b) famous landmarks chosen automatically (OSM wikidata / wikipedia tags), drawn with the generic glyph of their
  kind; the hand-drawn art stays only for a few icons. Then stage 3 (water), stage 4 (loading stand-in: with it,
  remove the stand-in-only machinery: city fabric, columns, neighbours, village plans).

## After (agreed order)
Land colour (season / this week, a subtle tint) → vegetation (orchards, trees, fields where WorldCover says) → rain in
its true direction (cloud over the right ridge; an edge mark when out of view) → wind (dust, cloud drift, tree lean).
