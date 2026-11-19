# The valley scene on canvas: architecture and staged plan (2026-11-19)

Follows the owner's decisions of 2026-11-19 (`TRUE-SCENE-PLAN.md`, section "Rendering: the current hand, enriched, in
canvas"; `qa/true-scene/skyline/SKYLINE.md`, variant B). Prototype of the look: `prototypes/canvas-scene/`
(`styleRich.ts`, `rich.ts`, `sceneGlyphs.ts`, `valley.ts`); stills `qa/styles/v1b/` (hero, noon, night, rain).

**Goal.** The whole valley scene, sky to near ridge, is drawn in canvas in the current hand, enriched. Text and UI stay
HTML/CSS. It is rebuilt from the infrastructure up, not patched over the SVG: one world state, built once from the
data, drives every element. The SVG scene stays frozen and working behind it until the switch, then goes.

**Rules that carry over unchanged** (`TRUE-SCENE-PLAN.md`): true directions for ridges, sun, moon, water, far cities
and landmarks; the vertical scale `RELIEF.high` (`data/terrain/angleScale.ts`) for land and sky alike; the portrait is
an illustration chosen automatically from data, with the side rule; roofs only from roof evidence, else mixed; famous
landmarks from wikidata/wikipedia with generic glyphs plus 4 hand icons; water from `src/data/water/`; the dashed
"פני הים" datum only below sea level.

**General rules, not point fixes** (owner, 2026-11-19): as few point fixes as possible. No special handling for
particular places, mountains or settlements; every rule is written so the algorithm handles every place correctly from
the data. Where a place looks wrong, the rule is fixed, not the place. (Items below that once named one place, Haifa's
Carmel face, Ramat Gan's frame, the Haifa cooling tower, are written as general rules.)

**One change of order.** The earlier order of work in `TRUE-SCENE-PLAN.md` began with "landmarks as a canvas layer
inside today's scene". The owner's newer decision (replace everything from the infrastructure, no patch over the SVG)
supersedes it. Landmarks still come early, but they are painted by the new pipeline, not inside the SVG.

---

## 1. Architecture

```
 data hooks (forecast, terrain, landmarks, city, water)       per-frame: phase (s), never the clock
              │                                                         │
              ▼                                                         │
 buildWorld(input) ─► WorldState  (pure, memoised by part keys)         │
              │                                                         │
              ▼                                                         │
 sceneModel(world, box) ─► SceneModel { layers: LayerDesc[], overlay: OverlayItem[] }   (pure, no canvas)
              │                                    │                    │
              ▼                                    ▼                    ▼
 Compositor: per-layer offscreen cache ──► painters (canvas 2D, enriched hand) ──► SkySurface + LandSurface
                                           HTML overlay (labels, dot, scrubber), placed from SceneModel.overlay
```

Four rules hold the design together:
1. **The world state is the only input.** No painter or model function reads the forecast, the DOM or the clock.
2. **The model decides; the painter draws.** Geometry, colour after light and haze, and z-order are fixed in the model
   (scene coordinates, RGB). Painters add only the hand: texture, grain, soft edges, puff shapes.
3. **Every layer has a key built from its exact inputs.** A layer is repainted only when its key changes. Only
   animated layers (rain, mist, cloud drift, star twinkle, glint shimmer, smoke) run per frame, and they redraw only
   their own small canvases.
4. **Seeded randomness only.** `seeded(hashId(place.id, part, i))` (`data/landmarks/hash.ts`). No `Math.random`, no
   `Date`, no `performance.now` below the React shell.

### 1a. WorldState (`src/world/`)

Built in one place, `buildWorld(input: WorldInput): WorldState`. The input is what App already holds: forecast and
shown hour, place, terrain (+ `sunTerrain`), landmarks, city, water, observed clouds, `at`, `selected`, and the viewport
box. Each part is memoised separately, so a change of hour does not rebuild the terrain.

```ts
// src/world/types.ts
export interface WorldState {
  place: Place
  at: LocalTime
  seed: number                       // hashId(place.id)
  camera: Camera                     // domain/camera.ts, SCENE_CAMERA (handed +1, facing south)
  relief: Relief                     // angle → y (anglePx, RELIEF.high), horizonY; shared by land and sky
  bodies: { sun: Body; moon: Body & { phase: number; illumination: number; tilt: number } }
  light: Light
  air: Air
  clouds: CloudLayer[]               // low, mid, high (in that order)
  rain: Rain | null
  snow: SnowState | null             // ui/scene/snowLine.ts
  wind: Wind
  terrain: TerrainPlanes
  water: WaterState
  place3: PlacePortrait | OutsideView  // a village's portrait, or a city seen from outside (variant B)
  marks: PlacedMark[]                // after portrait/outside rules (data/landmarks/*)
  night: Night
  ground: { wet: number; snowLineM: number | null }
  keys: WorldKeys                    // a stable hash per part, for the compositor
}

export interface Body { azimuth: number; altitude: number; x: number; y: number; up: boolean; overLand: boolean }

export interface Light {
  source: 'sun' | 'moon' | 'sky'     // sky: overcast or twilight with no direct light
  azimuth: number; altitude: number
  side: 'left' | 'right' | null      // screen side the light comes from (camera.xOf(azimuth))
  colour: RGB                        // direct light after air mass and aerosol (sceneLight.ts)
  direct: number                     // 0..1, dimmed by the cloud between the eye and the source
  ambient: RGB                       // sky light on shade faces
  shadow: { dx: number; length: number; softness: number }  // softness 1 under overcast = no shadow
  afterglow: { x: number; altitude: number; rgb: RGB } | null
}

export interface Air {
  visibilityKm: number; humidity: number | null; dust: boolean
  haze: RGB                          // the horizon colour planes fade toward
  fade: (km: number) => number       // aerial perspective, 0 near … 1 lost; Koschmieder from visibilityKm
  horizonBand: { rgb: RGB; alpha: number }
  heat: number                       // shimmer amplitude (atmo/mapAir.ts heat)
}

export interface CloudLayer {
  level: 'low' | 'mid' | 'high'; cover: number; baseM: number
  banks: CloudBank[]                 // seeded positions in azimuth/altitude, sizes by level
  drift: number                      // scene px/s across, from the wind at this level
  litUnderside: number               // 0..1, low sun lights the undersides
  rains: boolean                     // this layer makes the rain (low/mid with precipitation)
}
export interface CloudBank { id: string; azimuth: number; altitude: number; w: number; h: number; puffs: number; seed: number; seen?: boolean }

export interface Rain { rateMmH: number; cells: { fromAzimuth: number; toAzimuth: number; bank: string }[];
  slant: number /* rad from vertical, signed, from wind */; thunder: boolean }

export interface Wind { fromDeg: number; ms: number; gustMs: number
  across: number                     // −1..1, + = moving left → right on screen (camera-aware)
  aloft: { low: number; mid: number; high: number } }   // m/s at each cloud level

export interface TerrainPlanes { near: Plane; far: Plane; back?: Plane; floorY: number; seaY: number
  sightAt?: (x: number) => Sight; seenAt?: SceneTerrain['seenAt']; groundAt?: SceneTerrain['groundAt'] }
export interface Plane { points: Pt[]; elevations?: number[]; distanceKm: number[] }

export interface WaterState { spans: WaterSpan[]; glints: Glint[]; coastalSea: CoastalSea | null }
export interface Night { litShare: number; starsThrough: number /* 0..1 clear share */; aviation: boolean }
```

Where each part comes from (moved, not rewritten, where the code is already pure):

| Part | Built from |
|---|---|
| bodies | `astro/sun.ts`, `astro/moon.ts`, `ui/scene/sunPath.ts`, `moonPath.ts`, `moonShape.ts`, `visibleSun.ts`, `skyProjection.ts` |
| light | `ui/scene/sceneLight.ts` (air mass, aerosol), `ridgeLightTone.ts`, `ridgeLighting.ts`, `moonlight.ts`, `afterglow.ts`, `sceneModel.ts` (twilight); the logic of the hooks `useRidgeLighting`, `useSceneSun`, `useMoonlight` becomes pure functions |
| air | `atmo/mapAir.ts` (haze part), `atmo/airInput.ts`, `data/city/plainHaze.ts`, `theme/skyAir.ts` |
| clouds | new `world/clouds.ts`: forecast layers + `domain/cloudSightings.ts` (seen clouds become banks with `seen: true`) |
| rain, snow, wind | new `world/rain.ts`, `world/wind.ts`; `atmo/mapAir.ts` (wind u, gusts, thunder), `ui/scene/snowLine.ts`, `domain/rainNowcast.ts` for "rain now" |
| terrain, water | `data/terrain/*` (`terrainFromPanorama`, `sightProfile`, `visibility`), `data/water/*` |
| place3, marks | `data/landmarks/portrait.ts`, `markProjection.ts`, `coverMarks.ts`, `placeMarks.ts`, `settlement.ts` (style, roofs); `data/city/outsideView.ts` (B) |
| night | `atmo/life/mapMarks.ts` (litShare, aviation), cloud cover |

**Data the forecast does not give yet** (done in C0, see §6). `HourPoint` (`domain/types.ts`) gains `cloudLow`,
`cloudMid`, `cloudHigh` (already asked, now mapped), `windDirection` (the two models blended round the circle,
`blendDirection`), `visibility` and `windAloft` (850 / 700 / 300 hPa: low, mid, high cloud; owner decision 3). The
Worker's allowlist lists the new hourly fields (`worker/src/routes.ts`), but the app asks for them only once the deployed
Worker serves them (`ASK_SCENE_HOURLY` in `request.ts`, false until the README check answers 200). Fixture:
`src/test/fixtures/forecast-layers-2026-11-17.json`, a **synthetic** copy of the recorded one with the new fields and a
rain spell (its `_synthetic` note says what was added); the old fixture stays for the SVG baseline. Missing values fall
back, and `WorldState.sources` marks every fallback: layers from `thickCloud` and the cover (`'thickCloud'`) or the
cover alone (`'cover'`); direction from `current.windDirection`; visibility from now's, else from humidity
(`visibilityFromHumidity`); wind aloft from the 10 m wind (×1.4 low, ×2 mid, ×3 high, same direction, `'derived'`).

**Coherence checks live in the world.** One `Light` for every face and shadow; one `Wind` for rain slant, cloud drift,
tree lean, smoke, glint wave slope (`glint.ts` takes `wind.ms` instead of its fixed 5 m/s); rain only with a `rains`
layer over it; stars scaled by `night.starsThrough`.

### 1b. Scene model (`src/scene/model/`)

`sceneModel(world: WorldState, box: SceneBox): SceneModel`. Pure: no canvas, no DOM; runs in vitest under node.

```ts
// src/scene/model/types.ts
export interface SceneBox { width: number; skyHeight: number; landTop: number; landHeight: number; dpr: number }
export interface SceneModel { layers: LayerDesc[]; overlay: OverlayItem[]; clear: Box[] /* text and dot zones */ }

interface LayerBase { id: LayerId; surface: 'sky' | 'land'; z: number; key: string; bounds: Box; animated?: AnimSpec }
export type LayerDesc =
  | LayerBase & { kind: 'sky'; stops: [number, RGB][]; glow: Glow[]; band: Band }
  | LayerBase & { kind: 'stars'; stars: Star[]; through: number }
  | LayerBase & { kind: 'bodies'; sun: Disc | null; moon: MoonDisc | null }
  | LayerBase & { kind: 'clouds'; level: CloudLayer['level']; banks: BankDesc[] }        // animated: drift
  | LayerBase & { kind: 'plane'; plane: 'back' | 'far' | 'near'; outline: Pt[]; fill: RGB;
                  faces: Face[]; gullies: Path[]; terraces: Path[]; scrub: Dot[]; snow?: Pt[]; grain: Grain }
  | LayerBase & { kind: 'water'; bands: WaterBand[]; glint: GlintPath | null; datum: Line | null }  // animated: shimmer
  | LayerBase & { kind: 'farCities'; lights: Dot[]; blocks: Rect[] }
  | LayerBase & { kind: 'portrait'; items: PortraitItem[] }      // houses, roofs, trees, cypresses, back to front
  | LayerBase & { kind: 'outside'; mass: Pt[]; spires: Spire[]; glyphs: GlyphDesc[]; sea: Pt[] | null }
  | LayerBase & { kind: 'marks'; glyphs: GlyphDesc[] }
  | LayerBase & { kind: 'weather'; rain: RainField | null; shafts: Shaft[]; mist: MistBand[]; flash: number } // animated
  | LayerBase & { kind: 'loading'; mode: 'mist' | 'ridge' | 'both'; ridge: Pt[] }                          // animated

export interface GlyphDesc { kind: MarkKind | IconKind; x: number; base: number; h: number; seed: number
  litSide: 'left' | 'right' | null; tones: Tones /* lit, shade, body, open, roof after light and haze */
  windows: number /* lit windows by night */; lean: number; famous: boolean }
export type OverlayItem =
  | { kind: 'height'; text: string; x: number; y: number; below: boolean }
  | { kind: 'datum' | 'water'; text: string; x: number; y: number }
  | { kind: 'dot'; x: number; y: number }
```

Files: `sky.ts`, `stars.ts`, `bodies.ts`, `clouds.ts`, `planes.ts` (back/far/near + ridge modelling from
`styleRich.ts` `crestLight`/`model`), `water.ts`, `farCities.ts`, `portrait.ts`, `outside.ts`, `marks.ts`,
`weather.ts`, `loading.ts`, `layout.ts` (the text clearances and label placement of `ui/scene/marks/sceneLayout.ts`,
`plainLabels.ts`, `data/terrain/sceneNotes.ts`), `keys.ts`, `index.ts`.

Coordinates: sky layers in sky px (the `Sky` element's box), land layers in scene px (the figure's box, 375 wide at
the reference width, scaled by `box.width`). One `relief` maps altitude to y for both, offset by `box.landTop`, so
the sun stands on the same line in the sky and behind the ridge.

### 1c. Painters (`src/scene/paint/`)

`paint<Kind>(ctx: CanvasRenderingContext2D, desc, env: PaintEnv): void`, one per layer kind (C1: `env` holds the
`hand`, the `phase`, the device `scale` and `canvas(w, h)` for scratch surfaces, after the anidoodle skill's `Env`). `hand.ts`
holds the enriched hand from `styleRich.ts`/`sceneGlyphs.ts` (`mix`, `css`, `tonesOf`, the grain, the puff bank
shape, the low-frequency ground texture), parameterised by tones from the model, never by moment names. Glyphs:
`paint/glyphs/<kind>.ts` for all 19 `MarkKind`s (8 ported from `sceneGlyphs.ts`: minaret, church, synagogue,
waterTower, chimney, highrise, cooling, castle; 11 new in the same hand from the SVG `generic/*.tsx`: silo, mast,
lighthouse, turbine, bridge, palms, orchard, solar, vineyard, homes, silhouette tower) and `paint/icons/` for the 4
icons (Western Wall, Shrine of the Báb, Azrieli Center, Chords Bridge). Icons take the model's tones like any glyph:
haze and lit side included (SKYLINE.md item 5). A glyph is drawn in glyph space with the sun on the left and mirrored
when `litSide === 'right'`; a glyph with text or asymmetry (Chords Bridge) has a lit-side variant instead.

### 1d. Compositor (`src/scene/compose/`)

- `surface.ts`: two surfaces. **SkySurface**: one canvas in `ui/Sky.tsx` under the text (sky, stars, bodies, clouds,
  weather over the sky area). **LandSurface**: one canvas in the scene figure (planes, water, cities, portrait,
  outside, marks, weather over the land, loading). Each is a stack of layer canvases composited by `drawImage` into
  the visible canvas, in `z` order.
- `layerCache.ts`: one offscreen canvas per layer (`OffscreenCanvas` when present, else a detached canvas), sized to
  `bounds × dpr`. Soft layers (sky, clouds, mist) are cached at `min(dpr, 2)`; land and marks at full `dpr`. Repainted
  only when `desc.key` changes. Keys are hashes of the exact inputs: e.g. the near plane's key is
  `terrain id + box.width + dpr + light (quantised to what changes a pixel: 0.5° azimuth, 1/256 colour) + air + snow +
  wet`. A key never includes `phase`.
- `loop.ts`: one `requestAnimationFrame` loop, running only while a layer has `animated` and the page is visible; 30
  fps cap on animated layers; `prefers-reduced-motion` and save-data draw one still frame. Cloud drift translates the
  cached bank sprites (no repaint); rain and mist repaint their own small layer from a seeded particle field at
  `phase`.
- `schedule.ts`: a cold start paints layers in priority order (sky, far/near planes, portrait/marks, clouds, weather)
  across frames, each slice under 8 ms, so no long task blocks input.
- Scrubbing changes `at` every frame: light-dependent layers are split into a light-free **form** canvas (fills,
  texture; key without light) and a cheap **light** canvas (lit faces, shadows, glints; key with light), so a scrub
  frame repaints only light canvases.

### 1e. React shell and HTML overlay (`src/scene/react/`)

- `useWorld.ts`: `buildWorld` memoised per part, called once in `App.tsx` and passed to both the sky and the scene.
- `SceneCanvas.tsx` (replaces the body of `ValleyScene.tsx`): the figure keeps `role="group"` and its `aria-label`,
  hosts the LandSurface canvas, `SceneOverlay` and `SceneScrubber`.
- `SceneOverlay.tsx`: HTML from `model.overlay`: the height label, the "פני הים" datum note, the water names, the
  village dot (kept HTML: crisp, part of the UI). Same CSS classes as today (`styles.depth`, `seaLabel`, `waterLabel`,
  `village`), positions in % of the figure.
- `SkyCanvas.tsx` inside `ui/Sky.tsx`. The CSS gradient stays under it as the first paint (no flash before the canvas
  is ready). The sky no longer reads the scene from the DOM: `atmo/layout.ts` (`readLayout`, `data-afterglow`,
  `data-cloud-seen`, `[data-sun="up"]`) is replaced by `box.landTop` measured once by a `ResizeObserver`.
- `Life` (birds, meteors, `atmo/life/*`) stays HTML until the switch, then moves into the canvas (owner decision 6); its
  lanes read the model's cloud and ridge heights.

### 1f. The sky: WebGL or canvas — decided (owner, 2026-11-19): canvas; `src/atmo/gl/` goes at C9

- **Coherence.** In WebGL the clouds are a noise field (`cloudShader.ts`) with no positions: they cannot own the rain
  cells, cannot be the banks that hide the stars or veil the moon, and are lit by their own `cloudLight.ts`, not the
  scene's `Light`. In canvas the clouds are `CloudBank`s in the world state: the same objects make the rain shafts,
  gate the stars and dim the direct light on the land.
- **Look.** The chosen hand (v1b) draws clouds as soft puff banks with sun-facing sides lit; that is a 2D painter
  shape, not a shader field. One hand for sky and land.
- **Performance.** WebGL renders a full-screen fbm field every frame (at 1/3 resolution, `AIR_SCALE`) plus particles,
  for the whole life of the page. Canvas caches each bank as a sprite once per light change and only translates it
  per frame (~0.3 ms for 10–20 banks); rain is ≤ 400 short strokes on its own layer (~1–2 ms at 30 fps). Measured
  numbers decide in stage C6 (below): if the canvas sky misses the budget on the reference phone, the fallback is to
  keep the WebGL particle pass for rain only.
- **Tests and robustness.** 2D canvas is deterministic in headless Chromium; WebGL under SwiftShader is not, and needs
  context-loss handling and the `CssAir` fallback. One compositor, one loop, one set of tests.
- **Cost.** The animated fbm texture, heat shimmer and in-cloud lightning are redone as canvas layers (shimmer as a
  small per-frame displacement of the horizon band, C7; lightning as a flash alpha on the cloud layer, C6), so nothing
  is lost (owner: rebuild them, do not drop them).

---

## 2. Module layout and fate of existing modules

```
src/world/        types.ts world.ts bodies.ts light.ts air.ts clouds.ts rain.ts wind.ts night.ts terrain.ts
                  water.ts place.ts keys.ts  (+ *.test.ts)
src/scene/model/  types.ts index.ts sky.ts stars.ts bodies.ts clouds.ts planes.ts water.ts farCities.ts
                  portrait.ts outside.ts marks.ts weather.ts loading.ts layout.ts keys.ts  (+ *.test.ts)
src/scene/paint/  hand.ts sky.ts stars.ts bodies.ts clouds.ts planes.ts water.ts farCities.ts portrait.ts
                  outside.ts marks.ts weather.ts loading.ts glyphs/<kind>.ts icons/<icon>.ts
src/scene/compose/ surface.ts layerCache.ts loop.ts schedule.ts stats.ts
src/scene/react/  useWorld.ts SceneCanvas.tsx SkyCanvas.tsx SceneOverlay.tsx useSurface.ts
src/dev/          sceneHarness.tsx (+ scene.html at the root, like specimen.html)
e2e/              scene.pixels.spec.ts scene.perf.spec.ts  __pixels__/<place>-<moment>.png
playwright.config.ts
```

**Reused as is** (pure, already tested): `domain/camera.ts`; `astro/*`; `data/terrain/*` except the drawn stand-in
paths; `data/water/*` (`glint.ts` takes the world's wind); `data/landmarks/` `fame`, `rank`, `shortlist`, `filters`,
`overpass`, `israelData`, `project`, `seat`, `portrait`, `markProjection`, `coverMarks`, `placeMarks`, `curated`
(icons list only), `useLandmarks`; `data/city/` `outsideView` (promoted from study to rule), `cityRaster`,
`cityTowers`, `towers`, `grid`, `clusters`, `clusterCache`, `clusterStats`, `homeCluster`, `cityData`, `cityHeight`,
`useCity`, far cities (`farData`, `farGrid`, `plainData`, `plainLights`, `plainHaze`); `atmo/airInput.ts`,
`atmo/life/*`; `domain/cloudSightings.ts`, `rainNowcast.ts`.

**Moved into `src/world/`** (pure already; tests move with them): `ui/scene/` `sunPath`, `moonPath`, `moonShape`,
`visibleSun`, `skyProjection`, `skyline`, `sceneLight`, `ridgeLightTone`, `ridgeLighting`, `moonlight`, `afterglow`,
`waterLight`, `snowLine`, `seaLine`, `shadowRuns`, `cloudSeen`, `sceneBox`, `sceneModel` (twilight); the haze/wind parts of
`atmo/mapAir.ts`. Done in C0, with two departures: `sceneModel.ts` is now `world/twilight.ts` (the name clashed with
`scene/model`), and `atmo/mapParts.ts` (`haze`, `heat`, `rainRate`, `visibilityKm`) stays where it is, the world
importing it, until C9 deletes the WebGL air and moves what is left into `world/air.ts`. `data/city/villageStyle.ts`
(`clusterStyle`, `clusterRoofs`) holds the roof-evidence rule the world uses (`world/place.ts`): it moves next to
`settlement.ts` before C9 deletes the stand-in machinery, not with it.

**Rewritten**: `ui/scene/marks/hillScene.ts` (→ `scene/model/portrait.ts`, `outside.ts`, `marks.ts`),
`sceneLayout.ts`, `markBox.ts`, `homeMode.ts`, `hillPlane.ts`, `plainLabels.ts` (→ `model/layout.ts`); the hooks
`useRidgeLighting`, `useSceneSun`, `useMoonlight` (→ pure `world/light.ts`); `ValleyScene.tsx` (→ `SceneCanvas.tsx`);
`ui/Sky.tsx` (hosts `SkyCanvas`); `data/landmarks/settlement.ts` (keeps style and roof rules; its row composition is
redone in the hand's contour rows in `model/portrait.ts`).

**Deleted at the switch (stage C9)**:
- SVG scene: `ui/scene/` `FarLand.tsx`, `NearLand.tsx`, `RidgeLight.tsx`, `FloorShadow.tsx`, `Shimmer.tsx`,
  `SnowCap.tsx`+`.module.css`, `Sun.tsx`, `Moon.tsx`+`.module.css`, `Water.tsx`, `waterPaths.ts`, most of
  `ValleyScene.module.css`; `marks/` `HillMarks.tsx`, `LightRig.tsx`,
  `MarkBuilding.tsx`, `SettlementGlyph.tsx`, `blocks.tsx`, `houses.tsx`, `useMarkMotion.ts`, `marks.module.css`,
  `generic/*` (`buildings`, `fields`, `industry`, `nature`, `parts`, `shadow`, `structures`, `geometry`,
  `buildingSpecs` once the painters own the sizes), `curated/*.tsx` + `index.ts`, `city/` `CityMass.tsx`,
  `CityTowers.tsx`, `FarCity.tsx`, `OutsideSkyline.tsx`, `Skyline.tsx`, `massPath.ts`, `plainPaths.ts`,
  `skylineLights.ts`, `skylinePaths.ts`.
- The true-skyline slabs replaced by variant B: `data/city/skylineData.ts` (its "is this a city" test moves into
  `portrait.ts`), `skylineTowers.ts`, `skylineRay.ts` (its reach test moves to `outsideView.ts` for the towers
  beyond the frame); `skylineHeight.ts` stays (`outsideView.ts` uses it);
  `outsideView.ts`'s variants A and C and `skylineVariantFlag`.
- WebGL sky: `atmo/gl/*` (renderer, shaders, particles, palette, cloudLight, afterglowLight, fieldUniforms, glUtil),
  `atmo/Atmosphere.tsx`+`.module.css`, `CssAir.tsx`+`.module.css`, `useAirLoop.ts`, `layout.ts`, `mapParts.ts`,
  `motion.ts` (what `mapAir` still needs moves to `world/`).
- Stand-in machinery: `data/city/fabric.ts`, `neighbours.ts`, `neighbourOcclusion.ts`, `columns.ts` (its few shared
  helpers, `cityOffset`/`depthRow`, move to `grid.ts`; the column band and `CityColumns` go once `towers`, `farData`,
  `clusterStats` read the raster and grid directly), `villageStyle.ts` (used only by `neighbours.ts`, `homeMode.ts`);
  `data/landmarks/settlementPlan.ts`, `villageForms.ts`, `villageExtent.ts`, `terraces.ts` (its one user,
  `settlement.ts`, loses row composition; the hand draws terraces on the ridge); the drawn valleys in `data/terrain/terrain.ts` (`SHADMOT`, `GENERIC`, `*_DRAWN` paths) and
  `profile.ts`'s `gentleHillsPath`/`mirrorPath`, replaced by the loading layer.
- Flags: `?scene=flat` (`ui/sceneFlag.ts`, `SCENE_25D`), `?skyline=a|b|c`, `?canvas` (after the switch).
- Tests that only cover deleted code: `sceneBaseline.test.ts` and `__snapshots__/baseline/*`, `hillScene.test.ts`
  and its snapshot, `settlementPlan.test.ts` and its snapshot, the tests of each deleted module.

---

## 3. Determinism and testing

**Determinism.** Randomness only from `seeded(hashId(...))`; ids are stable (place id, mark id, bank index). The clock
enters only as `world.at` and, for animated layers, `phase` seconds passed by the loop. `src/scene/purity.test.ts`
greps `src/world`, `src/scene/model`, `src/scene/paint` for `Math.random`, `Date.now`, an argument-less `new Date()`,
`performance.now`, `document`, `window` and fails on any hit. (A `Date` made from a given instant, as the moved
`sunPath`/`moonPath` do, is a value, not the clock: allowed.)

**Tier 1, world and model unit tests (vitest, node, fast).** Structural assertions over the 8 baseline places
(`test/scenePlaces.ts`) × fixed moments:
- *Light:* `light.side` equals the side of `xOf(sun.azimuth)`; every `GlyphDesc.litSide`, house face and ridge face
  is lit on that side; shadow `dx` points away from it; overcast (`direct < 0.2`) gives `shadow.softness = 1`; at night
  with the moon up the source is `moon` and the colour is cool and dim.
- *Air:* plane tone moves monotonically toward `air.haze` with distance; lower visibility fades faster.
- *Clouds/rain:* no `RainField` and no shafts when no layer `rains`; every shaft lies under a bank of a raining layer;
  rain cells are at their true azimuths; stars count scales with `starsThrough` and is 0 under full cover.
- *Wind:* one sign everywhere: rain slant, cloud drift, tree/smoke lean and glint wave share `sign(wind.across)`;
  drift grows with level (low < mid < high).
- *Layout:* the dot keeps its clearing (no portrait item within `DOT_R + 1`); no glyph, house or label overlaps
  `model.clear` (text boxes: height label, datum, water names); every mark base lies on its ridge (`|base − ground(x)|
  ≤ 1 px`); portrait density falls off from the dot outward (houses per 10 px slot non-increasing with distance).
- *Truth:* water spans and glint at their bearings; east of the place drawn left; outside view: a tower ≥ 150 m or
  famous is a glyph, the rest fold or spire per B; the coastal sea runs from the coast to the frame edge.
- *Model snapshot:* `sceneModel` output for each place × moment, numbers rounded to 0.1, as a vitest snapshot: the
  exact regression net that replaces the SVG baseline for review in diffs.

**Tier 2, pixel tests (Playwright, headless Chromium).** Playwright 1.63 is installed (`/opt/node22/bin/playwright`),
browsers in `/opt/pw-browsers` (`chromium-1243`). Add `@playwright/test@1.63.0` as a dev dependency and
`playwright.config.ts` (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, one project: chromium, 375 × 812, dpr 2,
`--disable-gpu`, `--force-color-profile=srgb`, `--font-render-hinting=none`). The harness `scene.html` →
`src/dev/sceneHarness.tsx` loads the same fixtures as the SVG baseline (panoramas, `public/data/land/water.json`,
landmark and city data, the forecast fixture) from `?place=&at=&weather=&phase=0`, renders the canvas scene only
(no UI text), and sets `window.__sceneReady`. Moments: 8 places × 4 hours (06:20, 12:00, 16:30, 21:00) plus weather
moments (rain with wind, overcast, clear night with moon, dust, snow) at Haifa, Jerusalem and Tiberias: ~47 stills.
Comparison: per-pixel YIQ threshold 0.1, fail above 0.3 % differing pixels or any 16 × 16 tile above 5 %.
References in `e2e/__pixels__/` at dpr 1 (~60 kB each, ~3 MB), plus 6 at dpr 2 for crispness. A change in a
reference is reviewed by its still, as today. Scripts: `npm run test:pixels`, `npm run test:pixels -- --update`.

**Performance budget** (reference: a mid-range phone, e.g. Pixel 6a / Galaxy A54 class, dpr 2.6–2.75; proxied in
CI by Chromium with CPU throttling ×4):

| Step | Budget |
|---|---|
| `buildWorld` (cold, all parts) | ≤ 15 ms |
| `sceneModel` | ≤ 10 ms |
| first full paint, all layers | ≤ 60 ms total, sliced ≤ 8 ms per frame |
| scrub frame (light canvases only) | ≤ 10 ms |
| animated frame (drift, rain, mist) | ≤ 4 ms at 30 fps |
| canvas backing memory | ≤ 48 MB |

Measuring: `compose/stats.ts` wraps each step in `performance.mark/measure` and exposes `window.__sceneStats`
(per-layer paint ms, cache hits, memory). `e2e/scene.perf.spec.ts` sets CDP `Emulation.setCPUThrottlingRate(4)`,
runs cold load, 60 scrub frames and 10 s of rain, prints p50/p95 and fails above 1.5 × budget. On the real phone:
`?perf=1` shows a small HUD with the same stats; Chrome remote debugging (Performance panel) for traces. Numbers are
recorded in `qa/canvas/perf.md` at each stage.

---

## 4. Stages

Every commit keeps the app working. The canvas scene lives behind `?canvas=1` (`ui/devParams.ts`) and grows layer by
layer; without the flag the app shows the SVG scene, frozen: **the SVG baseline stays byte-identical from C0 to C8**
(no improvements go into the SVG). Each stage ships stills to `qa/canvas/<stage>/`: the 8 places × 4 hours, canvas
next to SVG, plus the stage's own moments. Sizes are relative (S = 1, M = 2–3, L = 4–5, XL = 6–8).

**C0. Data contracts and the world state — M (3).**
**Done 2026-11-19** (§6). `HourPoint` gains `cloudLow/Mid/High`, `windDirection`, `visibility`, `windAloft` (Worker
allowlist first); new fixture.
`src/world/` built from the moved pure modules; `useWorld` in `App.tsx`, feeding nothing visible yet.
*Accept:* world tests green (light side, wind sign, no rain without cloud); SVG baseline byte-identical; tests of moved
modules pass unchanged.

**C1. Canvas infrastructure — M (4).**
**Done 2026-11-19** (§6).
`scene/model/types.ts`, compositor (surfaces, layer cache, loop, schedule, stats), `SceneCanvas` + `SceneOverlay`
behind `?canvas=1`, harness page, Playwright config, purity test, perf spec. First layers flat: the planes as single
fills, overlay labels placed from the model.
*Accept:* 8 places render in the harness; overlay positions equal today's `hillScene` label/notes (test); pixel and
perf runners green; a cache-hit test (unchanged key → no repaint).

**C2. Land: planes and the near ridge in the enriched hand — L (5).**
Back/far/near planes with aerial perspective from `air`; on the near ridge: lit faces by `light`, gullies, terraces on
the lower slopes, scrub drifts, ground texture; ridge shadow and floor shadow; snow caps (`snowEdge`); wet ground.
Form/light split for scrubbing.
*Accept:* lit side = sun side in all 32 stills; far planes fade with visibility (a 5 km vs 40 km still pair); scrub
frame within budget; owner review of the hand against `qa/styles/v1b/`.

**C3. Water, haze, far cities — M (3).**
Water bands from `WaterSpan`s, glint path under sun or moon with the world's wind, the "פני הים" datum and water names
in the overlay; horizon band; far cities with their lights.
*Accept:* Tiberias, Ein Gedi, Haifa water at the same bearings as stage 3 stills; glint gone at noon, strong at 07:30;
no water at Tel Aviv, Jerusalem, Rosh Pina, Shadmot.

**C4. Glyphs, landmarks and the village portrait — XL (8).**
First the glyph library (owner's "landmarks first"): 19 kinds + 4 icons in `paint/glyphs`, `paint/icons`, with a
glyph sheet still (`qa/canvas/c4/glyphs.png`) like `qa/glyphs/sheet-v1.png`. Then marks on the ridge (`model/marks.ts`)
and the village portrait in contour rows (streets as gaps, roofs by evidence or mixed, trees and cypresses between,
dense at the dot, thinning at the edge), lit windows by `night.litShare`, tree lean by wind.
*Accept:* layout tests (dot clearing, nothing under text, bases on ridge, density falloff, side rule); Shadmot, Rosh
Pina, Ein Gedi reviewed with the owner; icons take haze and lit side.

**C5. Cities from outside: variant B and its open items — L (5).**
`model/outside.ts` from `outsideView.ts` (B only): built squares as one jagged mass at real heights, towers fold or rise
as spires (A's slot budget if spires crowd), famous / ≥ 150 m as full glyphs. Open items: (1) **coastal sea** for every
coastal place seen from outside (Tel Aviv and Netanya among them), from the coast to the frame edge at the place's depth (`WaterState.coastalSea`, from the water mask,
which the world loads for every place); (2) **rows climb slopes**: for every place seen from outside, depth may lift
rows up a slope the place stands on, not only along the crest (a general rule in `outsideProject`, from the ground's
height under each row; owner: yes, as a rule, not a Haifa case); (3) **towers beyond the frame** (5–6 km or
outside the home cluster) with the same levels of detail (Eshkol Tower as a glyph, not a stick); (4) **icons** take the
same haze and lit side (falls out of C4's painters); (5) **when an industrial structure is a landmark**: a general rule in the
landmarks build (`scripts/landmarks/`) for every chimney, cooling tower, silo or mast: it counts as a landmark (and
takes a name) only from its own data (a name that is a name, not an operator, a status or a construction note such as
"לבניה"; fame; height), never by a per-object fix; (6) **the frame is the place's own boundary**: the outside view's
frame is cut at the place's boundary from data (its municipal / locality boundary where mapped, else the Voronoi cell of
the place points round it) rather than at its contiguous built-up cluster, so a city grown into its neighbours (Gush
Dan) shows only itself; one rule for all places.
*Accept:* SKYLINE.md's B counts reproduced (Tel Aviv 10 / 54 / 237, Haifa 6 / 9 / 90 …) by a test; stills of the six
skyline cities at 11:00 and 16:30; Eshkol Tower drawn as a glyph from Hadar.

**C6. Sky, bodies, stars, clouds — L (5).**
`SkyCanvas` in `ui/Sky.tsx` under the flag: gradient from `theme/skyLight.ts` (contrast tests keep their colours),
glow, afterglow, horizon band; sun and moon discs (phase, veil by cloud); stars only through clear sky; cloud banks by
layer, lit undersides at low sun, drifting with the wind at their height; seen clouds (satellite) as banks; thunder
flash. With the flag, `Atmosphere` is not mounted.
*Accept:* stars 0 under full cover; drift direction = wind; perf: animated frame ≤ 4 ms throttled; sky-vs-WebGL
stills at golden, noon, night, overcast; the in-cloud lightning rebuilt as a flash on the cloud layer (WebGL is
dropped: owner decision 1).

**C7. Weather — M (4).**
Rain from the raining banks only, slanted by wind, shafts at their true azimuths (over the right ridge), the ground
darkening and shining after it; snow fall; mist (`life.mist`) as a drifting band between planes; dust tint; smoke and
tree lean; water ruffle. Reduced motion: one still frame.
*Accept:* rain/wind tests; stills of the v1b rain moment rebuilt from data (Haifa, rain, wind from the west).

**C8. Loading as an animation — S (2).**
`model/loading.ts` + `paint/loading.ts`: while the panorama loads, mist drifting with a faint ridge line forming in it
(a stroke that grows from the place's direction outward); the real planes cross-fade in when they arrive. Offline with
no land data ever: quiet mist (owner decision 2). The drawn stand-ins are no longer used by the canvas path.
*Accept:* no layout jump when the land arrives; ≤ 4 ms per frame; a short clip for the owner.

**C9. Parity, switch, delete — M (3).**
All pixel references reviewed by the owner (stills sheet per place); perf within budget on the reference phone and in
CI; canvas becomes the default (`?svg=1` kept one release as the way out); then the deletions listed in §2 in their
own commits (SVG scene, WebGL sky, stand-in machinery, flags, SVG snapshots).
*Accept:* `npm test`, `npm run typecheck`, `npm run lint`, `npm run test:pixels` green; no import of a deleted module;
bundle smaller than before (record the size).

Total ≈ 42 units; C4 and C5 are the bulk. The enriched drawing lands layer by layer (C2–C8), not as a later pass;
C9 includes a last tuning pass on the phone. After C9, the agreed order in `TRUE-SCENE-PLAN.md` continues on the new
pipeline (land colour by season, vegetation from WorldCover, rain edge marks).

---

## 5. Risks and open questions

**Risks.**
- Scrubbing relights the land every frame; mitigated by the form/light split, but the near ridge's lit faces and
  the portrait's faces may still exceed 10 ms at dpr 2.75. Fallback: cap the light canvases at dpr 2 while scrubbing.
- Canvas memory at dpr 3 (a full-screen layer is ~11 MB); layers are cut to their bounds and soft ones capped at dpr 2.
- Pixel references depend on the Chromium build; pin `chromium-1243` and re-record on upgrade only.
- 19 glyph kinds + 4 icons + portrait in the new hand is the largest piece (C4); the SVG generic glyphs are the
  reference for sizes and silhouettes.
- New hourly fields need the Worker deployed first; until then fallbacks drive clouds, wind and visibility (less true,
  marked in `WorldState.sources`).

**Owner decisions (2026-11-19)**, answering the open questions:
1. **Sky:** moves to canvas; `src/atmo/gl/` is deleted at C9, but its in-cloud lightning (C6) and heat shimmer (C7)
   are rebuilt in canvas, so nothing is lost.
2. **Loading (C8):** mist with a faint ridge line forming in it; offline with no land data ever: quiet mist.
3. **Cloud drift:** the forecast's wind at cloud height (850 / 700 / 300 hPa, a Worker change: in the repo, not
   deployed, see §6); until it arrives, derived from the 10 m wind as a marked fallback.
4. **Rows climb slopes:** in the outside view, a place's rows may climb the slope it stands on (Haifa's Carmel face is
   one case of it): a general rule, not a Haifa case (C5 item 2).
5. **Frame at the place's own boundary:** the outside view's frame is cut at the place's boundary from data (municipal
   / locality boundary, or the Voronoi cell of the place points), not at its contiguous built-up area (Ramat Gan is one
   case of it): a general rule (C5 item 6).
6. **Birds and meteors** (`atmo/life`): stay HTML now; move into the canvas after the switch (after C9).

**Owner decisions (2026-11-19, at C1):**
7. **Drawing with the anidoodle skill.** All drawing work in this rebuild uses the anidoodle skill (base
   `/root/.claude/plugins/cache/alexgreensh-anidoodle/anidoodle/0.10.1/skills/anidoodle`: `SKILL.md`,
   `references/craft-bar.md`, `references/realism-and-craft.md`, `references/determinism-and-contract.md`,
   `references/working-method.md`, `references/styles.md`, `references/workflows/site-art.md`, and the engine's
   `engine/src/canvas-core` helpers); the prototype (`prototypes/canvas-scene/`) was made with it. **Every drawing stage
   (C2–C8) reads those references first and runs the craft-bar detail pass on 2× crops of its stills before review.**
   Painters follow the skill's contract (C1 built the interface and the test for it, §6): a painter is pure in its
   inputs (`desc`, `env`), randomness only seeded, no clock (time is `phase`), no DOM, no `ctx.filter`, no surface or
   image made by the painter (scratch surfaces come from `env.canvas()`), caches keyed by everything their pixels
   depend on, a cached bitmap never scaled up.
   *Helpers to port* from `engine/src/canvas-core/core.ts` into `scene/paint/hand.ts` (or `paint/core.ts`) at C2, as the
   prototype uses them: `rng` (or keep `data/landmarks/hash.ts` `seeded`, one generator for the world and the paint),
   `fractal` (seeded, tileable gradient noise: ground texture, grain, cloud puffs), `sample` (resampling a polyline:
   ridges, gullies), `jitter` and `displace` (the hand's wobble on edges), `oval`/`softBox` (puffs, tree crowns),
   `line`/`tube` (strokes with a bow or a width: gullies, terraces, rain shafts). The film machinery (cues, score, Gfx,
   probe) is not ported.
8. **Deploys are the owner's.** Server and Worker deploys are done by the owner from their own computer (Cloudflare
   access) at the end of the rebuild. No stage deploys; each appends what it needs to "Deploys pending for the owner"
   below.
9. **The shipped WebGL sky's wind direction** (`windU` in `atmo/mapParts.ts`, which still assumes the old mirrored
   view): left as it is; fixed, with the rest of the sky, at C6.

**Deploys pending for the owner** (in order; every later stage appends here instead of deploying):
1. The forecast Worker (`worker/`) with C0's new hourly fields in its allowlist (`wind_direction_10m`, `visibility`,
   wind speed and direction at 850 / 700 / 300 hPa).
2. Then, after the README check answers 200 for the new fields, flip `ASK_SCENE_HOURLY` to `true` in
   `src/data/openMeteo/request.ts` (an app change, shipped with the next release).

**Principle:** as few point fixes as possible: no special handling for particular places, mountains or settlements; the
algorithms must handle every place correctly (see the rules at the top).

---

## 6. Status

**C0 done (2026-11-19).** Commits on `ccr-85ec24f0-9ayxgu`; the shipped app and the SVG baseline are unchanged
(snapshots untouched; production never builds the world: `useWorld` runs only with `?canvas=1`, a dev-only param).
- *Forecast contract:* `HourPoint` gains `cloudLow/Mid/High`, `windDirection` (`blendDirection`: the models' unit
  vectors averaged), `visibility`, `windAloft` (850 / 700 / 300 hPa). The repo's Worker allowlist lists
  `wind_direction_10m`, `visibility`, `wind_speed_/wind_direction_` at `850hPa`, `700hPa`, `300hPa`; the app asks for
  them only when `ASK_SCENE_HOURLY` (`data/openMeteo/request.ts`) is flipped, after the Worker is deployed and the
  README check answers 200. **Not deployed**: until then the world runs on the marked fallbacks. A contract test checks
  the app's query with the new fields passes the repo's Worker.
- *Moved:* the pure sky and light modules from `ui/scene/` into `src/world/` (§2), tests unchanged but for paths.
- *World:* `src/world/` `types.ts`, `world.ts` (`buildWorld`, `makeWorldBuilder` keeping terrain, place and marks
  while their inputs are the same objects), `bodies.ts`, `light.ts`, `air.ts`, `clouds.ts`, `rain.ts`, `wind.ts`,
  `night.ts`, `terrain.ts`, `water.ts`, `place.ts`, `keys.ts`; `src/scene/react/useWorld.ts`, called in `App.tsx` under
  `?canvas=1` (the world is left on `window.__world` for inspection).
- *Decisions where the plan was vague:*
  - `WorldState` adds `preview` and `sources` (every fallback marked: cloud layers, a cloud raised for rain, wind
    direction, wind aloft, visibility). `Light` adds `ray` (the ridge lighting's direction), `noonWeight`, `rimX`,
    `glow` and `palette` (the sky tones the moved `ridgeLightTone` mixes from), so C2 can reuse the SVG's tone rules.
    `Wind` adds `towardDeg` and `aloftAcross` (the wind aloft may turn). `Body` x/y are where the SVG draws the disc.
  - **Wind across is camera-aware** (`lateral` of where the wind goes): a westerly moves right → left in the true
    (un-mirrored) view. The WebGL air's `windU` still assumes the old mirrored view (a westerly moves left → right);
    it is frozen with the rest of the shipped scene and goes at C9.
  - **Cloud layers:** the forecast's three layers scaled so together (independent layers) they make the shown cover
    (the satellite may have corrected now's); fallback: low and mid split the thick cloud evenly, high takes the rest.
    Banks are seeded by place, level and index only (never the hour), round the whole horizon, spread by the golden
    angle so a growing cover fills the sky evenly; low cloud's base from the dew point (LCL, 300–2500 m).
  - **Rain:** the forecast's rain is the truth. It falls from the low layer when that has ≥ 30 %, else the mid; when
    neither has, the low layer is raised to 60 % (`sources.rainCloudRaised`). Cells are the raining layer's banks.
  - **Light:** the sun when over the land in its own direction with ≥ 8 % through the haze, its direct share dimmed by
    the cloud in front (low 95 %, mid 85 %, high 30 % blocking, as expected values); under 5 % direct it is `sky` (no
    side, softness 1). Moon when its strength (`moonlightStrength`) is ≥ 0.05. Shadow softness 1 below 20 % direct.
  - **Air:** visibility from the picked hour, else now's, else humidity (`40 × 10^−((RH−50)/50)^1.5` km), dust folded
    in; `fade(km) = 1 − exp(−3.912 km / V)`.
  - **Place:** a place is seen from outside (variant B) when `seenFromOutside` (moved out of `hillScene`, unchanged):
    its homes read as a large town or 8+ towers stand within its reach; else a portrait with roofs by evidence. The
    marks still come from `hillScene` (variant `b` or none) until C4–C5 rewrite it.
  - **Ground wet:** the shown hour's rain and the three hours before it, fading by a quarter an hour.
  - `buildWorld` cold costs 6–90 ms under node (the marks, as in the SVG scene; Tel Aviv the most); a change of hour
    with the builder ~2 ms. The 15 ms budget is for the world without the marks rewrite; to recheck at C4.
- *Tests:* `src/world/world.test.ts` (35, the 8 baseline places): sun and moon, light side and shadow direction at 4
  hours, overcast, moonlight; air fade and visibility sources; cloud layers and fallbacks, no rain without a raining
  layer, rain cells under raining banks, a cloud raised for rain; one wind sign for rain slant and drift, drift growing
  with height, forecast wind aloft, glint with wind speed; lit share, darkness, stars through clear sky; portrait vs
  outside view, east drawn left of the dot, water in view, ground wetness; part memoisation and stable keys.
  `src/data/openMeteo/sceneHours.test.ts`: direction blending, the gated request, mapping the new fields.

**C1 done (2026-11-19).** Commit on `ccr-85ec24f0-9ayxgu`; the shipped app and the SVG baseline are unchanged (snapshots
untouched; `SceneCanvas` replaces `ValleyScene` only under `?canvas=1`, a dev-only param; the harness page is dev-only
and not a build input).
- *Model* (`src/scene/model/`): `types.ts` (every layer kind of §1b declared; shapes drawn from C2 on are placeholders
  the drawing stage refines), `sky.ts` (gradient from the light's palette, horizon at the land's eye level + `landTop`),
  `planes.ts` (back / far / near as flat fills: the form keyed by terrain and box only, the tone after light and haze as
  the light part; C1 keeps the SVG's tone rule, a ridge tone paled by the plane's fade), `layout.ts` (overlay and clear
  zones), `keys.ts`, `tone.ts` (hex → RGB, Oklab mix), `index.ts` (`sceneModel`, `layersOn`).
- *Painters* (`src/scene/paint/`): `hand.ts` (`Hand`, `PaintEnv`, `css`, `mix`, `outline`), `sky.ts`, `planes.ts`
  (`paintPlane` form, `paintPlaneLight` light, clipped to the outline), `index.ts` (registry: form and optional light
  painter per kind; kinds without one are skipped).
- *Compositor* (`src/scene/compose/`): `layerCache.ts` (one offscreen canvas per layer, `OffscreenCanvas` or a detached
  canvas through an injectable factory; repaint only on a key change; a layer's key + its ratio + its bounds is what the
  canvas holds), `surface.ts` (visible canvas at dpr, z-ordered 1:1 blits), `schedule.ts` (cold start in priority
  order, ≤ 8 ms slices, composite after each), `loop.ts` (one rAF loop, only with an animated layer and a visible page,
  30 fps cap, one still frame under reduced motion / save-data, phase in seconds from its start), `stats.ts`
  (`performance.mark/measure`, samples for p50/p95, per-layer paints and hits, memory; `window.__sceneStats`).
- *Scrub split:* a light-dependent layer has a form canvas (key without light) and a light canvas (`desc.light.key`);
  a change of light repaints the light canvas only, laid over the form at composite time with `light.blend` (C1
  `source-over`; C2 may `multiply`). The light painter keeps inside the form's shape itself (clip to the outline), so
  nothing is recombined per frame; a new form repaints its light too. Measured: a scrub repaints `plane.far:light`,
  `plane.near:light` and the sky; the land forms never.
- *React* (`src/scene/react/`): `useSurface.ts` (surface per canvas, cold start sliced, warm frames synchronous, the
  loop), `SceneCanvas.tsx` (the figure with its role and spoken label, the LandSurface, the overlay, the scrubber and
  the readout; `?perf=1` shows `PerfHud.tsx`), `SceneOverlay.tsx` (the dot, height label, datum and water notes in the
  SVG scene's classes; x in % of the figure), `SkyCanvas.tsx` (the SkySurface: in the harness until C6 mounts it in
  `ui/Sky.tsx`), `sceneLabel.ts`. App renders `SceneCanvas` instead of `ValleyScene` when the world exists
  (`?canvas=1`); the WebGL sky stays until C6.
- *World:* gains `labels` (the height label's text and spot, the notes on the land) from the same `hillScene` call
  that gives the marks (C4 moves the layout into `model/layout.ts`); `keys.place` covers them.
- *Harness:* `scene.html` → `src/dev/scene.tsx` → `src/dev/sceneHarness.tsx`: `?place=&at=&weather=&phase=0
  [&overlay=1]`; the baseline places' recorded panoramas, the bundled water, landmark and city data, and the forecast
  from the app's own request (`forecastUrl`), which the runners answer with `forecast-layers-2026-11-17.json` by route
  interception (every other off-server request is refused: nothing reaches Open-Meteo). One recorded forecast serves
  every place, its height set to the place's own ground (the panorama's `groundM`), as the real answer would give it.
  Weather moments (`clear`, `rain`, `overcast`, `dust`, `snow`) are overrides of the shown air, like `?wx=`. Still:
  375 × 428 (sky 300 px over the 128 px figure). `window.__sceneReady`; `window.__scene.scrub(at)` (one synchronous
  frame, timed).
- *Pixel runner:* `npm run test:pixels [-- --update] [-- --only=<text>]` (`e2e/scene.pixels.mjs`): 53 moments (8
  places × 4 hours, 5 weather moments at Haifa, Jerusalem, Tiberias, 6 at dpr 2), references in `e2e/__pixels__/`
  (1.1 MB); comparison in the browser (YIQ threshold 0.1, fail above 0.3 % of pixels or a 16 × 16 tile above 5 %);
  failures leave the still and a diff in `test-results/pixels/` (ignored). 53/53 in ~45 s, repeat runs 0.000 %.
  Stills for review: `node e2e/scene.stills.mjs <dir> <place>@<HH:MM>[@weather] …` (with the overlay).
- *Perf runner:* `npm run test:perf [-- --place=…] [-- --rate=4] [-- --gpu]` (`e2e/scene.perf.mjs`); numbers in
  `qa/canvas/perf.md`. Green on the gated steps (model, first paint, land scrub frame, memory).
- *Tests:* `src/scene/model/model.test.ts` (overlay = the SVG layout's label, dot and notes for the 8 places, scaled
  with the width; pure output; land form keys unchanged through a scrub, light and sky keys moving; z order, bounds,
  box/dpr in keys), `src/scene/compose/compose.test.ts` (cache hit on an unchanged key, light-only repaint, ratio and
  device-pixel sizing, stats and pruning, sliced cold start under the budget, the loop's cap, phase and still frame),
  `src/scene/purity.test.ts` (the contract scan below). Shared loader `src/test/sceneWorld.ts`.
- *Stills:* `qa/canvas/c1/` haifa-1630, jerusalem-0620, tiberias-1200, ein-gedi-2100 (dpr 2, with the overlay): the
  placeholder (sky gradient, flat far and near planes); the dot, label and notes sit where the SVG scene puts them.
- *Decisions where the plan was vague, and departures:*
  - **No `@playwright/test`, no `playwright.config.ts`**: the runners are plain Node scripts on the preinstalled
    Playwright library (`require('playwright')`, browsers in `/opt/pw-browsers`; nothing installed). Hence
    `e2e/scene.pixels.mjs` / `scene.perf.mjs` (+ `harness.mjs`, `cases.mjs`, `compare.mjs`, `scene.stills.mjs`) instead
    of `.spec.ts`; no traces are recorded. The comparison runs in the browser, so no image library is needed.
  - **Painter signature** `(ctx, desc, env)` (see §1c), for the anidoodle contract (owner decision 7).
  - **Purity scan** (`src/scene/purity.test.ts`) over `src/world`, `src/scene/model`, `src/scene/paint`, comments left
    out: `Math.random`, `Date.now`, an argument-less `new Date()`, `performance.now`, `requestAnimationFrame`,
    `document`, `window`, `navigator`, `localStorage`, `fetch`; in painters also `ctx.filter`, `new OffscreenCanvas` /
    `new Image`, `createElement`. `new Date(instant)` stays allowed (C0's exception).
  - **No soft-layer cap at dpr 2**: every cache is at the device's ratio, in whole device pixels, blitted 1:1. A cached
    bitmap is never scaled up (anidoodle), and a scaled `drawImage` was the slow path (22 ms vs 2 ms for the sky, ×4).
    Memory stays well under budget (12–14 MB at dpr 2.75); a later cap may only scale down.
  - **Overlay x** in % of the figure from the 375 px layout (the world lays out at the reference width, C0); y in px.
  - **App under `?canvas=1`**: the land is canvas, the sky stays the WebGL one until C6 (no sky surface in the app yet).
  - **Perf gates for C1**: the cold world (marks, C4), the world rebuilt per scrub frame, the sky's scrub frame and the
    cold slices are reported, not gated: a full-surface gradient is ~15 ms in software raster ×4 whatever the path, and
    a 2D canvas defers raster to the first blit, so a slice holds a whole layer. To recheck on the phone (`?perf=1`) and
    at C6, which owns the sky (options: the gradient painted where it changes only, a smaller sky surface behind the
    text, or the plan's fallback of capping light canvases while scrubbing).
