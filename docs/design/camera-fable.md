# Camera and world model: review of option A2 (Fable, 2026-11-19)

Status: advice, no code changed. Scope: the valley scene only. Line numbers are as of `34f297a`.

## 0. Verdict in five lines

- A2 is sound **as a stage in front of a backdrop**, not as one literal camera. The horizon, sky, far land and far city
  stay computed from the place at 2 m (the backdrop). Only what lies within 0.4 km of the place is seen from the pole
  (the stage).
- Do **not** move the horizon's eye to the pole. It would break the app's best truth (the sun hides exactly when the
  drawn land hides it for someone standing in the village) and make every pixel depend on the heading.
- The backdrop is linear in azimuth, so it is one 360° strip that rotation only **translates**. No WebGL is needed.
- The mirror has to go once real footprints are drawn: a mirrored village is a false village. True camera, default
  heading south, so east moves to the **left**. This is the one change the owner will feel; it comes last, on stills.
- The vertical budget is the real constraint: today only 18 px lie under eye level (`sceneLayout.ts:8-9`, horizon at
  y ≈ 96 of 128). The stage needs 15 to 35 px.

## 1. Critique of A2

### 1.1 What a literal near camera would cost
Pole camera at back-off `r`, height `h` over the place's ground, ridge at distance `d`:

| Error if the backdrop keeps the place's eye | r = 150 m, h = 25 m | Drawn size (1.5 px/° across, ~9.8 px/° up near 0°) |
|---|---|---|
| Azimuth parallax at the view's edge, `r/d` | 1 km: 8.5°, 5 km: 1.7°, 20 km: 0.4° | 13 px, 2.6 px, 0.6 px |
| Elevation, `h/d` | 1 km: 1.4°, 5 km: 0.29°, 20 km: 0.07° | 14 px, 2.8 px, 0.7 px |

So beyond about 5 km the two eyes agree to within 3 px, and nearer than 2 km they do not. If instead the horizon were
recomputed from the pole:
- The sun moves about 0.25° a minute near the horizon. A ridge 1 km away would drop 1.4°, so the drawn sunset would be
  about 6 minutes later than the one the person sees. `withVisibleSun` (`visibleSun.ts:17-27`) reads its times off the
  drawn skyline, so the labels would be wrong too.
- The eye would move with the heading, so land, far city, marks and lighting would all be recomputed per frame of a
  drag (`hillScene.ts:63-149` is a layout pass, not a transform).
- The stored panorama would no longer be a property of the place.

There is already a precedent for the cheap way: the city skyline lifts the eye by up to 20 m for roofs only and leaves
the land in the 2 m frame, with the residual written down (`PANORAMA-SKYLINE-PLAN.md` §2, `skylineRay.ts:23-29`).
A2 should be the same idea, made explicit.

### 1.2 The coherent form: one projection, eye depends on distance
One function turns a world point into px. Its eye is the pole for the ground at your feet and comes down to the
place's own eye by the rim of the stage:

- `back(d) = r · (1 − smoothstep(250 m, 400 m, d))`, `up(d) = h · (1 − smoothstep(250 m, 400 m, d))`, `d` = distance
  from the place. Beyond 400 m both are 0, which is exactly today's panorama.
- 400 m is not arbitrary: it is `RAY_DISTANCES[0]` (`panorama.ts:36-37`), the hole the data already has, and the
  skyline plan already says "squares under 0.4 km are skipped (the home glyph stands for them)".
- The result is continuous at the rim, so a house at 390 m and a raster block at 410 m in the same direction land at
  the same x. Without the fade they would be up to 30 px apart at the sides of the view.

Starting values (tune on stills, like every constant here):

| Parameter | Value | Why |
|---|---|---|
| Across | 1.5 px/° at 375 px, so 250° in view | Unchanged; `SKY_PX` (`angleScale.ts:16`) and every px constant assume it. Facing south it holds the whole sun day in every season (summer rise 62°, set 298°) |
| Projection | Cylindrical, level optical axis, no tilt | The eye-level line stays straight and at one y for every heading |
| `r` | `clamp(0.6 × settlement radius, 120, 250)` m | At 150 m a 10 m house in the middle is 3.8° = 5.7 px wide: today's mark size |
| `h` | 25 m (never under the roofline lift + 10) | The place's centre lies 9.5° under eye level |
| Stage vertical scale | True angle, 1.5 px/°, **no** relief stretch | Centre 14 px under eye level, nearest drawn houses about 30 px. With `anglePx`'s 6.5× stretch a 7 m house would be 10 px tall and 5 px wide (the "needles" risk in the skyline plan §8) |
| Houses nearer than ~60 m to the pole | Not drawn | They fall under the sheet anyway (22° down) |

### 1.3 What this means for each part
- **Horizon computation**: unchanged eye (`EYE_M = 2`, `panorama.ts:20`), extended to 360°. See §2.1.
- **The village's place**: today it stands on the near ridge crest due south (`panoramaTerrain.ts:88`, then
  `hillScene.ts:69` takes `ground(centerX)`), which puts Shadmot Mehola on the highest ground within 5 km. In A2 its
  y is `horizonY + 1.5 × depression`: below eye level, in front of the ridges. That alone fixes the −159 m lie.
- **Middle ground (0.4 to 5 km)**: nothing new to draw. It is the near-land fill, one flat tone. The stage's ground is
  a polygon in the same tone, so there is no seam to hide. On a hilltop, where the near ridge is under eye level, that
  polygon is the visible silhouette: the village on its own hill against the far land, which is true.
- **Stage ground**: zoom 10 is ~130 m a pixel (`fetchPanorama.ts:13`), too coarse inside a village. Store a tilted
  plane: the DEM at 8 compass points 300 m out, 8 numbers in the stored panorama.
- **Village drawing**: runtime data has no footprints. The raster is a cell of about 118 × 232 m
  (`grid.ts:3-6`); a 400 m stage holds 12 to 25 cells. So in order: (a) today's template glyph, moved to the stage
  anchor; (b) seeded houses placed inside the built cells and the cluster's real extent (`clusterTypes.ts`, same
  licence as the city plan: extent and density true, each house seeded); (c) real footprints from a new small tile set
  (centroid, size, bearing, levels; only needed within 500 m of a place). Each house is a box drawn by the camera,
  painter-sorted by depth. (c) is a data-pipeline project of its own (`scripts/city`).
- **A city**: the pole stands inside it. The stage shows the 400 m neighbourhood; the rest of the city is the existing
  raster skyline (0.4 to 6 km), already at true bearing. Nothing else changes.

### 1.4 Is WebGL worth it? No
The backdrop is a function of azimuth alone, so rotating is a translate of an SVG group. The stage is a few hundred
boxes. WebGL would cost the hard drawn skyline, the `color-mix` tokens and the CSS transitions that are the identity
(`scene-2-5d-plan.md` line 15), for a camera that neither climbs nor flies. Revisit only if the owner later wants the
pole to change height or the camera to move through the land.

## 2. Target architecture

### 2.1 World model (pure data, no px, no heading): `src/data/world/`
```ts
interface World {
  place: Coordinate; groundM: number; eyeM: number
  rays: HorizonRay[]                       // 288 rays, azimuth 0, 1.25, … 358.75 (clockwise from north)
  sight(az): { nearKm; farKm; farShows }   // today sightAt(x)
  groundAt(az, km): number | null          // today groundAt(x, km)
  seen(az, km, heightM?): { angle; groundAngle } | null   // today seenAt, without y
  sea: { side: Arc | null; levelAngle: number }           // today seaSideOf + seaY, by azimuth
  snowAngle(layer, az, lineM): number
  stage: { plane: number[]; buildings: StageBuilding[] }  // east m, north m, w, l, bearing, heightM, roof
}
type Feature = { id; az: number; km: number; heightM: number; kind; … }   // marks, towers, far patches
```
Today's rays are 305° − 1.25° × i, all on the 1.25° grid, so the 288-ray set contains today's 201 rays exactly. The
far DEM is already fetched as a full circle (`fetchPanorama.ts:19-20`): 360° costs no extra network, 43 % more CPU.

### 2.2 Camera (the only code that makes px): `src/ui/scene/camera.ts`
```ts
interface Camera {
  heading: number        // azimuth at the middle of the scene
  handed: 1 | -1         // +1 true camera (azimuth grows to the right); −1 today's mirror
  pxPerDeg: number; width: number; horizonY: number
  pole: { r: number; h: number; fadeFrom: number; rim: number } | null
}
x(az)      = width/2 + handed · pxPerDeg · wrap180(az − heading)
y(angle)   = horizonY − anglePx(angle)
azAt(x), inView(az), sky(alt, az), land(az, angle), point(az, km, heightM), stage(eastM, northM, upM) → { x, y, scale, depth }
```
Today is exactly `{ heading: 180, handed: −1, pole: null }`: `skyPoint` gives 187.5 − 1.5 × (az − 180)
(`moonShape.ts:22-23`) and `azimuthAt` gives 305 − x / 1.5 (`panorama.ts:28`), the same line.

Rendering: a `Backdrop` group holds everything beyond the rim in strip coordinates (540 px for 360° at 375) and is
moved by `translateX`, drawn in 120° sectors so only what is in view is mounted. A `Stage` group is re-projected per
frame. A settle pass on release redoes what depends on the window: labels, `fitMarks`, the sea label, the shortlist.

### 2.3 File by file

| File | Change |
|---|---|
| `terrain/panorama.ts:22-47` | `AZ_LEFT`, `AZ_RIGHT`, `azimuthAt`, `azimuthFraction` go to the camera. `RAYS` → 288, `rayAzimuth(i) = 1.25 i`. `horizonRay` unchanged |
| `terrain/storedPanorama.ts` | v4: rays in azimuth order, plus the stage plane. Reads v3 as an arc |
| `terrain/panoramaTerrain.ts` | Split. World part: smoothing (`:52`, now wrapping), sea (`:29-37`, `:60-64`), snow (`:66-75`), sight, seen. View part `terrainView(world, camera)`: points, paths, `horizonY` (`:47`). `centerY` (`:88`) deleted |
| `terrain/terrain.ts:18-51` | `SceneTerrain` loses every `x`-keyed function; the drawings `:53-82` go (see §2.4) |
| `terrain/sightProfile.ts:15-22`, `visibility.ts:11-24` | Keyed by azimuth instead of `x / RIDGE_WIDTH`; `visibilityAt` returns angles, the camera adds y |
| `ui/scene/moonShape.ts:14-34` | `EAST_SPAN`, `skyPoint` → `camera.sky`. `sunDirection` becomes the angle from moon to sun in camera space |
| `ui/scene/skyProjection.ts:25-30, 59-62` | `horizonLine` is one level line; `projectSky` → `camera.sky`. The rise-to-set slanted line and `altitudeY`'s arc (`skyline.ts:58-68`) go with the cross-section |
| `ui/scene/visibleSun.ts:8-27` | Takes the **world** horizon, not the view. Otherwise turning north would change today's sunset time |
| `ui/scene/ridgeLighting.ts`, `useSceneSun.ts` | Light direction from the sun's azimuth relative to the heading, not from the drawn disc (the disc may be out of view). Supersedes "light in drawn space" in `scene-2-5d-plan.md` §1 |
| `landmarks/project.ts:30-37` | `bearingOf` returns `{ az, km }`, never null. `sightLayer`, `projectSight` take azimuth |
| `landmarks/markProjection.ts`, `placeMarks.ts` | Return features with `az`, `km`, layer; x in the UI. The hand-set `x` rule (`markProjection.ts:10`) goes |
| `landmarks/curated.ts:27-30` | Shadmot's palms, homes, solar field, orchard lose `x` and become stage or backdrop features at their real coordinates |
| `city/plainData.ts:21, 34-98` | Columns in azimuth (2 px = 1.33°); patches as `{ az0, az1, angleTop, angleBottom, km }` |
| `city/farData.ts:66-92` | `panoramaFarColumns` by azimuth |
| `city/skylineRay.ts:23-33, 76`, `skylineData.ts`, `skylineTowers.ts:16` | Rays by azimuth; seeds keyed by an azimuth bucket, not the screen column. `eyeLiftM` stays, now named as the camera's `up` beyond the rim |
| `marks/homeMode.ts:35-56` | Becomes "what stands on the stage": template, seeded or footprints. `villageStyle`, `form`, `settlementStyle` are kept (they classify, they do not project) |
| `marks/hillScene.ts` | Split into `backdropScene(world)` (cached per place and sector) and `settle(view)` (labels, fitting). `:67-71` and `intoTown` (`:41-57`) go: the dot is the stage anchor |
| `ValleyScene.tsx` | Owns `heading`; `:103-116` (dot, depth label, sea label) are placed by the camera. Adds the compass rail next to `SceneScrubber` (`:118`) |

### 2.4 What can be deleted: the cross-section, entirely
It is no longer a data mode (`terrain.ts:99-100` already drops its stored form). What is left is a stand-in drawing plus
a second projection kept alive behind `terrain.sightAt` and `terrain.drawn` tests in 8 files:
- `project.ts:64-71` (`toX`), `ridgeProjection.ts` (`ridgeX`, both radii), `markProjection.ts:21-23`.
- `farData.ts:33-64` (`farColumns`) and the branch at `:105`.
- `placeMarks.ts:66-101, 128` (dy bands, cross-section high-rise rules).
- `homeMode.ts:42-56` city and village modes, with `fabric.ts` `composeCity`, `neighbours.ts`, `villageExtent.ts`
  `villageRows`, `columns.ts` as far as only they use them; `hillScene.ts:90, 94, 125`.
- `useLandmarks.ts:32, 43-49` (two shortlists; `App.tsx:58`).
- `skyline.ts:48-68` (`ARC_FLOOR`, the common arc), `skyProjection.ts:29`, `terrain.ts:53-82`.

Stand-in while the DEM loads or offline: a flat world (`computePanorama(() => groundM, groundM)`) through the same
pipeline. One model, no branches. The ridges rise when the panorama arrives.

## 3. The four product decisions

**Handedness.** True camera (`handed: +1`). Reasons: real footprints must not be flipped; a drag must turn the world
the way a head turns; facing south the sun then travels left to right, as it does outside. "East is always right" is
replaced by compass letters (צ, מז, ד, מע) on a rail under the scene that move with the land. `handed` stays a field
so stages 1 to 5 run with −1, pixel-identical, and the flip is one line reviewed on stills.

**The sun when looking north.** In view: 235° through north to 125°. Summer sunrise and sunset are in the picture;
the winter sun (117° to 243°) is behind you nearly all day. Then: (1) the land is front-lit, flat and even, shadows
fall away from you into the picture (the noon picture of `scene-2-5d-plan.md` §1, now from true geometry); (2) a small
sun coin is pinned to the edge of the scene on the sun's side, at its altitude; tapping it turns the view to the sun;
(3) the time scrub and its readout work unchanged. The default heading is south and the view never turns by itself:
a scrub must move the sun, not the world.

**Gesture.** The scene keeps its horizontal drag for time (`SceneScrubber.tsx:40`, `touch-action: pan-y`,
`ValleyScene.module.css:190`). Rotation gets a compass rail: a strip about 28 px high at the foot of the scene with
the letters and ticks. Drag it to turn (finger right brings the land right, with inertia); tap a letter to face it;
tap the heading mark to return south. It is a second `role="slider"` ("כיוון המבט", value text "דרום־מזרח"), arrow
keys step 15°. Rejected: two-finger drag (undiscoverable, fights pinch), "sky scrubs, land turns" (18 px target),
a mode switch (hidden state). Device compass can be added later as an opt-in.

**Desert, no buildings.** The stage draws only what exists. No buildings in the raster within 400 m and no place
polygon: the ground plane in the near tone, the place dot, the name and elevation labels, and the land and sky as
the subject. Mapped features (a palm grove, a solar field, a lone mast) appear as stage features. No template houses:
today's `withPlaceHomes` stand-in is the thing A2 exists to remove. `desertSettlement` keeps choosing tones only.

## 4. Staged migration

Main looks the same through stage 5; stage 6 turns it on.

| Stage | What | Proof of "looks the same" |
|---|---|---|
| 0 | Harness. Record fixtures (stored panorama, city grids, landmarks) for the five QA places (Shadmot, Tel Aviv, Jerusalem, Haifa, Rosh Pina). Add a `renderToStaticMarkup(<ValleyScene>)` snapshot per place × dawn, noon, dusk, night × widths 375 and 412. Script the same matrix through `scripts/shot.mjs` (`SHOT_PLACE`, `SHOT_TIME`) with a pixel diff | Baseline |
| 1 | `camera.ts` with `{180, −1}`. `skyPoint`, `azimuthAt`, `azimuthFraction`, `bearingOf`, `SCENE_RADIANS`, `sunDirection` call it. One mapping instead of two | Markup snapshots byte-identical |
| 2 | World API by azimuth; data modules return `az`, `km`, angles; `terrainView` rebuilds today's `SceneTerrain`. Strip origin stays at 305° so column seeds do not move | Byte-identical |
| 3 | 288 rays, v4 storage, 360° fetch. `withVisibleSun` and smoothing read the world. The view still shows the south 201 rays | Identical except the two edge rays (the 1-2-1 smoothing now has neighbours): ≤ 0.1 px, stated |
| 4 | Delete the cross-section; flat world as stand-in | Loaded scenes identical. Loading and offline stills change: owner sees them |
| 5 | Stage behind `?stage=1` (same pattern as `?relief=`, `angleScale.ts:37-41`): 5a template at the stage anchor, 5b seeded houses, 5c footprints. `horizonY` from all 288 rays | Flag off: identical. Flag on: new stills for approval |
| 6 | Backdrop strip and translate, compass rail, `handed: +1`, sun coin at the edge, light from the world sun, settle pass. Flag removed | New baseline |

Risks:
- **Stored panorama.** Key `shamayim:horizon:v3:<placeId>` (`terrain.ts:85`), ray order is screen order. v4 uses a new
  key; a v3 entry is shown as an arc (north flat) until v4 is fetched, then removed. Size grows from about 60 KB to
  88 KB a place and nothing evicts old places today: add a cap (keep the 10 most recent).
- **`horizonY` depends on the south ray** (`panoramaTerrain.ts:47`). It must become one number per place before
  rotation or the horizon line jumps while turning. That moves pixels, so it sits in stage 5 behind the flag.
- **Sea line and sea side** are view statistics (`panoramaTerrain.ts:29-37, 60-64`): compute them once per world.
- **Phone performance.** 360° is 1.44× the nodes of today (the city plan counts 500 to 800 for a large cluster, up to
  220 night dots): mount by sector. While turning, drop blur and transitions the way `data-scrubbing` does
  (`ValleyScene.module.css:195`), draw stage houses as plain boxes, redo labels on release. Measure on a mid Android
  before stage 6 lands.
- **Seeds.** Skyline seeds use the screen column (`skylineRay.ts:76`). Re-keying by azimuth reshuffles every seeded
  silhouette once: do it in stage 6, with the flip, so there is one visual break and not two.
- **Fixtures.** `hillScene.test.ts.snap` and `settlementPlan.test.ts.snap` encode px; `panorama.test`,
  `panoramaCity.test`, `plainCity.test`, `skylineData.test`, `moonShape.test`, `sunPath.test`, `visibleSun.test`
  assume 201 rays or the mirror. 360° fixtures need one recorded DEM fetch; do not derive them from v3.
- **Stage 4 removes code that carries knowledge** (village tiers, cluster plans). Keep the classification modules;
  delete only their projection halves.

## 5. Questions for the owner

1. **East moves to the left by default (true camera facing south). Accept?** Recommend yes, at stage 6 only. The
   alternative that keeps east on the right is a true camera facing north, which loses the winter sun all day.
2. **Time-scrub direction after the flip.** Facing south the sun will move left to right, while a finger moving left
   still means later (RTL, matching the hour strip). Recommend keeping the gesture tied to the strip and testing on
   the phone; if it feels wrong, flip the scene scrub only.
3. **Room under the horizon.** The stage needs 15 to 35 px; there are 18. Recommend raising the eye-level line by
   about 12 px (`MIDDLE_Y` 96 → 84) and the scene from 128 to 140 px, decided on stills of a valley and a hilltop place.
4. **How large is the village on screen?** With `r` = 150 m houses stay about 5 px but a 600 m moshav spans 150 to
   250 px, far more than today's glyph. Recommend accepting that (it is the point of A2) and tuning `r` and `h` on the
   five QA places.
5. **Loading and offline picture.** Recommend deleting the hand-drawn Shadmot valley and bundling Shadmot's real
   panorama in the app (about 90 KB) so the home place is right from the first frame; other places start flat.
6. **Real footprints.** A new tile set and pipeline. Recommend shipping seeded houses on the real extent first (5b)
   and adding footprints after rotation is live, villages first.
7. **Does the heading persist?** Recommend: kept while the app is open, back to south on the next launch, one tap
   to return.
8. **Shadmot's hand-placed marks** (`curated.ts:27-30`). Recommend moving them to their real coordinates and deleting
   `x`; the orchard and palms then appear only when you look their way.
9. **Two vertical scales** (land stretched 6.5×, village at true angle). Recommend keeping both and saying so in
   `LANDMARKS.md`; the alternative is needle houses or a 6 px strip of land.
10. **Point-the-phone compass.** Recommend later, opt-in (iOS asks for permission).
