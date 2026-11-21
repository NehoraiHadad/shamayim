# Track B brief: marks owned by the place's own footprint (audit #2)

You are writing code in the worktree `P:\projects\Shamayim\.claude\worktrees\fix-mark-ownership-caed9e` (TypeScript, Vite, vitest).
Read `docs/design/qa/polish/AUDIT.md`, section "2. Karmei Tzur drawn with mosques", first. Do not commit; the manager commits.

## Precision

Pay attention to subtleties and physical accuracy: real geometry and scale, units (km vs the 0.1 km `reach` units of
place points, metres vs px), data provenance, and no unstated approximations. Every constant you add gets a comment
saying what it is physically and where it comes from. No special cases for particular places (no ids, names or
coordinates of Karmei Tzur, Rosh Pina or Safed in `src/` code). Painters stay pure (do not touch `src/scene/paint`).
Keep every new file under ~150 lines; do not grow `src/world/marks.ts` (271 lines) or `src/world/outside.ts` (953):
put new logic in new modules and call it. DRY: reuse existing helpers.

## Facts measured from the bundled data (verified by the manager)

- Karmei Tzur as the app has it: 31.6047, 35.1081, `nameHe` 'כרמי צור'. Its own OSM place point is
  [31.60922, 35.10088, kind 2, reach 8 (=0.8 km), 'כרמי צור'], 0.85 km from the app point. The point nearest the app point
  is a farm hamlet 'חוות צור יהודה' [31.60645, 35.10668, kind 3, reach 5]; `placeBounds` gives Karmei Tzur that hamlet's
  cell (box w −0.375 e 0.625 s −0.625 n 0.625 km).
- Karmei Tzur's built cluster is named 'כרמי צור' (16 squares, dx −1.24…−0.29, dy −0.06…0.87 km) but `homeCluster`
  rejects it because `nearest` = 0.63 km > 0.45. So `portraitReach` falls back to 1.5 km and no home is known.
- Its synagogue 'שבת אחים' is at dx −0.62, dy 0.56 (0.83 km): inside its own cluster, outside the hamlet cell.
- In `public/data/landmarks/il` (built 2026-11-20) all 1564 `minaret` rows have height exactly 30 (the default) and all 53
  `church` rows exactly 25 (the default). No tagged height survives; the source extract is not on this machine, so the
  data cannot be rebuilt here. Do not edit those files.

## (a) Heights by evidence, the same for every religion

1. New module `src/data/landmarks/worship.ts`: `HALL_M = 9` (a prayer hall of about three 3 m storeys, the value
   synagogues already used), `MINARET_M = 30` (a minaret or tower with no height tag), and `LEGACY_DEFAULTS` =
   `{ minaret: 30, church: 25 }` (the old build's defaults). A helper `worshipHeight(tags, towerTagged)` returning the
   tagged `height`, else `building:levels × 3.2` (the factor `classify` already uses), else `MINARET_M` when
   `towerTagged`, else `HALL_M`.
2. `src/data/landmarks/overpass.ts` `classify`: a mosque (`building=mosque`, or `amenity=place_of_worship` +
   `religion=muslim`) stays kind `minaret` (that glyph is the domed hall with its minaret) but its height is
   `worshipHeight`; tower evidence is only `tower:type=minaret`, `building=minaret`, `man_made=tower`. A synagogue and a
   church likewise use `worshipHeight` (tower evidence for them: `man_made=tower` only). Keep the order of the other
   branches. Add `building=minaret` to the minaret branch.
3. `scripts/landmarks/build.ts` writes `heights: 'evidence'` into `index.json`; add the optional field to
   `IsraelLandmarkIndex` (`src/data/landmarks/israelData.ts`) and to `LandmarkIndex` in the build script.
4. `loadIsrael`: when the index has no `heights: 'evidence'`, a row whose kind is in `LEGACY_DEFAULTS` and whose height
   equals that default is read at `HALL_M` (comment: that build gave every such row its default; no evidence of a tower).
   A rebuilt dataset restores tagged minarets by itself.

## (b) The place's own marks come from its own footprint

1. `src/data/city/homeCluster.ts`: `homeCluster(clusters, name?: string)`. When `name` is given, a cluster whose
   `place?.name` equals it (both trimmed) and whose `nearest` ≤ `OWN_NAME_KM = 2` wins (the largest `shareSum` among such;
   comment: the place's own mapped point and built area, found by its name; a gazetteer point can sit a km off). Else the
   existing rule, unchanged.
2. Thread the place's `nameHe` to every caller where the place is known: `portraitReach(clusters, name?)`
   (`portrait.ts`), `outsideFrame` (`outsideView.ts:64`, called from `outside.ts:358`), `place.ts` (`portraitStyle`, `known`,
   `reachKm`). `clusterCache.ts` keeps calling it without a name.
3. `describeCluster` (`clusterStats.ts`): add the node's offset to `place`: `at: { dx, dy }` km from the viewer's place
   (via `cityOffset`), optional in the `Cluster` type, tolerated by `clusterCache.ts` `valid`.
4. `placeBounds(place, file, reachKm, own?: { dx: number; dy: number; reachKm: number })` (`bounds.ts`): `own` is the home
   cluster's node and its built reach. Boundary branch: a boundary that holds the place point, else one that holds the
   own point. Cell branch: the owner is the place point at `own` (nearest to it, within 0.05 km), not the strongest
   claimant at the app point; its claim weight uses `max(point reach, 10 × own.reachKm)` (units 0.1 km) where
   `own.reachKm` = the farthest corner of the home cluster's dx/dy box from its node. Without `own`, unchanged.
   `outside.ts` `lieOf` passes `own` from `homeCluster(city.clusters, nameHe)` when it has `place.at`.
   (`OutsideInput.place` is a `Coordinate`; add an optional `nameHe` to what it receives, `place.ts:86` passes the Place.)

## (c) A mark beyond the place stands on its own town's drawn mass

1. Extract from `outside.ts` `beyondTowns` (≈ line 736) the per-square placement into `src/world/beyondSeat.ts`:
   `seatBeyond(ctx, dx, dy, heightM)` → `{ x, baseY, w, h, km } | null`, the exact same math (outsideProject, the TOWN_MIN_PX
   tests, `overTheCrest`, `look.px(heightM, min(at.k, nearK))`, `lieBaseY`, the km haze). `beyondTowns` calls it; its
   output must be bit-identical.
2. The outside view also returns `seatMark(mark: Landmark): { x: number; base: number; hPx: number; km: number } | null`:
   the city raster's built square (≥ 20 % built, the set `builtSquares` returns) holding the mark's lat/lon, outside the
   place and within `SKYLINE_TO_KM`; null when there is none or when `seatBeyond` for that square (its own roof height, as
   `beyondTowns` computes it) is null (the town is not drawn there). Else `x` = the mark's own projected x, `base` = that
   block's `baseY`, `hPx` = `min(look.px(mark.heightM, k), over the crest)` with the same k, `km` = the block's km.
3. `marksOf` (`marks.ts`, via a new small module `src/world/beyondMarks.ts`): a mark beyond the place within
   `SKYLINE_TO_KM`, of a settlement kind (`minaret`, `church`, `synagogue`, `highrise`, `homes`) and not `source:
   'curated'`, no longer goes through `placeMarks`; it is drawn only when `outside.seatMark` gives a seat, as a
   `WorldMark` at that x, base, hPx and km (glyph from `glyphOf`, `h = GLYPH_SPECS[kind].h(hPx)`, scale 1, plane 'near',
   not portrait), and it must fit `inBox`. Other kinds (turbine, mast, chimney, cooling, waterTower, silo, …) keep today's
   path. Pass `seatMark` through `MarksInput.outside` from `place.ts`.

## Tests (new files, over the bundled data; use `src/test/sceneWorld.ts` `stubPublicFetch`, `loadPlaces`)

- `src/data/landmarks/worship.test.ts`: classify `building=mosque` → minaret 9; `tower:type=minaret` → 30;
  mosque `height=22` → 22; mosque `building:levels=3` → 9.6; church → 9; synagogue → 9. Same hall for all three.
- `src/world/markOwnership.test.ts`, Karmei Tzur `{ lat: 31.6047, lon: 35.1081, nameHe: 'כרמי צור' }` (Place fields as in
  `src/test/scenePlaces.ts`) with `loadCity`, `loadIsrael`, `public/data/city/bounds.json`: the home cluster is the
  'כרמי צור' one; `placeBounds` with `own` holds the synagogue 'שבת אחים'; it does not hold the mosques at 1.61 km
  ('מסגד עצירה'/'مسجد عصيرة') and 1.84 km; no `minaret` row within 6 km has `heightM` ≥ 20. Safed
  (32.9646, 35.496, 'צפת') and Rosh Pina (32.9686, 35.5422, 'ראש פינה'): by the same rule each owns its own synagogues
  and neither shows the other's halls as tall marks (no minaret ≥ 20 m within 6 km of either).
- Rosh Pina full `placeOf` (fixture exists): every non-portrait mark of a settlement kind within 6 km sits on a drawn
  beyond block (its base equals a `beyondTowns` block's baseY at its x ± the block's w/2).

Run only targeted suites, e.g. `npx vitest run src/data/landmarks src/data/city src/world/markOwnership.test.ts
src/world/place.test.ts src/world/marks.test.ts` (list the relevant existing suites with `ls src/world/*.test.ts`), plus
`npx tsc -b` and `npx oxlint`. All green. If an existing test's expectation changes because of this rule, do not weaken
it silently: list it with the reason in your final report.

## Report

End with: files changed, the one-line reason per file, test commands run and their result, any existing expectation
changed and why.
