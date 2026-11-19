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

## After (agreed order)
Land colour (season / this week, a subtle tint) → vegetation (orchards, trees, fields where WorldCover says) → rain in
its true direction (cloud over the right ridge; an edge mark when out of view) → wind (dust, cloud drift, tree lean).
