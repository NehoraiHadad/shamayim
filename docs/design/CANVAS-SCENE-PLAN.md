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
- `paintWorker.ts`, `remoteCache.ts` (added before C4, §6): where the browser has a module worker with a 2D
  `OffscreenCanvas`, every layer part is painted in a paint worker (one per surface) by the same painters and handed back
  as an `ImageBitmap`; the main thread asks for the stale parts (the same keys) and lays the bitmaps. A scrub frame lays
  the last light until the new one arrives; a cold start shows each batch as it lands. Elsewhere (or if the worker
  fails) the cache above paints on the main thread, sliced as described. `?paint=main` forces the main thread.

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
- `Life` (birds, meteors, `atmo/life/*`) stayed HTML until the switch; at C10 it moved into the sky canvas (owner decision 6) and
  `atmo/life/` was deleted: the flocks keep above the land the model draws (`landTopOf`).

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

**Deleted at the switch (stage C9)** — done (§6, "C9, the switch"), with these departures: `columns.ts` stays (the live
city data, `cityData`, `useCity`, `clusters`, `clusterStats`, `farData`, `plainData`, still read its band; its removal
waits for them to read the raster and grid directly); `mapParts.ts`/`mapAir.ts` moved into `world/` (`airParts.ts`,
`mapAir.ts`) rather than into `world/air.ts` (the birds and the theme still read `AirState`); `cityTowers`, `cityZones`,
`cityHeight`, `cityBase`, `towers` went too (the SVG's towers, left with no user):
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

Every commit keeps the app working. The canvas scene lived behind `?canvas=1` (`ui/devParams.ts`) and grew layer by
layer until C9 made it the default and deleted the SVG scene; without the flag the app shows the SVG scene, frozen: **the SVG baseline stays byte-identical from C0 to C8**
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
**Done 2026-11-19** (§6; perf gates not all met, see there).
Back/far/near planes with aerial perspective from `air`; on the near ridge: lit faces by `light`, gullies, terraces on
the lower slopes, scrub drifts, ground texture; ridge shadow and floor shadow; snow caps (`snowEdge`); wet ground.
Form/light split for scrubbing.
*Accept:* lit side = sun side in all 32 stills; far planes fade with visibility (a 5 km vs 40 km still pair); scrub
frame within budget; owner review of the hand against `qa/styles/v1b/`.

**C3. Water, haze, far cities — M (3).**
**Done 2026-11-19** (§6; perf gates as at C2, not met).
Water bands from `WaterSpan`s, glint path under sun or moon with the world's wind, the "פני הים" datum and water names
in the overlay; horizon band; far cities with their lights.
*Accept:* Tiberias, Ein Gedi, Haifa water at the same bearings as stage 3 stills; glint gone at noon, strong at 07:30;
no water at Tel Aviv, Jerusalem, Rosh Pina, Shadmot.

**C4. Glyphs, landmarks and the village portrait — XL (8).**
**Done 2026-11-19** (§6; the portrait composed in the world, see there).
First the glyph library (owner's "landmarks first"): 19 kinds + 4 icons in `paint/glyphs`, `paint/icons`, with a
glyph sheet still (`qa/canvas/c4/glyphs.png`) like `qa/glyphs/sheet-v1.png`. Then marks on the ridge (`model/marks.ts`)
and the village portrait in contour rows (streets as gaps, roofs by evidence or mixed, trees and cypresses between,
dense at the dot, thinning at the edge), lit windows by `night.litShare`, tree lean by wind.
*Accept:* layout tests (dot clearing, nothing under text, bases on ridge, density falloff, side rule); Shadmot, Rosh
Pina, Ein Gedi reviewed with the owner; icons take haze and lit side.

**C5. Cities from outside: variant B and its open items — L (5).**
**Done 2026-11-19** (§6; widened by owner decision 11: every place by one builder; perf gates not all met); a polish pass,
C5b (§6), reworked the coastal sea, the rows' ground, the houses' size, the sky's light on the mass and the towers beyond.
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
**Done 2026-11-19** (§6; the sky's own gates met, Haifa's cold model as before).
`SkyCanvas` in `ui/Sky.tsx` under the flag: gradient from `theme/skyLight.ts` (contrast tests keep their colours),
glow, afterglow, horizon band; sun and moon discs (phase, veil by cloud); stars only through clear sky; cloud banks by
layer, lit undersides at low sun, drifting with the wind at their height; seen clouds (satellite) as banks; thunder
flash. With the flag, `Atmosphere` is not mounted.
*Accept:* stars 0 under full cover; drift direction = wind; perf: animated frame ≤ 4 ms throttled; sky-vs-WebGL
stills at golden, noon, night, overcast; the in-cloud lightning rebuilt as a flash on the cloud layer (WebGL is
dropped: owner decision 1).

**C7. Weather — M (4).**
**Done 2026-11-19** (§6; the animated frame within budget; the model's overs are C5's and C6's).
Rain from the raining banks only, slanted by wind, shafts at their true azimuths (over the right ridge), the ground
darkening and shining after it; snow fall; mist (`life.mist`) as a drifting band between planes; dust tint; smoke and
tree lean; water ruffle. Reduced motion: one still frame.
*Accept:* rain/wind tests; stills of the v1b rain moment rebuilt from data (Haifa, rain, wind from the west).

**C8. Loading as an animation — S (2).**
**Done 2026-11-19** (§6; no layout jump, the loading and arrival frames within budget).
`model/loading.ts` + `paint/loading.ts`: while the panorama loads, mist drifting with a faint ridge line forming in it
(a stroke that grows from the place's direction outward); the real planes cross-fade in when they arrive. Offline with
no land data ever: quiet mist (owner decision 2). The drawn stand-ins are no longer used by the canvas path.
*Accept:* no layout jump when the land arrives; ≤ 4 ms per frame; a short clip for the owner.

**C9. Parity, switch, delete — M (3).**
**Done 2026-11-19** (§6; no `?svg=1`: git history is the way back, owner decision 12's note there).
All pixel references reviewed by the owner (stills sheet per place); perf within budget on the reference phone and in
CI; canvas becomes the default (`?svg=1` kept one release as the way out); then the deletions listed in §2 in their
own commits (SVG scene, WebGL sky, stand-in machinery, flags, SVG snapshots). `glitter` in `src/data/water/glint.ts`
(owner decision 10: its sign slip) is deleted with the SVG scene, or fixed if anything still imports it.
*Accept:* `npm test`, `npm run typecheck`, `npm run lint`, `npm run test:pixels` green; no import of a deleted module;
bundle smaller than before (record the size).

**C10. Sky life and optics — L (5).**
**Done 2026-11-20** (§6). Everything that lives or shines in the sky, chosen from the one world state by general rules (no
place named anywhere): birds by kind (white storks and common cranes on Israel's flyway in their passage seasons, swifts
from February to July, gulls by the sea and the lakes, raptors circling in thermals at a sunny midday over open land, hooded
crows and rock doves, bats at dusk; none in heavy rain, a storm or a gale), each with its own silhouette, wing beat and way of
flying; airliners at cruise with contrails only when the Schmidt–Appleman criterion holds at 250 hPa (persisting and spreading
in ice-supersaturated air, drifting with the high cloud), and the approach and departure traffic of the airports within reach
on the runway the wind picks; the planets at their true places (a compact ephemeris), each shown by its own magnitude against
the sky's brightness; meteors only on real shower nights, at a rate by the radiant, the moon, the towns' glow and the cloud;
the Milky Way at its true orientation only in a truly dark sky (no moon, clear, far from the towns' light by the built
density round the place); the rainbow round the antisolar point (42°, the secondary at 51°) when rain meets a low sun shining
unblocked from behind the eye; the 22° halo and the sun dogs under a veil of cirrostratus. The HTML birds, meteors and star
twinkle (`atmo/life/`) go; the brightest stars twinkle in the canvas, the planets never.
*Accept:* rule tests (season and hour gating, Schmidt–Appleman, ephemeris against known events, shower dates, rainbow and
halo geometry); pixel references re-recorded only for the new life; perf within the noise of C9; a contact sheet and strips
in `qa/canvas/c10/`.

Total ≈ 42 units; C4 and C5 are the bulk. The enriched drawing lands layer by layer (C2–C8), not as a later pass;
C9 includes a last tuning pass on the phone. After C9, the agreed order in `TRUE-SCENE-PLAN.md` continues on the new
pipeline (land colour by season, vegetation from WorldCover, rain edge marks).

---

## 5. Risks and open questions

**Risks.**
- Scrubbing relights the land every frame; mitigated by the form/light split, but the near ridge's lit faces and
  the portrait's faces may still exceed 10 ms at dpr 2.75. Fallback: cap the light canvases at dpr 2 while scrubbing.
  *Measured before C4 (§6):* the planes' light is path-bound, so ratio 2 saved ~1.5 ms a plane after the scaled blit;
  not taken. The paint worker took the light off the main thread instead; its cost is the light trailing the hand.
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
10. **The shipped SVG glint's sign slip** (`glitter` in `src/data/water/glint.ts` adds the light's altitude and the view's
    depression where the mirror's geometry subtracts them, so the frozen SVG scene's glint is weaker and peaks in the
    wrong place): left unfixed until the canvas switch (C9), like `windU`; the shipped scene stays frozen. The canvas has
    its own (`world/water.ts`: `glintsOf`, `facetShare`). At C9 `glitter` is deleted with the SVG scene, or fixed if
    anything still imports it (C9's checklist).

**Owner decisions (2026-11-19, at C5):**
11. **One algorithm for every place** ("why is the village built separately from the city?"): no village/city split, no
    `seenFromOutside` threshold between two builders. Every place over a panorama is seen from outside (the eye on its
    north, looking south) and built from its own data by one builder (`world/outside.ts`): its built cells (the land
    cover's, ~60 × 50 m) at their real heights from the city raster, its towers, its trees (the land cover's, near its
    built cells), its marks, placed by true east–west and north–south. What it looks like follows from the data on a
    continuum: low cells are houses with roofs (tile / flat by evidence, else mixed) and trees between; higher ones blocks;
    dense high-rise the jagged mass with spires (B). Houses are never placed outside the real built footprint. The composed
    portrait round the dot (`world/portrait.ts`) is kept only for the drawn stand-in (no panorama, no positions).

**Owner decisions (2026-11-19, at the C9 review):**
12. **The C9 review pack is approved; the owner prefers the canvas scene.** The switch (C9: canvas the default, `?svg=1` kept
    one release as the way out, then the deletions of §2) may go ahead once the open defects of §6 are settled.
    *Done at C9 without `?svg=1`* (the brief at the switch recommended none): the escape hatch would have kept the whole
    SVG scene, the WebGL sky and the stand-in machinery shipping one more release; the way back is git (`a132d04` is the
    last commit with the SVG scene).
13. **Sun rays where they fit** ("something is missing in the sky — maybe sun rays where it fits"): the SVG scene shows soft
    rays round the sun, the canvas only C7's narrow crepuscular case. Rays wherever they really occur, as general rules from
    the world state: crepuscular shafts through the gaps whenever the sun is behind broken cloud with enough haze (not only
    at a low sun), fanning from the sun's true spot; rays fanning over the ridge when the sun sits just behind or at the
    crest at sunrise or sunset; anticrepuscular rays opposite the sun at a low sun when the crepuscular are strong; a soft
    glare round a directly seen sun by the haze (what the eye sees), subtle, never a cartoon starburst; none in clear dry
    air at a high sun, none at night. Cheap (cached, laid at composite time), deterministic, in the anidoodle hand; tested;
    ray moments in the review pack.

**Owner decision (2026-11-20, on the vertical scale analysis of the datum follow-up):**
14. **Uniform vertical scale per place** ("uniform per place"): within each place's picture one metre is one metre above
    and below the dot: a single px per metre for the place's own ground and its surroundings at the same distance (the
    near ridge's crest behind it, its water, sea level). The exaggeration may still be chosen per place from the room it
    has, so places stay legible; the dot no longer has to sit exactly on the near ridge line. *Done 2026-11-20* (§6,
    "Uniform vertical scale per place").

**Deploys pending for the owner** (final, at C9; in order; from the owner's machine with Cloudflare access; nothing here
was deployed by the rebuild):
*Status 2026-11-20:* all done: 5 (merge, PR #7), 1 and 6 (Worker deployed; both checks answer 200), 2 (`ASK_SCENE_HOURLY` on, PR #8), 3 (landmarks workflow, 290b790), 4 (`bounds.json`: 2187 places, 242 boundaries); hotfix after the release: PR #9 (blank page, cancelAnimationFrame binding).
1. **The forecast Worker with C0's new hourly fields** (`wind_direction_10m`, `visibility`, `wind_speed_` and
   `wind_direction_` at `850hPa`, `700hPa`, `300hPa`; already in `worker/src/routes.ts` and its tests). After this
   branch is merged to `main`:
   ```bash
   cd worker && npm ci && npm test && npx wrangler deploy      # `npx wrangler login` once on the machine
   curl -s -o /dev/null -w "%{http_code}\n" -H "Origin: https://shamayim.pages.dev" \
     "https://shamayim-api.nehoraihadad.com/v1/forecast?latitude=32.348&longitude=35.535&hourly=wind_direction_10m,visibility,wind_speed_850hPa,wind_direction_850hPa,wind_speed_700hPa,wind_direction_700hPa,wind_speed_300hPa,wind_direction_300hPa"
   # 200: the Worker knows them. 400: not deployed yet; stop here.
   ```
2. **Then flip `ASK_SCENE_HOURLY`** to `true` in `src/data/openMeteo/request.ts` (one line; `npm test` covers the
   contract against the repo's Worker), merge to `main`; Pages builds it. Until then the world runs on its marked
   fallbacks (cloud layers split from the cover, wind aloft from the 10 m wind, visibility from humidity).
3. **Rebuild the landmark and city cells with the industrial-landmark rule** (C5; `scripts/landmarks/build.ts` applies
   `industrial.ts` from the tags). Nothing to deploy by hand: run the monthly workflow now instead of waiting for the 1st
   (`gh workflow run landmarks.yml`, or Actions → "Build Israel landmarks" → Run workflow); it commits
   `public/data/landmarks/il` and `public/data/city/il` to `main`. Check the commit lands and Pages rebuilds.
4. **Rebuild `public/data/city/bounds.json`** (C5 item 6) from the same Geofabrik extract (not in the workflow; needs
   `osmium-tool`):
   ```bash
   curl -L --fail -o israel-and-palestine.osm.pbf https://download.geofabrik.de/asia/israel-and-palestine-latest.osm.pbf
   osmium tags-filter israel-and-palestine.osm.pbf r/boundary=administrative -o admin.osm.pbf
   osmium export admin.osm.pbf -f geojsonseq --geometry-types=polygon -o admin.geojsonseq
   npx tsx scripts/city/bounds.ts admin.geojsonseq --cities public/data/city/il --out public/data/city/bounds.json
   npm test && git add public/data/city/bounds.json && git commit -m "Data: place boundaries" && git push
   ```
   (after step 3's cells are on `main`, so the place points are the new cells'.)
5. **The app itself** (the canvas switch, C9): merging this branch to `main` is the release (Pages). The service worker
   updates itself (`autoUpdate`, `skipWaiting`); no cache to clear. No other server changes.
6. **(C10) The air at cruise level for contrails**: the Worker's allowlist (`worker/src/routes.ts`) now also lists
   `temperature_250hPa` and `relative_humidity_250hPa`; the app asks for them with the rest of `SCENE_HOURLY`, behind the
   same `ASK_SCENE_HOURLY` gate. Deploy them with step 1 (one Worker deploy) and add them to step 1's check:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -H "Origin: https://shamayim.pages.dev" \
     "https://shamayim-api.nehoraihadad.com/v1/forecast?latitude=32.348&longitude=35.535&hourly=temperature_250hPa,relative_humidity_250hPa"
   ```
   Until step 2 the world takes a climatological guess for the air at 250 hPa (−53 °C in January to −40 °C in July; the
   humidity from the forecast's high cloud), marked `sources.cruise: 'climate'`.
7. **(Living land, stage 1 — pending deploy)** Dedicated narrow `/v1/land-weather` Worker route (`worker/src/routes.ts`):
   past 60 days of daily liquid/snow precipitation (`rain_sum,showers_sum,snowfall_sum,precipitation_sum`) and current
   volumetric soil moisture (`soil_moisture_0_to_1cm,1_to_3cm,3_to_9cm,9_to_27cm`) with `forecast_days=1` only (no hourly
   fields; `/v1/forecast` stays capped at `past_days=1`). Gated behind `ASK_LAND_WEATHER = false` in
   `src/data/land/recentWeather.ts` until deployed; until then land dryness falls back to climatology
   (`drynessSource: 'climatology'`). After `land-living` is merged to `main`:
   ```bash
   cd worker && npm ci && npm test && npx wrangler deploy
   curl -sS -D - -H "Origin: https://shamayim.pages.dev" \
     "https://shamayim-api.nehoraihadad.com/v1/land-weather?latitude=32.3465&longitude=35.5325&timezone=Asia%2FJerusalem&models=icon_seamless,ecmwf_ifs025&forecast_days=1&past_days=60&current=soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm&daily=rain_sum,showers_sum,snowfall_sum,precipitation_sum" \
     | node -e "const raw = require('fs').readFileSync(0,'utf8'); const [h,b] = raw.split(/\r?\n\r?\n/); const j = JSON.parse(b); console.log(h.split(/\r?\n/).filter(l => /^HTTP|^x-fetched-at|^x-cache/i.test(l)).join(' | ')); console.log('daily:', j.daily?.time?.length, 'rain:', Array.isArray(j.daily?.rain_sum_icon_seamless), 'soil:', typeof j.current?.soil_moisture_0_to_1cm_icon_seamless);"
   # Expect HTTP 200, X-Fetched-At header, ~61 daily rows, rain: true, soil: number. Stop if 404/400 or missing fields.
   ```
   Then flip `ASK_LAND_WEATHER` to `true` in `src/data/land/recentWeather.ts` and merge to `main`.

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

**C2 done (2026-11-19), with the perf gates not all met (below).** Commit on `ccr-85ec24f0-9ayxgu`; the shipped app and the
SVG baseline are unchanged (snapshots untouched; the canvas scene is now a lazy chunk, see *App*).
- *Drawing with the anidoodle skill* (owner decision 7): `SKILL.md`, `craft-bar.md`, `realism-and-craft.md`,
  `determinism-and-contract.md`, `working-method.md`, `styles.md`, `workflows/site-art.md` read first. Helpers ported to
  `scene/paint/core.ts` with the Apache-2.0 provenance header (`rng` = the world's `seeded`, one generator; `fractal`,
  `sample`, `jitter`, `displace`, `oval`, `softBox`, `line`, `tube`; `noise2` rewritten without per-call closures, the same
  numbers as the original, checked against it to 1e-12). The look was proved on one still (Shadmot 08:00), critiqued on 2×
  crops, then extended to every place.
- *World* (terrain analysis, built once with the terrain's planes, so a change of hour never redoes it):
  `world/face.ts` (each plane's face from the panorama's ground profiles, `terrain.groundAt`: per 3 px column the ground
  that shows between the crest and the foot, with distance, height and the slope away from the eye; the face's contours at
  a height step giving ~14 levels), `world/land.ts` (gullies, terraces and scrub placed on the face by general rules and
  seeded by the place: gullies down the face's re-entrants, where contours bend back toward the crest, chained contour to
  contour, and from notches in the crest; terraces along the face's own contours on the lower, moderate slopes in short
  seeded runs; scrub drifts weighted to moderate slopes, thinner on flat floors, none on cliffs, larger when near),
  `Plane.hazeKm` (distances smoothed along the crest). `TerrainPlanes` gains `faces` and `land`.
  `world/ridgeLighting.ts` exports `ridgeLightSamples` (the SVG crescent's per-point facing, clearance and band depth,
  moved out of `ridgeLightPaths` unchanged; the SVG output is byte-identical).
- *Model* (`scene/model/`): `planes.ts` (form: outline, the world's ground kept out of the text zones by `ground.ts`, a
  neutral fill and the texture's seed, keyed by terrain + place + box only; a plane behind the near ridge is cut to just
  under it, the rest hidden), `planeLight.ts` (the light part, for every place alike: tone by each direction's distance,
  `mix(ridgeNear → the sky's horizon air tinted by air.haze, 0.88·fade(km)²)`, `fade` Koschmieder from the visibility; wet
  ground darker and richer; lit and shade washes below the crest from `light.ray` (`ridgeLightSamples`, faces turned to
  the light take the light's colour no lighter than the sky behind allows, faces turned away and ground in another
  ridge's shadow sink to sky-lit shade, strength by `light.direct`); the floor shadow (`shadowRuns`, low sun); the crest rim
  where it turns to the light, brighter near `rimX` at a low sun; snow above `snowEdge` with a ragged edge (displaced
  geometry) fading with distance; the `lift` (side and colour the scrub and gully lips catch the light on). Keyed by the
  inputs (world light, air, ground, night, snow, terrain, box), not the shapes. `tone.ts` gains Oklab on RGB.
- *Painters* (`scene/paint/planes.ts`, header after the skill's "name the medium"): form = neutral 0.5 grey, a soft
  mottle and grain (two octaves of seeded value noise per 3 px texel, drawn small and back up: the skill's blur without a
  filter), gullies as tapered displaced tubes fading downhill, terrace shade lines, scrub dots with contact shade; light =
  the tone, then (`source-atop`, so everything takes the plane's own antialiased edge, no clip and no fringe) snow, shade
  and lit washes (5 nested bands), floor shadow (stacked offset copies), rim, lifts. The light canvas is laid over the
  form with **`overlay`**: a neutral form shows the light's colours exactly, its marks darken or tint them.
- *Tests* (`scene/model/planes.test.ts`, 37): lit side = the light's side at every hour for every place with steep crest
  stretches (lit depth on slopes facing the light > on slopes facing away; lift toward the light; none without a side);
  gullies, terraces and scrub under the crest and out of every text zone; texture deterministic (model and the painter's
  call log twice); tone monotone toward the air with distance, far planes nearer the air than the near one; far planes
  fade more at 5 km than at 40 km; wet ground darker; snow only with snow; no light, shade, rim or floor shadow under
  full overcast; floor shadows at a low sun.
- *Pixel references*: all 53 rewritten (`--update`), the land only: the sky rows (y < 300) of every reference are
  byte-identical to C1's, every reference's land changed (the planes in the hand). 53/53 on re-run. 2.4 MB.
- *Stills* `qa/canvas/c2/` (dpr 2, with the overlay): the 8 places at 08:00, 15:00, 21:00; Haifa 12:00 rain and dust (3 km,
  the low-visibility counterpart; the 5 vs 40 km pair is a unit test, the harness has no visibility override); Jerusalem
  12:00 snow; `sheet-svg-canvas.png` (the app itself, SVG | canvas: Haifa 08:00, Rosh Pina 15:00, Tiberias 21:00; new
  runner `e2e/scene.compare.mjs`, the app on the dev server with the place, its panorama and the clock set, the forecast
  from the fixture at the place's height). The canvas column has no sun disc, water, marks or portrait yet (C3–C6).
- *Critique of the look still* (Shadmot 08:00, 2× crops, craft-bar detail pass). Works: layered planes read by distance
  (the backlit Gilead pale in the morning haze, the near ridge dark); the lit side is the sun's (slopes facing east take a
  band of light, slopes facing west sink); a fine rim on the sunlit crest; the ground has a soft mottle, not a flat field;
  nothing touches the label or the dot. Still wrong: the lit band shows faint strata at 4× (5 nested bands, a cost
  compromise, below); gullies are few and read as hairline cuts more than valleys; scrub reads as sprinkled dots, not
  drifts with mass; terraces are near invisible at 1×; the near ridge is greyer than v1b's indigo by day (the palette's
  `ridgeNear` plus haze); the morning light is near white (the sun's colour at 19°), so v1b's warmth only comes at a low
  sun; the far planes have no texture (haze takes it; a cost choice too). Under snow the near and far ridges part by haze
  only. For the owner's review against `qa/styles/v1b/`.
- *App*: the canvas scene is a lazy import (`scene/react/CanvasScene.tsx`, default export: `useWorld` + `SceneCanvas`;
  `App.tsx` holds only the world's input and `lazy(() => import(...))` under `?canvas=1`, the SVG scene as the fallback).
  Production build: a separate `CanvasScene-*.js` chunk (39.7 kB, 16.9 kB gzip), not loaded without the flag.
- *Perf* (`qa/canvas/perf.md`, C2): within budget: the model (cold 11–13 ms, scrub p95 7–13 ms), memory (12–14 MB).
  **Over the gate**: the land's scrub frame (p50 10–17 ms, p95 15–23 ms against a gate of 15) and the first paint (63–117 ms
  against 90; sky 39–46 ms of it, C1's), over several runs. Cause: software raster ×4 at dpr 2.75 pays per pixel for every full-plane pass
  (the tone fill ~4 ms, the overlay blits, the washes ~2 ms, rims and lifts ~2 ms, p95 spikes from the world's per-frame
  garbage); the first paint's land is the texture and the cold JIT of the new painters. Done to get here: the face and the
  ground placement moved to the world (terrain part), memoised outlines and distances, light key from inputs, washes
  batched per band and laid with `source-atop` (a clip made every later fill pay ~3×), far plane cut to what shows, far
  texture dropped, texture at 3 px texels with value noise, foot-of-plane haze gradient dropped. Options left (owner /
  next stage): cap the light canvases at dpr 2 while scrubbing (the plan's fallback; a scaled blit is the slow path in
  software, to measure), quantise the light key while scrubbing, recheck on the phone with `?perf=1` (GPU raster).
  The runner exits non-zero on these; the branch was not pushed for that reason (C2's own rule: push once all passes).
- *Decisions where the plan was vague, and departures*:
  - **No back plane**: the panorama gives two lines (near ridge, far horizon); `terrain.back` stays empty, the painters
    take it when data gives one. Aerial perspective comes instead from each direction's own distance along each plane.
  - **Overlay split**: the form is light-free values round grey; the light canvas carries every colour. The plan's
    `Face[]` / `faces` of the plane became `Wash` (bands hanging from the crest), `Face` (floor shadow), `Rim`, `SnowCap`,
    `Lift`; `Gully` gained width and strength. C1's `light.blend` is `overlay` for planes.
  - **Ridge shadow**: the shade wash (faces turned away, and ground in another ridge's shadow by `clearance`); the floor
    shadow as the SVG's (`shadowRuns`, runs ≥ 12 px, 16 px deep, sky-shade blue at 0.3 · direct).
  - **Text zones** are honoured by the form (gullies cut, terraces split, scrub left out); the plane's fill and light pass
    under the labels as the land does.

**C3 done (2026-11-19), with the perf gates as at C2 (not met, below).** Commit on `ccr-85ec24f0-9ayxgu`; the shipped app and
the SVG baseline are unchanged (snapshots untouched, `far.json`'s patches untouched).
- *Drawing with the anidoodle skill* (owner decision 7): the references read again; the look proved on one still
  (Tiberias 07:30), critiqued on 2× crops, then extended (Ein Gedi, Masada, Haifa, Tel Aviv, Ramat Gan).
- *World*: `world/water.ts` computes the glint itself (`glintsOf`, `facetShare`): the facet tilt is (altitude −
  depression) / 2, the mirror's own geometry. **`data/water/glint.ts`'s `glitter` adds the two angles**, a sign slip in
  the frozen SVG scene (its glint is weaker and peaks in the wrong place); left as it is (SVG frozen), goes at C9. The
  floor is a 0.4 % facet share (a share of the sun itself is bright). `ripplesOf`: the places ripples can take on each
  span (seeded, with a low-frequency gate for patches and slicks), built once with the terrain. `world/farCities.ts`:
  the far raster (`far.json`, now a `WorldInput.far`, loaded by the harness, the tests and `CanvasScene`) placed by
  `panoramaFarColumns` as the SVG does (beyond `SKYLINE_TO_KM` when the place has its own skyline), each stretch with its
  cell's storeys, towers with tops and feet (plain: `seenAt`; far crest: its angle + the tower's), and `townShapes`.
- *Model*: `water.ts` (layers `water.far` z 15 with the datum, `water.near` z 35, by `waterLayer`): the surface's tone is
  a function of the screen row alone, shared by every span: the sky mirrored at the row's depression plus the waves'
  mean tilt (Cox–Munk), by Schlick's Fresnel share over the water's own dark, the land over the far shores mirrored
  where calm (by wind) and higher than the row's depression, then the land's own aerial rule (`aerialFor`) at the row's
  distance; a light rim at the far edge; ripples by the one wind (count, length, light/dark share); the glint where the
  world puts it, alpha `1 − e^(−12·share)`, widening by the wave slope, sparks seeded; the datum in the hour's ink.
  `farCities.ts` (z 16): the towns as the eye resolves them: the built share laid into a 1 px × ½ px field, smoothed,
  drawn as runs at five strengths (a lone shed is a breath of tone, never a speck); blocks of true height (storeys ×
  3.2 m on the relief) only where the smoothed share ≥ 0.3; towers ≥ 80 m; lit face on the light's side; tones by 19
  distance tiers through `aerialFor`; nothing past 5 % contrast; lights by `plainLights` with Allard's cube root, by night.
  `sky.ts`: `skyStops`, `skyAt`, and the haze band (`air.horizonBand`, night-aware) at eye level.
- *Compose*: `Painter.formless` lets a light-only layer (water, towns) skip blitting its empty form.
- *Tests* (`scene/model/water.test.ts`, 13): water only where the world has it, at the spans' bearings (none at Tel Aviv,
  Jerusalem, Rosh Pina, Shadmot); the datum only below sea level; glints only with the light up, above the land and over
  the span, strong at 07:30 at Tiberias and Ein Gedi, gone at noon; glint spread and ripples by wind; Fresnel; haze
  monotone with distance for any tone, town tiers toward the air, fewer towns at 6 km; band stronger in haze; towns by
  day, lights by night; ripples, sparks, blocks, masses and lights out of every text zone; determinism and form/light keys.
- *Pixel references*: all 53 rewritten deliberately: the haze band changes every sky (and the land rows above the
  ridges, where the sky shows through); water, datum and far towns at Tiberias, Ein Gedi, Haifa, Tel Aviv, Jerusalem,
  Rosh Pina; 53/53 on re-run.
- *Stills* `qa/canvas/c3/` (dpr 2, overlay): Tiberias 07:30, Ein Gedi 07:30, Masada 11:00, Haifa 16:30, Tel Aviv 16:30,
  Ramat Gan 11:00; `sheet-svg-canvas.png` (Tiberias, Ein Gedi 07:30, Haifa, Tel Aviv 16:30). New panorama fixtures
  for Ramat Gan and Masada (`STILL_PLACES`; `recordPanoramas.ts` takes study and still places by id); the harness knows them.
- *Critique* (2× crops). Works: the lakes read as water: lighter than the hills, a fine light shore line, ripples in
  patches with slicks between, and a glitter path under the morning sun that widens toward the eye (Ein Gedi best);
  far water of one height has one tone however the spans split; Tel Aviv from Ramat Gan reads as a distant city (a pale
  mass, a ragged roofline, its towers); Haifa's Krayot by night as a field of lit windows. Still wrong: the glint's soft
  core reads a little like a vertical bar; night water is near the night land's tone (no moon glint in these stills);
  far towns at dusk (Tel Aviv 16:30) all but vanish (true to the haze, but thin); Masada's Dead Sea shows the Lisan land
  between the basins as a darker lens, data-true but busy; town blocks are a regular picket at 4×.
- *Not in C3*: the coastal sea for coastal places seen from outside (Tel Aviv, Netanya) is C5 item 1
  (`WaterState.coastalSea` stays null); glint shimmer and animated ripples wait for C7 (still frames now).
- *Perf* (`qa/canvas/perf.md`, C3): modelCold 18–32 ms, scrub.model p95 9–14 ms, scrub.land p50 13–19 / p95 18–25 ms,
  first paint 80–142 ms (C2 the same day: scrub.land p95 17–25, first paint 80–113). Over the gates as at C2; the
  towns' field and the ripple places moved to the world's terrain part (model cold was 83–116 ms with them in the model).

**Performance pass before C4 (2026-11-19): the gates met but Haifa's cold model.** Commit on `ccr-85ec24f0-9ayxgu`; the
look unchanged (53/53 pixel references at the same tolerance, painted in the worker and on the main thread; worker and
main-thread stills pixel-identical), the SVG baseline unchanged (snapshots untouched; the shared `astro/utc.ts`,
`world/sceneLight.ts` changes give the same numbers). Numbers and method: `qa/canvas/perf.md`, "Performance pass".
- *The world's scrub frame* (p95 61–87 → 5–13 ms): one `Intl.DateTimeFormat` per time zone (`astro/utc.ts`: one was built
  per call, ~100 a frame); the twilight's ridge crossing kept per skyline and day (`world/light.ts`, found on the cold
  build); `clearanceOf` / `groundAt` scan only a sorted profile's run toward the light and bisect for x (same numbers).
- *The sky in rows* (`paint/sky.ts`): each device row's colour written with a 32-bit fill into a reused `ImageData`
  (4–6 ms against 13–20 for the gradient fill; largest change 2/255). Painters stay pure: no clock, no DOM, the scratch
  pixels are written whole each paint.
- *The paint worker* (§1d): `compose/paintJob.ts` (the shared `paintPart`, keys, job types), `paintWorker.ts`,
  `remoteCache.ts` (the cache's keys, one batch in flight, newest ask wins, the last light laid until the new one lands),
  `worker.ts` (feature check; the two workers start as the chunk loads); `Surface` takes a `worker` and falls back to its
  own `LayerCache` when there is none or it fails. `useSurface` records `firstPaint.<name>` as the main thread's time,
  `firstShown`, `arrive`, `latency`, `worker` per surface. Harness: `__scene.settled()`, `__scene.offThread`; runners:
  `--paint=main` (perf), `SCENE_PAINT=main` (pixels, stills). Tests: three in `compose.test.ts` (a cold batch, a scrub that
  keeps the last light and coalesces, arrivals laid and the fallback on a worker error).
- *Compile hint*: `//# allFunctionsCalledOnLoad` heads `scene/model/*.ts` and the built `CanvasScene` chunk
  (`vite.config.ts`); the paint worker builds to its own file (`paintWorker-*.js`, 11.7 kB).
- *Result at ×4* (ranges over three runs; Haifa / Tel Aviv / Shadmot): first paint, main thread 21–33 / 21–26 / 17–25 ms
  (was 110 / 92 / 105); scrub.land p95 1.3–1.4 / 0.8–1.1 / 0.8–1.4 (was 28 / 20 / 24); scrub.model p95 8–14 (gate 15);
  cold model 13–30 / 7–11 / 2–7 (was 34 / 18 / 14). **Haifa's cold model stays over** its gate in three runs of four: first-run code (the same
  model on a fresh place in a warm page is 3–7 ms); to recheck in a production build on the phone.
- *Costs, reported*: the light trails the hand while scrubbing (p50 116–400 ms at ×4, 6–10 ms unthrottled; the ×4
  emulation slows the worker more than four-fold, see perf.md), and everything shows a little later on a cold start
  (`firstShown` 134–172 ms at ×4 against 92–144 for the sliced paint; 30–35 ms unthrottled); the exact light lands when
  the hand stops. To check on the phone (`?perf=1`: `latency.land`, `worker.land`).
- *Measured and not taken*: the light canvases at ratio 2 while scrubbing (path-bound light: ~1.5 ms a plane saved after
  the scaled `overlay` blit), a quantised light key while scrubbing (every step still a whole paint: p95 unchanged),
  merging the far plane's form and light (the form would repaint every frame). `--gpu` is SwiftShader here and no faster:
  the gates stay on the software run.
- *Main-thread fallback* (`--paint=main`): the sky's scrub frame 12–13 ms p50 (was 19–21), the world's as above; the
  land's light as before, over the gates (scrub.land p95 19–32, first paint 92–144). Where a browser has no worker 2D
  canvas (old Safari), C4's glyph layers should keep their light parts small.

**C4 done (2026-11-19): glyphs, icons, landmarks and the village portrait.** Commits on the C4 branch (merged with the
perf pass); the shipped app and the SVG baseline are unchanged (snapshots untouched; the SVG scene still runs `hillScene`).
- *Drawing with the anidoodle skill* (owner decision 7): `SKILL.md`, `craft-bar.md`, `realism-and-craft.md`,
  `determinism-and-contract.md`, `working-method.md`, `workflows/site-art.md` read first; real references per glyph in
  each painter's header (from the prototype's `brief-glyphs.md`, the SVG `generic/*` and `curated/*`). The look proved on
  one still (Rosh Pina and Shadmot 16:30, then 08:00), critiqued on 3× crops of the 2× stills, then extended.
- *World* (the place part, independent of the hour; **no longer `hillScene`**): `world/marks.ts` seats the data layer's
  choice (`placeMarks`: rank, fame, the portrait's side rule, the few landmarks) on the land it stands on (`seat`, the
  R1 planes, into the town for the marks among the roofs, off the dot, lifted ≤ 6 px off the sheet edge or dropped,
  fields slid onto the visible face); the outside view's rules as `outsideScene` had them (far marks need a name and
  fame or ≥ 200 m, the place's marks by `outsideProject`, a city's own high-rises left to its towers). **A landmark needs
  a name** for every place (`namedOnly`: an unnamed mark keeps its kind, not its fame). `WorldMark` carries the glyph,
  x, base, drawn height, scale, width, distance (km). `world/portrait.ts`: the village in contour rows hanging from the
  near ridge's own line (row 0 on the crest), outward from the dot on both sides, the houses thinned by a falloff of
  their distance (`e^−1.5·d²`) turned into houses by error diffusion along the row (a due spot that is blocked stays
  empty, so the density keeps to the falloff), streets every 3–5 houses with a tree in most, trees and cypresses in
  the spots left, a fringe of trees past the edge; its half width from the built-up reach (`20 + 18·(reach − 1 km)`,
  24–64 px), its vertical reach from the style (`settlementReach`) or the width; roofs by the roof rule (tile ≥ 90 %,
  flat, or mixed half and half; blocks flat), heaters on flat roofs; no portrait for a place with no houses of its own.
  `world/layout.ts`: the label's placement (`placeLabel`, as `sceneLayout`'s) under the houses that stand over it, clear
  of the marks; the houses and trees it would cover give way. `world/glyphSpecs.ts`: sizes per kind and icon.
- *Model* (`model/marks.ts`): two layers, all light over an empty form (as the far towns): `marks.far` (z 17, the far
  ridge's and the plain's marks) and `portrait` (z 40, over the near ridge and its water: houses, trees and the near
  marks back to front). `tonesAt(world, km)`: walls are the land's own dark lifted toward the air and stone by day (the
  visible face of a building faces north, toward the eye: sky-lit, never sunlit in Israel's winter); the face toward the
  light takes its colour by the direct share (none with no side: a soft sky lift), shade toward a sky-lit dark, the
  materials (stone, tile, glass, foliage, panels, the Báb's gold), every tone but the lamps carried toward the air by the
  land's aerial rule at that distance. `shineOf`: dark, direct light, the cast shadow (`light.shadow`, alpha 0 under
  overcast), lit windows (`0.4 · litShare` after dusk), aviation lights, lean (`wind.across`, ±0.22). Bounds take the
  longest shadow on either side, so a scrub never resizes the layer (a resize repaints it whole).
- *Painters*: `paint/glyphs/` (`kit.ts`, `buildings.ts`, `industry.ts`, `structures.ts`, `nature.ts`, `index.ts`): the
  18 drawn kinds (minaret, church, synagogue, water tower, castle, homes, chimney, high-rise, cooling, silo, mast,
  lighthouse, turbine, bridge, palms, orchard, vineyard, solar; the 8 of `sceneGlyphs.ts` ported, the rest new in the same
  hand) and `paint/icons/` (Western Wall, Shrine of the Báb, Azrieli Center, Chords Bridge). A glyph is drawn with the
  light on the left and mirrored for the right; the asymmetric icons (Wall, Azrieli, Chords Bridge) and the fields keep
  their shape and take the side as a parameter. `paint/marks.ts`: cast shadows first, bodies back to front, the material
  grain over all (one `source-atop` pattern of a 64 px seeded tile in device px), lamps and halos last. Worker-safe
  (scratch surfaces from `env.canvas()`, plain-data descs).
- *Tests* (`model/marks.test.ts`, 46; `model.test.ts` updated): every mark seated on its ridge (on the line within 1 px,
  lifted ≤ 6, down the face ≤ 12; fields on the face at their depth; outside rows ≤ the near drop); lit side = the world
  light's side at 4 hours and the shadow away from it; no house or tree in the dot's clearing or a text zone, no glyph under
  the label; no unnamed landmark; density from the dot (inner two thirds > 2 × the outer, inner ≥ outer); roofs by the rule;
  windows lit by night only; the composition deterministic and out of a blocked zone, standing on the face; no portrait
  without houses; tones toward the air with distance, icons lit from the world's side; keys and bounds stable through a
  scrub. The overlay test keeps the dot and notes equal to the SVG layout; the height label is now the world's (it was
  placed against the SVG's own houses).
- *Pixel references*: all rewritten deliberately but Ramon crater's four (no marks, no houses; unchanged) and Ein Gedi
  21:00 (under the threshold): marks and houses added on the land; sky and planes as before. 53/53 on re-run, on both
  paint paths (the worker and `SCENE_PAINT=main`).
- *Stills* `qa/canvas/c4/` (dpr 2, overlay): the 8 baseline places at 08:00, 16:30, 21:00; `glyphs.png` (every kind and
  icon in Rosh Pina's light at 08:00 / 14:00 / 16:30 / 21:00 and at 4×, `node e2e/scene.glyphs.mjs`,
  `scene.html?sheet=glyphs`); `sheet-svg-canvas.png` (Shadmot 16:30, Rosh Pina 08:00, Tel Aviv 16:30, Jerusalem 08:00,
  Ein Gedi 21:00).
- *Critique* (3× crops of the 2× stills, craft-bar detail pass). Works: Rosh Pina reads as a village climbing its slope,
  rows hanging from the crest with streets and trees between, the synagogue among its roofs; the lit faces turn with the
  sun (left in the morning, right in the afternoon, none after sunset); by night the walls sink and a few windows glow, the
  minaret's lamp and the aviation lights show; the icons stand in the same haze and light as the hills (Azrieli's
  glass, the Báb's gold, the Wall's margins); palms lean with the wind. Still wrong: houses on a steep face stack into
  vertical columns; the walls read a touch pale against a dark dusk ridge; small villages are sparse (Shadmot 15 houses)
  because the dot, the label, the notes and the marks among the roofs take the middle; the cast shadows barely show at
  1×; fields on the near face are dark on dark (orchards read, vineyards hardly); at night far glyphs are near the
  ridge's tone (true to the light, but they vanish); Jerusalem's label went above the dot (the marks take the spot
  under it).
- *Perf* (`qa/canvas/perf.md`, C4): the worker path within the gates but Haifa's cold model (40 ms, its range 13–40);
  worker land batch p50 87–179 ms (perf pass 70–124), scrub latency p50 179–366 ms; main thread: portrait paint 1.9–2.6
  ms, scrub.land p95 30–48. The place part of the world in node: 1–10 ms for a portrait, 7–25 ms for a city (Tel
  Aviv's `outsideSkyline`), was 4–59 ms with `hillScene`.
- *Departures*: the portrait is composed in the world (the place part, memoised), not in `model/portrait.ts`: the
  label's layout depends on it and the model only scales it; one `portrait` layer holds the near marks with the houses
  (drawn back to front among them), so `marks` holds the far and plain ones only. The outside view itself (mass and
  spires, the coastal sea) is C5; C4 draws a city's marks and icons only.

**C6 done (2026-11-19): the sky, the bodies, the stars, the clouds; lightning and heat shimmer rebuilt.** Commits on the
stage's branch (merged by the coordinator onto `ccr-85ec24f0-9ayxgu`, after the performance pass); the SVG baseline and
the shipped app are unchanged (snapshots untouched; everything below runs only under `?canvas=1`).
- *Drawing with the anidoodle skill* (owner decision 7): `SKILL.md`, `craft-bar.md`, `realism-and-craft.md`,
  `determinism-and-contract.md`, `working-method.md`, `site-art.md` read first; the look proved on one still (Haifa 16:20,
  a broken sky at sunset), critiqued on 2× crops, then extended across hours and weather.
- *World* (small changes, all general): `clouds.ts` spreads each layer's banks over the dome by a seeded altitude (3–78°,
  more of them low) instead of a 4–80 km distance (which put every bank within ~30° of the horizon and left the sky
  overhead bare at any cover); a bank's distance now follows from the deck's height, so a change of hour never moves it
  across the sky. **Fixed**: `layerCovers` gave NaN to a layer with no cloud when the shown cover is full
  (`1 ** Infinity`), which made a full overcast's direct light NaN (C2's "no shade under overcast" passed by that
  accident). `light.ts` `cloudTransmit`: a mid layer that closes into a full deck blocks up to 0.95 (was 0.85 at any
  cover: a full mid and high overcast let a shadow-casting sun through); partial covers change by < 1e-3 below 40 %.
- *Model* (`scene/model/`): `sky.ts` (`skyGeom`: x through the camera scaled to the figure and offset to where it stands
  in a wider sky, the bodies on the world's relief, the clouds on the relief up to 22° and the rest of the dome spread over
  the sky above, since the relief's zenith is only ~135 px over the horizon; the base: gradient, a three-ring glow round
  the sun after air mass and aerosol, weaker as it climbs, veiled by the cloud in front, none in dust, a bright patch
  under a deck; the twilight glow at the sun's ridge crossing; a cool glow round the moon; Earth's shadow and the pink
  belt opposite the sun; the haze band), `bodies.ts` (the sun's disc at the world's position: core and redder limb,
  refraction squash, aureole by aerosol, veil by the cloud in front, a pale coin in dust; the moon as the SVG's
  `moonLook` decides, its true phase turned to the sun, earthshine by night), `stars.ts` (one seeded field by area, the
  app's three classes by sun depression, only the seeded subset through `night.starsThrough`, drowned near the horizon
  and, the faint ones, by a bright moon), `clouds.ts` (per level: the world's banks as heaps (low, mid) or streaks
  (high) at their true azimuths on a band round the whole horizon (`period`, 360° of the camera); the layer's field to
  its cover (heaps, then sheets as low cloud closes, sheets for the mid layer, streaks for cirrus) with a wash once a
  layer, or the whole sky, closes; tones: whiter than the sky by fair weather, the sky's own grey with a darker base as it
  closes, darkest where it rains, faded toward the sky behind by the air at the bank's distance (`air.fade`), so dust
  tints them; the light per layer: the sun after the layers above (a bank stands in a gap, fully lit, or under the deck,
  seeded, as often as their cover says), the afterglow from under the horizon (`litUnderside`), the moon; the light's
  direction the short way round the band, a silver edge near the sun, a backlit bank darker; the light-dependent numbers
  snapped to the key's steps, so the key names exactly what is painted), the flash layers (thunder only: the two largest
  raining banks in view) and the shimmer tile (`air.heat`); `anim.ts` (`driftAt`, `flashAt`, `strikes`: pure functions
  of the spec and the phase).
- *Painters* (`scene/paint/`): `sky.ts` keeps the performance pass's row painter for the gradient and band and lays the
  arch and glows over it; `skyBackground` gives the same base as CSS backgrounds. `bodies.ts` (sun, moon, stars),
  `clouds.ts` (each bank's mass laid from one soft puff sprite on a shared scratch sheet and tinted, then modelled on the
  mass with `source-atop`: shade away from the light and underneath, the light's breath on each dome, the rim where the
  mass faces the light (the mass less itself moved off the light, so only the outer edge catches it), a warm underside at
  a low sun, a dark base where it rains, a silver edge; laid at the bank's strength; cirrus as combed strands; the whole
  layer worked at 1 device px per CSS px and laid up into its 1:1 cache, `SOFT_SCALE`; the flash: the bank lit from
  within; the shimmer: wavering lines tiling its tile). All worker-safe (no DOM); every desc structured-cloneable (a test).
- *Compositor* (`compose/surface.ts`, small): an animated layer is laid where its drift has carried it at `phase`, in
  whole device px, repeated every `period` across the surface, at its flash alpha; a tick that moved nothing a whole
  pixel and repainted nothing leaves the canvas alone; an arriving worker batch is laid at the last phase.
- *React*: `SkyCanvas` lays the `sky` layer as its canvas's CSS background (`skyBackground`) and paints the rest; in the
  app `SceneCanvas` portals it into `ui/Sky.tsx`'s `[data-sky]` under the birds (`zIndex −1`), the figure's place in the
  sky measured by `useSkyHost` (ResizeObserver on the sky, the figure and the page); `SceneBox` gains `skyWidth` and
  `landLeft`. With `?canvas=1` App mounts no `Atmosphere` and no CSS stars.
- *Harness and runners*: weather moments `thunder`, `hot`, `broken`; `phase=<s>|flash` lays the sky at a phase (a still
  of the animation); `openPage` uses reduced motion (one still frame at phase 0, no loop racing a still or a scrub) unless
  `motion`; stills take a full date (`place@2026-11-24T21:00@clear`: another phase of the moon) and a phase; the perf
  runner measures `anim.sky` for 10 s at a stormy hour with motion on; `e2e/scene.world.mjs` prints a moment's world.
- *Kept, rebuilt, dropped from the WebGL sky* (`atmo/gl/`, unmounted under the flag, deleted at C9): **kept** the
  gradient (the same palette), the sun's glow and bloom (a hot day widens it), the twilight arch (Earth's shadow, belt of
  Venus), the afterglow on clouds (now on the world's banks, by height), lit sun-side cloud faces, the moon lighting
  cloud edges, the satellite's seen clouds (world banks), overcast darkening (the palette and the closing wash), haze
  over the lower sky (the band); **rebuilt** the in-cloud lightning (flash layers on a seeded schedule, drifting with
  their layer), the heat shimmer (a drifting tile of wavering lines over the far horizon, on the sky surface as the WebGL
  had it; the land-edge displacement of §1f stays for C7), the moving noise (banks drifting with the wind at their
  height, the right way: east on the left, a westerly moves right to left); **dropped for now** the crepuscular rays
  (through cloud gaps, and from under the ridge at twilight) and the particle passes (rain, snow, dust grains, wind
  streaks): the particles are C7's, the rays are listed for C7 with the shafts. The shipped WebGL sky's `windU` bug is
  left as it is (owner decision 9: it goes at C9); the canvas drift reads the world's camera-aware wind, tested in
  screen terms.
- *Tests* (`scene/model/sky.test.ts`, 44 over the 8 places): the sun and moon discs at the world's position (x through
  the camera within 1 px, y on the relief at the apparent altitude); stars none by day, none under full cover, fewer under
  half cover and only from the clear field's subset; each cloud's light from the sun's side on screen (direction within
  half the 8° key step), lit undersides at a low sun; drift sign = the wind at that height in screen terms (a westerly
  right to left), speed = the world's drift, faster aloft, period = 360° of the camera; no flash without thunder (also
  with rain but no thunder code), flashes only in raining banks, drifting with their layer; drift and flash pure
  functions of the phase (strikes seeded, ≥ 7 s apart); painters' call logs the same twice; descs structured-cloneable.
  `model.test.ts` updated for the sky's layers (the land's order unchanged).
- *Pixel references*: all 53 rewritten deliberately for the sky: every reference's sky rows change (the sky is drawn:
  glows, discs, stars, clouds as the fixture's covers say); the land rows change where the sky shows through over the
  ridges, and on the land itself only where the light changed (the overcast NaN fix and the full mid deck: e.g. Haifa
  rain, max 10/255; elsewhere ≤ 1/255 or a single pixel). 53/53 on re-run on the worker path and on the main-thread path
  (`SCENE_PAINT=main`).
- *Stills* `qa/canvas/c6/` (dpr 2, overlay): clear noon (Haifa, Ramon), broken noon (Shadmot), the fixture's noon
  (Jerusalem), golden (Tiberias 06:20, Haifa and Rosh Pina 16:20), twilight (Ein Gedi 05:50, Jerusalem 17:00), night with
  the moon at first quarter (Haifa 21:00), full (Rosh Pina, 24 Nov) and a thin crescent at dusk (Tel Aviv, 12 Nov),
  overcast (Jerusalem), rain (Haifa), thunder with a flash (Tiberias, `@flash`), dust (Jerusalem), a hot day (Ein Gedi);
  `contact-sheet.png` (all of them); `sheet-svg-canvas.png` (the app itself, SVG | canvas, sky included: Tiberias 06:20,
  Jerusalem 12:00, Haifa 16:20, Haifa 21:00).
- *Critique* (2× crops). Works: the sunrise over the Golan at Tiberias (the disc half over the far ridge, the warm
  horizon, the afterglow pink on the banks); a broken sunset at Haifa where some banks stand in the mid deck's gaps and
  take gold on their undersides while the rest sit in its shade; the moon's phases (a full moon rising in the east with
  its glow and fewer faint stars; a thin crescent with the dark disc's hairline in the dusk); dust tints the clouds; the
  overcast and the rain close into a grey deck with darker bases; the flash reads as a cloud lit from within. Still
  wrong: the deck's sheets are soft lozenges, a little airbrushed at 4×, with no torn edges; the cirrus strands are too
  regular (combed lines more than wisps); heaps near the horizon are small blobs; under the thunder moment the sun still
  shows as a pale patch (the covers the fixture gives); a rain deck's top layer catches a bright rim that reads as a
  plate; the clouds' wash at 1 px per CSS px is a little softer than the land at dpr 2.75; at Haifa 16:20 the moon the
  SVG shows is hidden (the world's layers count the thick cloud higher than the shown cover the SVG uses).
- *Perf* (`qa/canvas/perf.md`, C6): on the worker path the main thread is within its gates: the
  sky's scrub frame 0.4–0.5 ms p50 / 1.1–1.3 p95 (C1–C3: 12–21 ms), the animated frame 0.6–0.7 / 1.2 ms (budget 4), first
  paint 21–32 ms; the cold model as before (Haifa 30 ms, over; Shadmot's scrub.model p95 16.5, 1.5 ms over ×1.5). **The
  clouds' repaint is the cost**: 380–620 ms per sky batch in the worker at ×4, so the sky's light trails a scrub by
  0.2–0.4 s (the land's by 0.18–0.34); on the main-thread fallback 145–167 ms p50 a scrub frame, over the gate.
- *Decisions where the plan was vague, and departures*:
  - **The sky's base is CSS** (`skyBackground` on the sky canvas): the browser composites it off the main thread (on the
    phone's GPU), where a full-surface canvas fill pays per pixel each time the light changes; `paintSky` stays and
    paints the same desc where a canvas is wanted.
  - **The dome**: clouds use the relief to 22° and spread the rest of the dome over the sky above (the bodies keep the
    true scale); a cloud in front of a high sun is not at the sun's y (the disc's veil is the covers' expected share).
  - **A layer's field** (clouds beyond the world's named banks, to the layer's cover) is drawn by the model from the
    world's covers, seeded by place, level and index; the rain and the flashes come only from the world's banks.
  - **Drift wraps round the whole horizon** (the band is 360° of the camera): nothing pops in, the clouds behind the
    view come round. The speed is the world's (C0's 0.4 px/s per km/h at the layer's height): livelier than the true
    angular speed of a cloud kilometres away.
  - **Soft wash at 1 px per CSS px** inside the cloud painter, laid up into the 1:1 cache (the plan's soft-layer ratio,
    done in the painter; the contract's "never scale a cached bitmap up" holds for the cache itself).
  - **Stars do not turn with the hour** (one fixed seeded field, as the app's): the upper sky is not a projection.
  - No deploys needed for C6.

**C5 done (2026-11-19): every place seen from outside, one builder (owner decision 11), with B's open items.** Commits on
`ccr-85ec24f0-9ayxgu`; the shipped app and the SVG baseline are unchanged (snapshots untouched; the SVG's landmark pool,
`select()` and `panoramaShortlist` keep their old rule by default; the panorama's new local grid is ignored by the SVG).
- *Drawing with the anidoodle skill* (owner decision 7): the references read again; the look proved on one still (Tel
  Aviv 16:30), critiqued on 2–3× crops, then extended to the six skyline cities and the continuum places.
- *Rules implemented* (all general, no place named in code):
  - **One builder** (`world/outside.ts`, `outsidePlace`): every place over a panorama. Its fabric is the land cover's
    built cells (WorldCover, ~60 × 50 m, `WorldInput.cover`) within its own boundary, each a box at its real width and
    roof height (the city raster's storeys / p90 under it, else a one- or two-storey house); towers fold into the mass
    or rise as spires (B, `outsideSkyline` with `fabric`); trees where the cover has them within 120 m of a built cell
    (≤ 900, nearest first). In the model (`model/outside.ts`) a cell under 12.5 m is a house (tile / flat roof by the
    roof evidence, mixed half and half otherwise, heaters on some flat roofs), above it a block of the mass. Without the
    land cover the raster's squares stand in.
  - **Frame at the place's own boundary** (item 6, `data/city/bounds.ts`): the mapped administrative boundary that holds
    the place (the smallest, if nested); else the weighted cell of the place points (distance over reach, the clusters'
    own rule). The frame is the extent of the place's built cells inside it (2nd–98th percentile each way, so a lone
    outlier does not widen it), clipped to the reach. **Data source**: OSM `boundary=administrative` relations in the
    Geofabrik extract the city and landmark data are built from (`osmium tags-filter … r/boundary=administrative`,
    `osmium export`), reduced by `scripts/city/bounds.ts` to `public/data/city/bounds.json` (203 kB, 252 boundaries for
    the 2187 place points of the city data, rings simplified to 40 m): a place's boundary is the largest polygon (admin
    level ≥ 6) holding its point and no rival point (another place of its rank or higher, a town ranking with a city), so a
    municipality is a city's, a kibbutz's own polygon a kibbutz's, and a regional council (holding rival villages) or a
    district nobody's. Loaded only by the canvas (`loadBounds`).
  - **Rows climb the slope** (item 2): the panorama gains a local ground grid (`Panorama.local`, 49 × 49 at 250 m, every
    direction; `terrain.heightNear`; stored as the optional `g`, recorded into the fixtures by
    `scripts/fixtures/recordLocalGround.ts` without touching their rays). The place's top (95th percentile of its built
    cells' ground) stands on the ridge line; each row lower by its height under that top at the view's px per metre;
    the near drop and the slope pressed by one factor into the room between the ridge line at the dot and the sheet.
  - **One frame scale**, continuous in the place's extent: half width `30 + 35·extent` px; heights `0.18·(5/extent)^0.8`
    px per metre (Tel Aviv as the study had it; a village of 0.6 km ~1 px a metre). Haze per row: the near ridge's
    distance at the dot plus how far south of the near edge it is.
  - **Towers beyond the place** (item 3): within 6 km, outside the frame or the boundary, at their true bearing on the
    true land (`projectSkylineTowers`), famous / ≥ 150 m as full towers, others as silhouettes thinned by A's soft slot
    budget (cap 2 per 10 px).
  - **Coastal sea** (item 1): where the water mask's *sea* reaches the screen's edge across the place's rows with its
    coast within a km of the frame: a level band along the foot of the land from the coast to the edge (never above the
    land's line), its tones the sky mirrored by Fresnel over the water's dark after the air, a shore line, ripples by the
    wind, the light's path where the sun or moon stands over it. A lake stays true water in view (not a band).
  - **Icons** (item 4): the place's own marks (icons included) are items of the outside layer, drawn back to front with
    the mass in the hour's light and haze (lit side = the world's).
  - **Industrial landmarks** (item 5, `data/landmarks/industrial.ts`): a chimney, cooling tower, silo, mast or turbine
    keeps its name only when it is a name (not its operator / owner / brand, not a status or construction note, not its
    bare kind), unless its own article's title carries the word; fame only with that name; a landmark beyond the place
    needs name + fame or ≥ 200 m. Applied by the landmarks build from the tags (`parseOverpass`'s `name` option) and by
    the world to the rows (fame 2 standing for the article). **Finding**: OSM's "לבניה" cooling tower (32.79335,
    35.05157) is not a construction note: it carries `wikidata=Q47466318` ("הלבניות", Halebeniyot, "צמד מגדלי קירור
    בחיפה") and `wikipedia=he:הלבניות`; its article confirms the name, so by the rule it stays a named, famous landmark of
    Haifa. No per-object fix was made; if the owner wants it gone, the rule (not the object) must change.
  - **Far-mark rule everywhere** (coordinator's addition): beyond the place (portrait reach + 1 km, or the outside
    frame / boundary) the canvas keeps only landmarks (`landmarkBeyond`); `select()` takes `farRule: 'landmark'` (no
    chimney / cooling / turbine kept by kind), `panoramaShortlist(…, 'landmark')` gives the canvas its own pool
    (`sceneMarks`, `useLandmarks(…, scene)`). The SVG path keeps `kind` (default). Rosh Pina's unnamed Golan turbines are
    gone from the canvas.
- *Numbers per place* (16:30, the test fixtures; towers in the place, B glyph / spire / folded; items drawn after the
  text zones): Tel Aviv: boundary תל־אביב–יפו, 194 towers (was 301 in the cluster frame) 10 / 17 / 167; 463 blocks, 174
  houses, 771 trees, 34 towers drawn; 17 beyond (10 full); sea. Ramat Gan: boundary רמת גן, 69 towers 5 / 35 / 29; 261
  blocks, 51 houses; 69 beyond (Tel Aviv's, 10 full, at their bearing); no sea. Haifa: boundary חיפה, 96 towers 5 / 4 /
  87; 1395 blocks, 1140 houses, 892 trees; 3 beyond (Eshkol Tower full, 5.8 km); sea. Jerusalem: boundary ירושלים, 97
  towers 3 / 6 / 88; 710 blocks, 359 houses. Be'er Sheva: boundary באר שבע, 104 towers 0 / 14 / 90; 370 blocks, 173
  houses. Netanya: boundary נתניה, 95 towers 2 / 22 / 71; 151 blocks, 86 houses; sea. Continuum: Shadmot (cell) 36
  houses, 11 trees; Nahalal (cell) 69 houses, 84 trees; Rosh Pina (boundary) 215 houses, 382 trees; Zikhron Ya'akov
  (boundary) 270 houses, 18 blocks, 687 trees. The study's B counts reproduce within 2 per class with the study's
  frame (Tel Aviv 10 / 52 / 239 against 10 / 54 / 237; the fixture's ridge differs from the live one by fractions of a px).
- *Tests*: `scene/model/outside.test.ts` (73): per city: seen from outside at its mapped boundary from the land cover;
  east left / west right of the dot and, row by row, east further left; depth by north–south (north nearer, larger per
  metre, drawn later); 300 m over 90 m; no duplicate tower, none dropped (glyph + spire + folded = in place); nothing
  under the label, notes or the dot's clearing; bases above the sheet. Ramat Gan cut at its boundary (no Tel Aviv spot
  in it, a narrower frame than its cluster's), the cell fallback, Tel Aviv's towers beyond it at their bearing; Eshkol
  Tower a full tower; Haifa's bay rows > 10 px below its Carmel rows, Tel Aviv flat on its line; coastal sea for Tel Aviv,
  Haifa, Netanya, none for six inland places; the continuum (villages: houses and trees, no blocks; block share
  village < town < city; houses only on built cells; nothing in Ramon crater); the study's B counts; the far-mark and
  industrial rules (incl. the SVG pool unchanged); light side, windows by night, haze by row. C4's portrait tests now
  test the village seen from outside; `world.test.ts`'s portrait/outside test is the one-builder test.
- *Pixel references*: all rewritten deliberately but Ramon crater's four (no built cells, unchanged: restored byte for
  byte, their only difference was ±1 sky noise): every place's land now carries its outside view (houses, blocks, mass,
  trees, marks among them, the coastal sea at Haifa); the sky rows differ by ±1 only. 53/53 on both paint paths.
- *Stills* `qa/canvas/c5/` (dpr 2, overlay): the six skyline cities at 11:00, 16:30, 21:00; Shadmot, Rosh Pina,
  Nahalal, Zikhron Ya'akov at 11:00 and 16:30; `sheet-svg-canvas.png` (the app, SVG | canvas: Tel Aviv and Netanya
  16:30, Ramat Gan, Haifa, Jerusalem, Be'er Sheva 11:00); `sheet-skyline-b.png` (the `?skyline=b` study's B panel |
  C5, the six cities at 11:00); `sheet-continuum.png` (village → moshav → town → city at 11:00). New panorama fixtures:
  Be'er Sheva, Netanya, Nahalal, Zikhron Ya'akov.
- *Critique* (2–3× crops). Works: one picture rule from Shadmot to Tel Aviv: villages read as tiled houses among trees
  on their slope, Zikhron as a town strung along its ridge, Netanya and Tel Aviv as dense mass with spires; Haifa climbs
  the Carmel from the bay to the crest (the open item answered); Ramat Gan is only Ramat Gan, Tel Aviv standing beside it
  at its bearing; by night the windows and the red aviation lights read well; the setting sun's path lies on Tel Aviv's
  sea. Still wrong: under the fixture's cloud the lit faces are faint (direct 0.06–0.10 at 15:00–16:30), so the cities
  read grey; the towers beyond Ramat Gan are large (true angle and the land's relief scale) and compete with the place;
  the mass's boxes are a regular stipple of window rows at 3×; villages are small (Rosh Pina's houses 2–3 px) where
  their built cells spread wide; Zikhron's rows follow the true ridge line's undulation, which reads as a string of houses
  rather than a town on a hill (the place sits on the true near ridge's line, the SVG study's rule, kept); the coastal
  band is thin (7 px) by design.
- *Perf* (`qa/canvas/perf.md`, C5): paint gates within budget; over: cold model of the cities (40 ms) and the scrub
  model's p95 (17 ms; p50 7–8); the world's place part 50–90 ms in node for a city, once per place.
- *Departures and decisions where the plan was vague*: the scope change (decision 11) replaces the portrait / outside
  split; the frame's halfwidth and height scale became continuous functions of the extent (the study's fixed 0.18 px a
  metre and 90 % width are the 5 km end of them); the sea band lies along the foot of the land (as v1b's bay), not on
  the ridge line, where it floated as a slab over Haifa's Carmel; lakes are left to the true water layer; a mark under
  the label when the label found no free spot gives way to the text (it happens only in the tests' below-sea-level
  fixture height); `OutsideView` gains `bounds`, `topM`, `beyond`, `baseKm`, `trees`, `fabric`, `roofs`;
  `WaterState.coastalSea` is filled from the place part; `WorldInput` gains `waterMask`, `bounds`, `cover`.


**C7 done (2026-11-19): the weather.** Commits on the stage's branch (after merging C6 into C4, then C5 into it); the SVG
baseline and the shipped app are unchanged (snapshots untouched; everything below runs only under `?canvas=1`).
- *Drawing with the anidoodle skill* (owner decision 7): `SKILL.md`, `craft-bar.md`, `realism-and-craft.md`,
  `determinism-and-contract.md`, `working-method.md`, `workflows/site-art.md` read first; real reference named in
  `paint/weather.ts`'s header (rain shafts under a cumulus line 5–20 km off, near rain against dark ground and grey sky,
  valley fog after a wet night, a cooling tower's plume in wind, wet limestone and roads, crepuscular rays through a
  broken deck). The look proved on one still (Haifa 12:00 rain, wind from the west), critiqued on 2× crops (the near rain
  first read as hard vertical panels: fixed by nested columns with their own marks, so the rain thins to its edges and
  its top), then extended.
- *World* (small, general): `rain.ts` `snowFrom` (snow falls only from the precipitating layer's banks, at their true
  azimuths, slanted by the one wind: flakes fall ~1 m/s, so the slant is far larger than rain's); falling snow chooses
  (or raises) its cloud layer by the rain's own rule, so `CloudLayer.rains` now also means "snows". `WorldState.snowfall`;
  `keys.rain` covers it.
- *Model* (`scene/model/weather.ts`, all from the one world state, no place named):
  - **rain and snow** only from the banks `world.rain.cells` / `world.snowfall.cells` name, as their cloud layer draws
    them (C6): banks low on the dome (< `NEAR_ALT` 30°) hang a curtain (`shafts`) from their base to the horizon, its
    foot carried downwind by the slant, faded by the air at the bank's distance, on the cloud band (drifting with it);
    the falling streaks inside each curtain (`fall.far`); banks overhead rain round the eye (`fall.near` on the sky,
    `fall.land` over the land, z 60: over the houses), in nested columns under each bank. Fall speed and slant from the
    rate and the one wind (vx = vy · tan slant), snow with a sway.
  - **edge mark** (true-scene plan): it rains or snows but none of those banks is in view → a heavy shower cloud and its
    curtain cut by the frame's edge on the side the nearest falling bank truly lies (the short way round the horizon),
    standing over the highest crest under it. Static: it marks a direction (the bands drift round the horizon, so a
    falling bank behind may come round later and rain in view; the mark is decided at the world's true positions).
  - **wet ground**: the planes' darkening is C2's (`ground.wet`); `sheen` adds short level glints of the sky on the near
    ridge's face, out of the text zones, by wetness and sky brightness.
  - **snow** on the ground is C2's caps (the snow line); the fall above.
  - **mist** (`mistiness`: humidity 84–99 % and visibility; never in dust): a level lake of mist in the valley between
    the near ridge and the far one (z 20, its top rising from just over the near crest toward the far crest with the
    mistiness), and, when the visibility is down to a few km, ground fog over the near ridge's foot (z 45); drifting
    tiles with the ground wind.
  - **dust** (`air.dust`): drifting grains over the land and the low sky (the tint is the air's, C3/C6); a gale without
    dust (≥ 10 m/s) draws faint wind streaks in the sky.
  - **crepuscular rays**: a sun from −3° to 10° behind broken low/mid cloud with the sky as a whole not closed, no dust:
    seeded wedges from the sun, mostly cloud shadows, some lit beams, under the clouds (z 5.5).
  - **smoke and steam** from every mark the world gives as a chimney or cooling tower (the one builder's, C5),
    downwind, laid over in a gale, in the light and the air at its distance; a strip of 8 frames (1 s loop).
  - **tree sway**: `Shine.sway` from the wind and gusts (none under 2.5 m/s); the outside builder's trees (and C4's
    portrait, still used by nothing) rock about their lean in a strip of 4 frames at 2 fps.
  - **water**: C3's ripples run downwind and rise and fall over a 1 s loop of 6 frames, the glint's sparks twinkle and
    its core breathes; the same for C5's coastal sea on the outside layer.
- *Compositor* (`compose/`): two composite-time animations besides C6's drift and flash. **Strips** (`AnimSpec.frames`):
  a layer's canvas holds `count` frames stacked down it, each painted once at phase `i / fps` (`paintPart`, the same in the
  worker and on the main thread; each frame clipped to its band), and the frame at the phase is laid with a source rect
  (`frameAt`). **Falling tiles** (`AnimSpec.fall`): the layer's canvas is a small tile laid as a repeating pattern inside
  its areas, the pattern offset by `fallAt` (the fall and the sway, whole device px), the areas drifting with their cloud
  layer and repeated every `period`; each area takes the pattern at its own offset, so nested areas add marks. Nothing
  is repainted per frame. A strip's frames are in its keys. The worker paints a strip whole; the main thread's cache
  paints it a frame at a time (the frame shown when its key changes, the rest as the loop first lays them), so a scrub on
  the fallback pays for one frame, not the strip.
- *Tests* (`scene/model/weather.test.ts`, 46 over the 8 places; 2 in `compose.test.ts`): no shaft, fall or edge without a
  raining or snowing bank (clear, overcast, broken, fog), every curtain under a falling bank low on the dome and every
  fall area under one; rain slant, snow carry, curtain and edge lean signs = the wind's, the falling layers drift with
  their cloud layer; the edge mark only when no falling bank is in view, on the nearest one's side; mist only with a damp
  or foggy air (the valley first, ground fog only at low visibility), drifting with the wind; rays only at a low sun with
  broken cloud (none at noon, under a clear or closed sky, in dust); smoke downwind, laid over more in a gale; sway only
  in a wind; water and coastal-sea ripples downwind; sheen only when wet; `frameAt`/`fallAt` pure and periodic; painters'
  calls the same twice and the same a loop later, and different half a loop on; descs structured-cloneable; a strip's
  canvas and the frame laid at a phase; a fall's pattern offset.
- *Pixel references*: all 53 re-recorded deliberately (after the C5 merge): rain, snow, mist, sheen and smoke where the
  moments have them, and at phase 0 the water's ripples and the trees' sway change a little everywhere; 53/53 on both
  paint paths. The harness lays the land at `phase` too, and has three more moments (`fog`, `showers`, `gale`).
- *Stills* `qa/canvas/c7/` (dpr 2, overlay): Haifa 12:00 rain (the look still), 14:00 showers (edge mark left), 16:20
  broken (rays), Jerusalem 12:00 showers (edge mark), snow, dust, Rosh Pina 12:00 gale, Tel Aviv 12:00 rain, Tiberias
  07:30 fog and rain, 12:00 thunder; `strips/*-strip.png` (the lower half at phases 0, 0.25, 0.5, 0.75: Haifa rain,
  Tiberias fog, Jerusalem snow, Rosh Pina gale, Tel Aviv rain); `contact-sheet.png`.
- *Critique* (2× crops). Works: the near rain reads as rain sweeping in under the banks, thickening to their middle and
  slanted the way the wind goes; the edge mark reads as a shower off to one side, its curtain leaning downwind behind the
  ridge; valley fog at Tiberias lies level over the lake with the ridges standing out of it; snow has near and far flakes;
  steam bends off the cooling towers downwind; rays at Haifa's sunset fan as shadows in a warm haze. Still wrong: far
  curtains are rare in the fixture's moments (its rain decks are mid cloud, low on the dome only far off, so the curtains
  are short and faint at the horizon: true to the data, but the v1b look of tall shafts over the ridge shows only when a
  low deck rains 10–30° up); the near rain's streaks are a little uniform in weight; the sheen strokes read as dashes at
  4×; the edge mark's cloud is a soft heap with no lit top; snow in the sky is dense at a heavy fall (an even scatter at a
  glance); the dust grains barely show at 1×.
- *Perf* (`qa/canvas/perf.md`, C7): the animated frame, sky + land, 1.1–1.8 ms p50, 2.9–3.1 ms p95 at the thunder moment
  (budget 4); worker cold batch at thunder sky 282–384, land 147–466 ms; memory 25.5–33.3 MB. The weather's model is
  ~0.1–0.16 ms of the model (unthrottled, node); the cold-model and scrub-model overs are C5's and C6's (below).
- *Decisions and departures*:
  - The plan's single `weather` layer kind became eight (`shafts`, `fall`, `mist`, `grains`, `rays`, `smoke`, `sheen`,
    `edge`), each cached and animated its own way; `RainField`/`Shaft`/`MistBand` placeholders removed.
  - Near rain is the falling banks overhead (≥ 30°), not the forecast's rate at the place as such: rain only from banks.
  - The land-edge heat displacement of §1f is not built (C6's drifting shimmer lines stay the heat's only sign).
  - Mist, smoke and sheen are all light over an empty form (the water's pattern), so a scrub repaints their light only;
    the model test's scrub rule is held for the land's other layers (the weather comes and goes with the hour).
  - No deploys needed for C7.

**C5b done (2026-11-19): polish of the outside view, every item a general rule.** Commits on `ccr-85ec24f0-9ayxgu` (after
merging C6 + C7 into it); the SVG baseline is unchanged (snapshots untouched; `groundFn`'s binary search and
`dedupeTowers`' buckets give the same answers as before; the SVG's `baseYAt` and `outsideSkyline` without a `look` or a
`lie.baseY` are as they were). Before/after: `qa/canvas/c5b/sheet-before-after.png` (the continuum places and the six
cities at 11:00 and 16:30, C5 on the left, C5b on the right; the stills beside it, dpr 2, overlay).
- *Drawing with the anidoodle skill* (owner decision 7): craft-bar, realism-and-craft and determinism read again; each
  change looked at on 2–3× crops (Netanya's shore, Zikhron's and Rosh Pina's houses, Jerusalem and Tel Aviv's mass under
  the cloud, Ramat Gan's towers beyond, Haifa's bay).
- **The coastal sea is the sea seen from outside** (item 1, `world/outside.ts` `coastalSeaOf`, `model/outside.ts`
  `seaOf`): water from the shore out to the true sea horizon, a level line at the panorama's own sea horizon
  (`seaHorizonY`: the highest the sea surface is seen from the panorama's eye, curvature and refraction; `SceneTerrain`
  gains `eyeM`), down to the sheet and under it. One perspective for the whole water (a row at depth d lies `C / d` below
  the horizon); the shore from the water mask row by row through the place's depth, on south toward the horizon where the
  mask has it, and on north straight toward the eye (perspective alone, so the water never spreads under the place's
  foreground). On the sea the place's rows below the dot are stretched (one factor) so its shore lies at that horizon.
  Tones by C3's own rule for open water (`openWaterTone`: Fresnel over the water's dark at each row's angle below eye
  level, the air at its distance), graded from the horizon's ~15–24 km to the near water; a fine light horizon line, the
  shore line, ripples shorter and fainter toward the horizon (C7's running ripples and glint twinkle kept), the light's
  path widening toward the eye. Haifa's bay stays a wedge at the foot of the Carmel rows (its horizon under them).
- **Every row stands on the place's own ground** (item 2, `lieOf`): the dot (the place point) on the ridge line where the
  panorama draws it; every spot above or below it by its ground's height over the place point's (the panorama's local
  grid) and by its depth, in the frame's perspective; below the dot pressed into the room to the sheet, above it into the
  room up to the highest ridge line over the place's width, and never more than 6 px over the ridge line in view at its
  own x (no plateau in the sky). The ridge line's undulation is no longer followed. Where the place's ground rises over
  the ridge line it is drawn (`OutsideView.land`: its silhouette from the local ground, land only by the water mask, eased
  into the line at its ends, the near land's tone, its crest catching the sky). `PlaceLie.baseY` and `lieBaseY` carry it
  to the mass, towers, trees, marks (a mark moved across never floats over the land there) and fields. Zikhron Ya'akov
  now reads as a body of houses round the dot, several rows stepping up its hill; Rosh Pina climbs its slope; Haifa still
  climbs the Carmel from the bay.
- **Houses stay legible** (item 3, `legibleHouse`, `lookOf`, `fabricBoxes`): the smallest legible two-storey house,
  continuous in the place's extent (4.2 × 5.2 px for a place up to 1.5 km, 2.6 × 3.2 px for a 5 km city); the low fabric
  (to 12.5 m) takes at least its px a metre, the rest the frame's own above it (every height in its true order, a 300 m
  tower within 10 % of its true size); a house cell narrower on screen is not shrunk: houses are composed fewer and
  larger, one per slot of the legible size, at the cell nearest the slot's middle (inside the footprint); trees sized
  with them and one to a slot. Rosh Pina's houses are ~4.4 px wide (were 1.3–1.8).
- **The mass has form from the sky under the cloud** (item 4, `skyFormOf`, painter `skyLight`): a roof sees the whole
  sky, a wall half of it and its foot among the others less; the face turned to the sun's half of the sky (its side on
  the screen, also with the sun behind cloud) sees the brighter half, in the sun's colour through the cloud. Its strength
  grows as the direct light fades (0.35 + 0.65 × (1 − direct)), none by night: box tops and a tower's upper shaft
  lighter, feet darker, the sky-side face lighter, flat roofs' edges in the sky's tone. No fake sun: the lit face and the
  cast shadow still follow `light.direct` alone. Under the fixture's evening cloud the effect is real but modest (the
  dusk sky itself is dark): Jerusalem at 16:30 reads as a backlit mass with lighter tops rather than flat grey.
- **Towers beyond the place in the same perspective** (item 5, `beyondTowers`): at their true spot in the outside view's
  own projection (x and base by the place's rule, never above the ridge line in view), their height by the perspective
  at their depth, never nearer than the place's near edge (so never larger a metre than the place's own there), hazed by
  their distance from the near edge (never less than the place's near row). Tel Aviv's towers seen from Ramat Gan fall
  from up to 0.48 px a metre (C5) to ≤ 0.33 (Ramat Gan's own: 0.26–0.29); the panorama projection
  (`projectSkylineTowers`) is no longer needed for them.
- **Perf** (item 6, `qa/canvas/perf.md` C5b): the place part in node, warm, Tel Aviv 66 → 30 ms, Jerusalem 81 → 40,
  Ramat Gan 77 → 14, Haifa 55 → 30, Be'er Sheva 40 → 22, Netanya 27 → 15 (cold first build 90 / 51 ms for Tel Aviv /
  Haifa); in the browser at ×4 worldCold Haifa 785 → 480–566, Tel Aviv 684 → 449–492. From: `dedupeTowers` by 15 m
  buckets (it was all-pairs, 114 ms of 4 Tel Aviv builds), `groundFn` by binary search, one sort for the frame's
  quantiles, each cell's ground read once, the towers beyond without the panorama projection. modelCold stays over its
  gate (31–55 ms for the cities, n = 1, noisy) and the scrub model's p95 too (23–28 ms): **not moved off the first paint
  path nor into the worker** (the place part needs the land cover, raster, mask and boundaries, which live on the main
  thread; the shape cache is per place view). The next step would be to build `placeOf` in the paint worker (or a
  worker of its own) from transferable inputs, or to build it as soon as its own inputs arrive (before the forecast).
- *Tests* (`scene/model/outside.test.ts`, 95, +22): the sea's level top at `seaHorizonY`, nothing above it, its shore
  from the horizon down never back up, its distance falling down the water, the shore receding (no slab), tones darker
  toward the eye, Haifa's bay under its Carmel rows, the light's path at 16:30; every village / town on its own ground
  (same depth and ground → same height wherever the ridge line is, unless capped over a dip; nothing floats over the land
  in view), Zikhron's body (≥ 4 row levels over > 8 px, higher ground higher by rank correlation); legible houses (width
  and height at their depth, Rosh Pina's median > 3.5 px), the legible size continuous and falling with the extent, heights
  in order under `look`; the sky's form (tops lighter, feet darker, the face to the sun's side, none by night); towers
  beyond no larger a metre than the place's at its near edge or at their own depth, hazed no less than its near row, east
  left / west right, Tel Aviv's from Ramat Gan no longer outgrowing Ramat Gan's. `marks.test.ts`: marks of a place seen
  from outside stand on the land in view (fields on their own row).
- *Pixel references*: re-recorded deliberately, 49 of 53 (all with an outside view; Ramon crater's four unchanged),
  53/53 on both paint paths (worker and `SCENE_PAINT=main`).
- *Not fixed*: the vertical tone edge in Tiberias' fog (C7's note) is not the place's boundary: it is the near plane's
  haze turning over ~15 px where the near crest's distance jumps (`hazeKm`), which a fog makes stark; a planes-painter
  matter, left. Departures: the towers beyond leave the panorama's projection for the outside view's (their x by the same
  rule as the place's rows); the place's label now also avoids the mass round the dot and tries, last, a spot over it.

**C8 done (2026-11-19): loading as an animation.** Commits on the stage's branch (after C7, merged with C5b); the SVG
baseline and the shipped app are unchanged (snapshots untouched; everything below runs only under `?canvas=1`, but for
`useTerrain`, which now also says whether the land is loading or offline: the SVG scene reads nothing new).
- *Drawing with the anidoodle skill* (owner decision 7): `SKILL.md`, `craft-bar.md`, `realism-and-craft.md`,
  `determinism-and-contract.md`, `motion-grammar.md`, `working-method.md` read first; real reference named in
  `paint/loading.ts`'s header (a valley filling with morning fog seen from a ridge road, the far crest a soft darker line
  through it, lost in places, its mass a breath darker beneath, the bank's tops catching a low sun). The look proved on one
  still (Jerusalem 16:30 loading) and one phase strip (its arrival), critiqued on 2× crops, then extended. The craft bar's
  "fade-in" and "never dissolve two copies of one thing" shaped the arrival: the ridge line is *made* from the place
  outward (not faded in), the guess is unmade over the same front as the true crest is drawn (no ghost of two lines), and
  the land comes up *under* a thinning mist (revealed from behind) rather than dissolving over the sky.
- *Data* (`data/terrain/terrain.ts`): `LandStatus` (`ready | loading | offline`); `useTerrain` returns it on the terrain
  (`SceneTerrain.status`): `offline` when the fetch failed with no stored panorama, retried on the `online` event.
- *World*: `world/terrain.ts` `landStatusOf`, `UNKNOWN_EYE_Y` (= `MIDDLE_Y`, 96: where the panorama puts eye level when
  the near ridge due south stands at it, the middle of the places' range 66–105) and `unknownLand(status)`: while the land
  is not known the world stands on **no land** (a flat eye level, no ridge), whatever terrain App hands it (today the drawn
  stand-in, ignored): the sun and moon set at their true horizon, nothing is placed (`unknownPlace`: no portrait, no marks,
  no notes, no far towns, no water), and the world is cheap (43–54 ms cold at ×4 against 230–560 ms with the land).
  `TerrainPlanes.status`; `keys.terrain` carries it. **The drawn stand-ins are no longer used by the canvas path.**
- *Model* (`scene/model/loading.ts`, `index.ts`): `sceneModel(world, box, clock?)`.
  - **Not known** (`unknownModel`): the sky and the weather that needs no land (`fall.land`, `grains.land`) as they are;
    in the land's place the **mist** (`loading.mist`, z 48, under the near rain): wisps, a dense bank from a little over the
    guessed eye level, a darker foot (the land under it), puffs along the tops lit by a low sun through the cloud; a
    300 px tile drifting with the ground wind, slower offline; its tones only from what does not depend on the land
    (palette, air, the sun's true altitude, the covers), so it is the same canvas before and through the arrival. While
    loading (not offline) the **guess** line (`loading.guess`, z 49): a generic soft ridge round the guessed eye level
    (seeded value noise at two scales, never the place's shape, never a sine), its mass a breath darker beneath, the line
    thick-thin and lost in places; made from the place outward over 2.8 s after a 0.5 s mist, then breathing. No overlay,
    no clear zones: **the labels wait for the land**. Offline: the mist alone, quiet.
  - **Arriving** (`arrivingLayers`, `ARRIVAL`, `ARRIVAL_END` 1.9 s): the known land's model, unchanged (same layers, same
    keys: nothing repainted for it) with: every land layer that stands on the land (planes, water, far towns, marks, the
    outside view with its own land, sheen, smoke, the coastal sea: everything but the near rain and the dust) fading 0 → 1
    over 0.3–1.7 s; the mist 1 → 0 over 0.35–1.85 s; the true near crest (`loading.crest`) drawn from the place outward
    over 0–0.9 s while the guess is unmade over the same front, both gone by 1.9 s; every sky layer gliding from the guessed
    eye level to the land's (`fromHorizonY − relief.horizonY`, −30…+9 px over the places) over 0.3–1.7 s. Held at its
    start (land alpha 0, mist whole) while the land's layers are still being painted.
- *Compositor*: `AnimSpec` gains `mode: 'settle'` and `fade` (a `Ramp`), `reveal` (a window from `x`, feathered in 5
  slices, `erase` for its complement, `still: whole | hide`), `glide` (applied only to a canvas painted for its desc: a
  stale one stands where it was painted), `breath`; `anim.ts` `ease`, `rampAt`, `fadeAt`, `glideAt`, `revealAt`,
  `settleEnd`, all pure. `Surface.composite(layers, phase, still)`: reduced motion lays drifts, strips, falls and flashes
  at phase 0, no glide, no window (the guess whole, the crest hidden), but runs the fades; `makeLoop` runs, still, to
  `settleEnd` under reduced motion so the arrival's **simple fade** plays, then stops. **One scene clock**: every loop's
  phase now runs from `SCENE_EPOCH` (`useSurface.ts`, the page's `performance.now()` when the scene loaded) instead of
  from the loop's start, so a new model (a scrub, a world part arriving, the reveal) no longer starts the drifts again
  (before C8 the clouds stepped back on every model change).
- *React*: `useLandClock(world)`: the one place the arrival touches the clock: when the mist began and when the reveal
  began, as phases of the scene clock (`LandClock`); the reveal waits for both surfaces to report the land painted (4 s at
  most), the model then drops it after `ARRIVAL_END`. The status change is taken while rendering, so no frame shows the
  land before its reveal is set up. `SkyCanvas` glides its CSS base by its background position (the uncovered edge in the
  base's own colour; `backgroundImage` + longhands, the same pixels at rest). `SceneOverlay` takes a style: the labels
  hidden until the reveal starts, then a CSS fade from 1.14 s.
- *Harness and runners*: `land=loading|offline|arrive` (`&from=<s>`: the reveal's phase), `window.__sceneStill` (the
  harness lays its own stills under reduced motion: no loop), `__scene.lay(phase)`; `scene.stills.mjs` takes a 5th field
  (`place@HH:MM@weather@phase@land`); `e2e/scene.clip.mjs` makes a clip (loading 3.5 s then the arrival on one clock,
  ffmpeg); the perf runner measures, per place, the loading and arrival pages with motion on.
- *Tests* (`scene/model/loading.test.ts`, 39 over the 8 places): the world stands on no land while loading or offline
  (flat eye level, nothing placed, the stand-in's shape unused); no land layer before the data (4 hours × clear, rain,
  dust × loading, offline), the mist present in both, the guess only while loading, the near rain in front of the mist;
  no labels or clear zones until the land; the arrival monotonic (each land layer's alpha 0 → 1 non-decreasing, the mist
  1 → 0 non-increasing, the crest's window non-decreasing and the guess's erased over the same front, the sky's glide
  shrinking to 0, all done by `ARRIVAL_END`), the known model's layers and keys unchanged under it and the mist's and
  guess's keys equal to the loading model's (no repaint, no pop); held while painting; time-shift invariance on the one
  clock; offline → ready revealed without a guess; reduced motion (guess whole, crest hidden, no glide, fades run, the
  still loop runs to the end and stops); model and painter calls pure, descs structured-cloneable; the compositor's window
  (core + feathers, the complement for `erase`, nothing under reduced motion) and glide.
- *Pixel references*: 6 new (59 in all): Haifa 16:30 loading, Jerusalem 12:00 offline, Ein Gedi 21:00 loading, Tiberias
  12:00 rain loading, Haifa 16:30 arriving at 0.7 s, Rosh Pina 06:20 arriving at 1.2 s; the 53 earlier ones unchanged
  (after the C5b merge, its references). 59/59 on both paint paths.
- *Stills* `qa/canvas/c8/` (dpr 2, overlay): loading and offline at day (Jerusalem 12:00), golden (Haifa 16:30), night
  (Ein Gedi 21:00) and rain (Tiberias 12:00), the line formed (phase 4); `strips/*-loading-strip.jpg` (the line forming:
  0.5, 1.4, 2.3, 3.5 s), `strips/*-arrive-strip.jpg` (0, 0.4, 0.8, 1.2, 1.6, 2.2 s into the reveal), `strips/jerusalem-
  1200-offline-strip.jpg` (0, 2, 4, 6 s); clips for the owner `haifa-1630-arrival.mp4`, `tiberias-1200-rain-arrival.mp4`
  (5.9 s each: the mist and the line forming, then the land coming in).
- *Critique* (2× crops). Works: the bank takes the hour (the dusk's grey-violet with the sun's glow in it, a pale
  noon fog, a dark night bank that still reads as one); the guess reads as a ridge glimpsed through fog, not a wire (its
  mass beneath, the line lost in places); the arrival reads as the fog clearing from the place outward: the true crest
  drawn where the guess was, the land coming up under it, the sky settling a few px; the near rain keeps falling in front
  through it all; no labels pop before the land. Still wrong: where the true crest stands far above the bank (Ein Gedi's
  cliffs, Tiberias's Arbel side) the land's upper part shows half faded against the sky for ~0.5 s before the mist would
  have hidden it: a fade, not a reveal, there; the guess and the crest are separate lines at the moving front (a short gap
  where they differ in height), not one line morphing; the offline drift is quiet enough to read as still over a few
  seconds (by intent; the clouds above move); a sun behind the true ridge shows through the fading land as a glow for a
  moment before the land covers it.
- *Perf* (`qa/canvas/perf.md`, C8; CPU ×4, dpr 2.75, worker path): loading frames (mist drift, line forming, the sky's
  clouds) p50 0.5–0.6 ms, p95 1.8–2.1 ms; arrival frames p50 0.7–0.8, p95 2.1–2.3 ms (budget 4); the loading world 44–54
  ms and model 24–43 ms cold (the sky's cold model is most of it), first paint 22–24 ms. The model overs reported by the
  runner are C5's and C6's (cold model, scrub model), unchanged.
- *Decisions and departures*:
  - **The plan's `loading` kind** (`mode: mist | ridge | both`) became `part: 'mist' | 'ridge'` (three layers: the mist,
    the guess, the crest), each cached once and laid at composite time.
  - **No coarse elevation estimate** exists before the panorama (the forecast's height is one number; the far DEM tiles
    come with the near ones): the guess is a generic line round the eye level the panorama would give a ridge at 0°.
  - **The sky glides** rather than jumping when the land's eye level differs from the guess (up to 30 px at Masada).
  - **Cross-fade, as the brief asks**, but staged as a reveal from behind the mist; the land's layers keep their keys.
  - **The scene clock** (above) replaces "phase from the loop's start"; C6/C7's motions are unchanged in form.
- **For C9 to delete (the old stand-in):** in `data/terrain/terrain.ts` the drawn valleys (`SHADMOT`, `GENERIC_TERRAIN`,
  `SHADMOT_FAR_DRAWN`, `SHADMOT_NEAR_DRAWN`, `GENERIC_FAR_DRAWN`, `turned`), `terrainForPlace`'s stand-in branch (no
  panorama → `unknownLand(status)` from `world/terrain.ts`, or null), `SceneTerrain.drawn` and the `centerY` it uses;
  `data/terrain/profile.ts` `gentleHillsPath`, `mirrorPath` (and `ridgePoints` if nothing else uses it); in the world
  `TerrainPlanes.drawn`, `STAND_IN_KM`, the `?? HORIZON_Y` fallbacks (every terrain then has an eye level),
  `world/place.ts`'s portrait branch and `terrain.drawn ? terrain.centerY`, `world/portrait.ts` (`composePortrait`, kept only
  for the stand-in: unreachable from the canvas path now) with the model's `portrait` layer and `paint/marks.ts`
  `paintPortrait`; `data/landmarks/placeMarks.ts`'s `terrain.drawn` branch; the SVG's `ValleyScene.tsx` `snowPlaceM` and
  `hillScene.ts` `terrain.drawn` (with the SVG scene); the tests that use the stand-in (`profile.test.ts`'s stand-in cases,
  `hillScene.test.ts`, `visibleSun.test.ts` and `loading.test.ts`'s `GENERIC_TERRAIN` input, to become `unknownLand`); and
  the stand-in-only machinery §2 lists (`fabric`, `neighbours`, `neighbourOcclusion`, `columns`, `villageStyle` after its
  move, `settlementPlan`, `villageForms`, `villageExtent`, `terraces`).
  - No deploys needed for C8.

**C9, the review pack (2026-11-19): two general fixes and the stills for the owner; no switch yet.** Commits on
`ccr-85ec24f0-9ayxgu` (after C8); the SVG baseline and the shipped app are unchanged (snapshots untouched; everything
below runs only under `?canvas=1`). Pack: `qa/canvas/c9-review/index.md` (7 sheets, SVG | canvas from the app itself).
- *Drawing with the anidoodle skill* (owner decision 7): `craft-bar.md` ("parts floating off", "a line that stops in the
  air") and `determinism-and-contract.md` read again; each fix looked at on 2–3× crops (Rosh Pina's crest, Ramat Gan's
  frame edges, Tiberias's fog, Shadmot's Gilead at sunrise, Jerusalem's and Rosh Pina's snow).
- **The posts on Rosh Pina's crest were towers beyond the place** (C5b item 5, `beyondTowers`): Safed's 12–14 storey
  buildings 3.4–5.1 km west, whose own ground (Mt Canaan, over 850 m) the place's rule lifts over the ridge line in view,
  so the "never above the ridge line" clamp stood them on the bare crest at the place's own px a metre (11–14 px). From
  Rosh Pina the land in front hides every one of them. **Rule** (`world/outside.ts` `overTheCrest`): a tower beyond the
  place is never more than the panorama truly sees of it over the land in front (from the eye, at its true bearing and
  distance, on the land's own scale: `seenAt`, as the far towns are placed), and is left out when it shows less than
  2.5 px; one in front of the near ridge stands whole as before. Over the places: Rosh Pina 9 → 0, Jerusalem 2 → 0,
  Haifa 15 → 5 (Eshkol Tower kept as a glyph), Tel Aviv 32 → 30, Ramat Gan 66 → 61 (its lone 38–50 px sticks at the frame's
  edges fall to 6–12 px or go: the hidden ones). No house, tree, mark or field of the place stands over the ridge line
  without its own drawn ground (checked on every place: the C5b 6 px rule lifts rows only onto `OutsideView.land`).
- **Haze continuous across a jump in a crest's distance** (`scene/model/planeLight.ts` `hazeAlong`, `HAZE_SLOPE` 0.006
  a px): the air's share in a plane's tone (`AERIAL · fade(km)²`) along the crest is the mean of the lowest and highest
  curves within that slope of the shares (two passes each way), so a jump turns over a stretch as wide as it is deep: a
  few px in a clear air (unchanged where the shares already change gently), ~100 px in Tiberias's fog (it was ~15). The
  same rule took out a seam in Shadmot's Gilead at sunrise.
- **Found in the review and fixed: the place's own ground in snow** (`world/outside.ts` `landOf` keeps each top point's
  ground height; `model/outside.ts` `landSnow`; `planeLight.ts` `snowOnGround`, the planes' own snow look): where its
  crest stands at or over the snow line it takes the snow the ridge takes; it stood as a dark band over the snowy ridge
  (Jerusalem, Rosh Pina, Tiberias).
- *Runner:* `scene.compare.mjs` takes `place@HH:MM@weather` (the harness's moments as the app's `?wx=`), `--title=`, and
  writes `.jpg` sheets.
- *Tests:* `outside.test.ts` (+13): Rosh Pina has no tower beyond; every place's towers beyond show no more than the
  panorama sees of them; snow on the place's own ground under a fall, none without. `planes.test.ts` (+1): `hazeAlong`
  holds the slope and keeps a gentle run; Tiberias's fog turns its near plane's tone ≤ 0.004 Oklab a px (0.011 before).
- *Pixel references:* re-recorded deliberately, 31 of 59 (the haze rule: Shadmot, Ein Gedi 06:20, Jerusalem, Haifa,
  Tel Aviv where a crest's distance jumps; the towers beyond: Tel Aviv, Haifa, Jerusalem, Rosh Pina; the snow: Jerusalem,
  Tiberias, Haifa); 59/59 on both paint paths.
- *Perf* (`qa/canvas/perf.md`, C9 pack): as at C8 within the noise.
- **Open defects seen in the pack, ranked** (none fixed, each wants a rule or the owner's eye):
  1. A backlit or overcast city mass reads pale against its dark ridge (Jerusalem and Tel Aviv at 06:20 and 16:30,
     Jerusalem and Haifa in rain): the C5b sky light on the mass lifts its tops more than a backlit wall would take.
  2. A dark cloud lobe right over the sun with the sun's glow round it reads as a black disc in a ring (Haifa 15:00
     thunder): the bank over the disc has no silver lining.
  3. Haifa at 06:20: the city mass on the Carmel stands over the sun's true spot, so no disc shows at sunrise (the
     SVG shows it over the bay).
  4. The height label floats well above the dot over the mass (Rosh Pina, Haifa, Tel Aviv, Ramat Gan, Be'er Sheva): C5b's
     last-resort spot over the mass reads detached.
  5. Water names: Netanya's "ים" sits in the sky just over its coastal sea's horizon; Ramat Gan's among Tel Aviv's towers.
  6. Ramat Gan's frame edges keep a few 6–12 px towers (true, seen) with no town at their feet: the towns 4–6 km out are
     drawn by neither the outside view nor the far towns (which start at 6 km).
  7. Masada at 06:20: the Dead Sea's shapes barely part from the far plane.
  8. Nahalal: its water tower and the ridge's chimney / tower marks of the SVG are gone (C5's far-mark rule).
  9. Zikhron Ya'akov: the far chimneys at Hadera show as a pale bare stick at the sea's edge.
  10. Be'er Sheva: the mass's west part is a flat, even wall.
  - Under `?wx=` rain and thunder the sun shows veiled in both scenes (no thick-cloud key in `?wx=`); a pack artefact.
  - No deploys needed.

**C9, the review's defects fixed (2026-11-19): every one by a general rule, and the owner's rays.** Commits on
`ccr-85ec24f0-9ayxgu` (after the pack); the SVG baseline and the shipped app are unchanged (snapshots untouched; nothing in
`src/ui` or `src/data` changed; everything below runs only under `?canvas=1`). The pack regenerated with the same runner
and the same sheets, plus `rays.jpg` (`qa/canvas/c9-review/index.md`).
- *Drawing with the anidoodle skill* (owner decision 7): `craft-bar.md` ("parts floating off": the far tower's foot and the
  towns at the towers' feet; "text is never set over a busy picture without a plate under it": the label's backing;
  "gradient sky, disc sun": the glare and rays as light, not a starburst), `realism-and-craft.md` ("form, then colour: one
  named light", the one world light for the mass, the water's path and the rays) and `determinism-and-contract.md` (every
  new layer's key names what its pixels depend on; randomness seeded by the place) read again; each fix looked at on 2–2.5× crops (Jerusalem and Tel Aviv at 06:20 / 16:30, Jerusalem and Haifa
  in rain, Haifa's thunder lobe, Haifa's sunrise, the labels, Netanya's and Tiberias's water names, Ramat Gan's edges,
  Masada's lake, Nahalal's ridge, Hadera's chimneys, Be'er Sheva's west, the rays at Haifa 08:00, Ein Gedi and Tel Aviv).
1. **A wall faces the sky behind the eye; it gives back its albedo's share of it** (`model/marks.ts` `againstLight`,
   `wallShade`; `model/outside.ts` `skyFormOf`, `landBehind`). *Against the light* (the sun low in the half of the sky the
   eye looks into, 1 at sunrise and sunset over the land, falling by 40° and toward the eye's side, through twilight) the
   walls the eye sees face away from the sun and the bright sky: no stone lift, less of the air's tone, the glass mirroring
   the dim sky; under a dull sky (direct < 0.4) they see the dim horizon half of the overcast and give back about what the
   ground does. The sky's form on the mass (C5b) is now by albedo in linear light (0.45 × 0.62 of the sky they face for the
   tops, 0.55 for the face to the sun's side; against the light the sky behind the eye, 0.45 of the view's): tops and rims
   catch a little light, never the sky's own. And **nothing is hazier than the land it is seen against**: a box, tower,
   tree or mark whose foot shows in front of a plane (the near ridge with the lie's 6 px over it, the place's own drawn
   ground, the far planes) takes no more than that land's distance of air; the far rows of a deep city (Jerusalem's 10 km)
   had taken up to 13 km of it over a ridge 3 km off. Result: Jerusalem and Tel Aviv at 06:20 / 16:30 read as dark masses on
   their ridge, a rim on the sun's side, the walls within 0.03 (luminance) of the ridge at their distance (were 0.1–0.3
   over it); at 11:00 lit stone stays 0.10 over the ridge; in rain the mass reads a little lighter than the hill, not pale.
   The far towns take the same shade (`model/farCities.ts`: their shade's stone by `wallShade`, their lit face a rim against
   the light).
2. **The aureole is the air's, nearer than any cloud; a bank in front of the sun has its silver** (`model/bodies.ts`
   `bodies.aureole` at z 8.6 over the clouds, the disc still at 5 under them; `model/clouds.ts` `litOf`: a bank whose outline
   comes within the aureole's reach of the sun takes a silver edge of 0.9 × the sun's strength × √(the disc's visibility),
   whatever lights its top (`through`); the painter's rim and silver wash on every heaped or sheet bank). Haifa 15:00 thunder:
   the lobe over the disc reads as a cloud passing the sun, its edge toward it lit, the glow lying over it, not a black coin
   in a ring. (The silver is baked into the drifting layer as C6's was: over a minute's drift it slides with its bank.)
3. **The place's own mass never hides a body the place's eye sees** (`model/bodies.ts` `bodiesOverPlace`). The outside view
   draws the place from an eye north of it, the sky from the place itself; where the sun (or moon) is `overLand` from the
   place (judged on the panorama's own skyline, as the SVG shows it) and the place's mass, towers or marks would cover the
   disc, the disc is laid again on the land over the mass (its aureole stays on the sky, glare round the mass's edge). A body
   behind the true land stays hidden (Haifa 16:30, Ein Gedi's cliffs). Haifa 06:20: the sun shows low over the lower city by
   the bay.
4. **The height label sits beside the dot, level with it, on a small backing** (`world/place.ts` `besideDot`,
   `BACKING_PAD`; `scene/react/SceneOverlay.module.css` `.backed`), for every place seen from outside: right of the dot,
   else left, else a few px up or down, then a little farther out; clear of the marks and the notes; where the dot is ringed
   by marks (Tel Aviv) the spot that covers least. The backing (the near land's tone at 72 %) carries it over the mass, which
   no longer gives way to it (no clear zone for a backed label).
5. **A water name is written on its water's surface as drawn** (`world/place.ts` `notesOnWater`): along its own stretch
   where the surface shows deep enough under the far shore for the letters (the shore's raggedness under a letter or two let
   pass), nearest the stretch's middle, clear of the place's mass, towers, trees, the towns and towers beyond and the dot;
   else, for the sea, on the outside view's coastal sea (its polygon, from the open side); else unnamed. Netanya's and
   Haifa's "ים" now lie on the sea, Tiberias's "כנרת" and Masada's "ים המלח" on the lake (Masada's was dropped); Ramat Gan's
   sea, only seen among Tel Aviv's towers, goes unnamed. (`sceneNotes` itself is the SVG's and unchanged.)
6. **The towns 0–6 km out are drawn by the outside view, as the towers beyond** (`world/outside.ts` `beyondTowns`): every
   built square of the city raster (≥ 20 %) outside the place within the skyline's reach, at its true spot in the outside
   projection, as wide as it is there, its roof by the perspective (never larger a metre than the place's near edge), no
   more than the panorama sees of it over the land in front, hazed by its distance; drawn behind the place with the towers
   beyond, far first. The far towns still start at 6 km: the two now meet. Ramat Gan's frame-edge towers stand in Bnei Brak's
   and Givatayim's blocks (891 squares; Tel Aviv 203, Haifa 103, Nahalal 102 on its ridges).
7. **Water mirrors in linear light; the sun's path takes the one light** (`model/tone.ts` `mixLight`, `model/water.ts`;
   `world/water.ts` `waterOf`). The Fresnel share of the mirrored sky (or land) over the water's dark is a share of light, so
   it is mixed in linear light (a perceptual mix of a light and a near-black read far darker): far water is the bright mirror
   it is. The mirrored land takes only the air between the water and its shore (it took the land's whole air, then the
   water's again). The sun's path on the water takes the world's direct light and its `overLand`, not a second rule from the
   cloud cover alone (which left Masada's sunrise sun, seen through broken cloud, with no path). Masada 06:20: the lake reads
   as a light sheet under the backlit Moab with its path; every lake and sea is a little brighter.
8. **Within the reach a neighbour's tall structure shows, named or not** (`world/marks.ts` `nearBeyond`, ≥ 20 m within 6 km;
   the far rule, a name and fame or huge, stays for the far towns' range). Nahalal: the chimney on its eastern ridge is back,
   with its smoke. Its "water tower" in the SVG is the one 1.6 km *north* of it: behind the eye in the true view (the SVG's
   portrait placed it by side); the minarets and churches of Nazareth (9.5–10 km, named) stay hidden by the land in front.
9. **A far tower stands on its own works** (`world/farCities.ts` `townShapes`: a low hall 2.6–4.2 × its width at its foot,
   seeded) and takes the far towns' backlit shade. Zikhron's Hadera chimneys (250 m, 13 km): their foot is under the coastal
   ridge's line as the panorama sees it (so the hall is hidden there); they stay a thin hazy silhouette over the sea's edge,
   which is what 13 km of a 30 km visibility makes of them (darker than the sky, lighter than the far sea at 16:30).
10. **A built cell is as wide as its buildings' frontage** (`world/outside.ts` `fabricOf`: the cell's width × 1.6 √(its
    raster square's built share), at least 0.4, at a seeded spot in the cell): the streets and yards open and the rows behind
    show through with their own heights. Be'er Sheva's west (squares 7–20 % built, 4 storeys, p90 13–16 m) breaks a little;
    the data's own heights there are even (the four-storey estates are), so it stays a low, fairly level band.
11. **Sun rays wherever they really occur** (owner decision 13; `model/rays.ts`, `paint/weather.ts` `paintRays` with a
    `corona` look): `hazeOfRays` from the aerosol optical depth (none ≤ 0.08, full at 0.6: 40 km → 10 km), `rayStrengths`:
    *crepuscular* (`rays`, z 5.5) = sun up × brokenness × (lowness + (1 − lowness) × haze) × (0.55 + 0.45 haze), at any height
    in a hazy air; *over the ridge* (`rays.ridge`, 5.45) when the sun's clearance over its land is −10…+9 px at −3…10°,
    by the disc's visibility and the haze; *anticrepuscular* (`rays.anti`, 5.4) converging on the point opposite the sun
    (as far under the horizon as the sun is over it), when the crepuscular are ≥ 0.25 at a low sun; *glare* (`rays.corona`,
    5.3): 30 fine short rays round a sun seen over its land, by its visibility and the haze, brightest just off the limb.
    None by night or from a dust coin. Each its own small cached layer, seeded by the place; laid at composite time.
- *Tests* (`scene/model/c9.test.ts`, 24; `outside.test.ts` +5; `model.test.ts`, `weather.test.ts` rewritten for the label
  and the rays): the aureole over the clouds and the disc under; silver on the banks by the sun under thunder; the disc
  over Haifa's mass at sunrise, none behind the land; water names on their water (letters inside the stretch or the coastal
  sea, never over the place's blocks, under the sheet's edge); the towns beyond (count, scale, far first, Ramat Gan's edge
  towers footed); `mixLight`; Masada's path by the world's light; Nahalal's chimney, no low unnamed mark beyond; the far
  towers' foot; Be'er Sheva's frontage; rays none by night or in clear dry air at noon, crepuscular more at a low sun and in
  haze, the ridge's at Ein Gedi's sunrise, the glare only for a seen sun, the anticrepuscular at the antisolar point; the
  mass against the light within 0.05 of its ridge (Jerusalem, Tel Aviv, Haifa, Be'er Sheva at 06:20 and 16:30; > 0.08 at
  11:00), no box hazier than the land behind it; the label beside the dot, level, clear of the marks (Tel Aviv: one at most).
- *Pixel references:* re-recorded deliberately, 58 of 59 (the mass and the far towns' shade, the water's mirror, the rays,
  the aureole, the label's clear zone, the towns beyond); 59/59 on both paint paths (worker and `SCENE_PAINT=main`).
- *Perf* (`qa/canvas/perf.md`, C9 defects): within the noise of the pack's run but for the world's place part (the towns
  beyond: one `seenAt` a raster square within 6 km), see there.
- **Remaining** (for the owner's eye; none a point fix): Be'er Sheva's west is still a fairly level band (true to its data);
  Hadera's chimneys stay a thin pale line (true to their haze); Nahalal's SVG water tower is behind the true view; the baked
  silver drifts with its cloud; a far town block on Nahalal's ridge reads a little like a row of boxes on the skyline (the
  raster's squares, ~120 × 230 m, at 3–5 km). In fog (Tiberias 12:00, Nahalal 08:00) the rays and the glare come out strong, as fog beams
  do (the haze term is full at 10 km); the owner may want them gentler there.
  - No deploys needed.

**C9, the switch (2026-11-19): the canvas scene is the default; the SVG scene, the WebGL sky and the stand-in are gone.**
Commits on `ccr-85ec24f0-9ayxgu` (after the defects): the switch with the SVG scene and the WebGL sky; the stand-in
machinery, the skyline slabs and the WebGL air's leftovers; the rays in fog; the docs and the smoke stills.
- *The switch* (`App.tsx`): no `?canvas=1` gate; App always builds the world (`useWorld`) and draws the valley and the sky
  on canvas. The scene still loads as its own chunk (`CanvasScene`, lazily), behind `scene/react/SceneFallback.tsx` (an
  empty figure of the same size), so the text and the sky's CSS gradient paint first and nothing below moves when it
  arrives (then C8's mist takes the land's place until the panorama). **No `?svg=1`** (owner decision 12's note): git is
  the way back (`a132d04`). Kept: `?perf=1`, `?wx=`, `?at=`, `?theme=`, `?paint=main` (the main-thread paint path), the
  harness `scene.html`. Gone: `?canvas=1`, `?scene=flat`, `?skyline=a|b|c`, `specimen.html`. `ui/Sky.tsx` keeps only the
  gradient (the canvas draws the stars); the birds and meteors stay HTML (owner decision 6) and read their lanes from the
  page (`atmo/life/lanes.ts`) instead of the WebGL layout.
- *Accessibility, as the SVG scene had it* (checked on the built app by `e2e/scene.app.mjs`): the figure is
  `role="group"` with the same spoken label (`sceneLabel.ts`: the sun over the horizon, the next sunrise or sunset, the
  place's height); the canvas is `aria-hidden`; the hour slider (`SceneScrubber`, moved to `scene/react/`) keeps its
  `role="slider"`, label "שעה בעמק", values in minutes from now and its text (the readout, else "עכשיו, HH:MM"), the
  keyboard (← / → an hour, Home / End, Escape back to now) and the drag; the readout pill with its "עכשיו" button.
- *Deleted* (verified unused by `tsc`, a reachability walk from every entry — `main.tsx`, `dev/scene.tsx`, `scripts/`,
  `e2e/` — and vitest): 125 source and test files and the 18 SVG snapshots, ~35 200 lines (≈ 1 000 added: the moves,
  the runner, the tests rewritten). The SVG scene (`src/ui/scene/` whole: ValleyScene and every component, the marks,
  generic glyphs, curated icons, city skylines, hooks, `sceneBaseline` and its 16 baselines, `hillScene` and its
  snapshot); the WebGL sky (`atmo/gl/*`, `Atmosphere`, `CssAir`, `useAirLoop`, `motion`, `layout`); `sceneFlag.ts`;
  the SVG specimens (`specimen.html`, `dev/Sheet.tsx`, `qa/specimens.tsx`); C8's stand-in list whole (the drawn valleys,
  `profile.ts`, `SceneTerrain.near/far/centerY/drawn` — `horizonY` is now always known —, `TerrainPlanes.drawn`, the
  `?? HORIZON_Y` fallbacks, `world/portrait.ts`, `placeOf`'s portrait branch — the unknown place is `kind: 'unknown'` —,
  the model's `portrait` layer and `paintPortrait`, `placeMarks`' drawn branch, `snowLine.heightY`, `fabric`,
  `neighbours`, `neighbourOcclusion`, `runs`, `settlementPlan`, `villageForms`, `villageExtent`, `terraces`,
  `composeSettlement`); the skyline slabs (`skylineData`, `skylineTowers`, `skylineRay`; `outsideView`'s variants A and
  C); the SVG's city towers (`cityTowers`, `cityZones`, `cityHeight`, `cityBase`, `towers`, `farColumns`,
  `useFarColumns`, `homeRoof`); SVG-only helpers (`glitter` and `waterGlints` — owner decision 10's sign slip dies with
  them —, `afterglowAttrs`, `world/cloudSeen.ts`, `ridgeLightPaths`, `discLook`, `worldLight`, `litPath`,
  `placeLabel`, `labelBox`, `rgbCss`, `MarkLife` and `mapMarks` but its lit windows); `e2e/scene.compare.mjs` (SVG |
  canvas), replaced by `e2e/scene.app.mjs` (the app's stills, dev or `--built`, with the accessibility checks).
- *Moved*: `villageStyle.ts` → `data/landmarks/` (the world's roof-evidence rule); `atmo/mapParts.ts` →
  `world/airParts.ts` and `atmo/mapAir.ts` → `world/mapAir.ts` (the birds and the theme still read `AirState`); the
  reach test and `sameTower` → `outsideView.ts`; `unknownLand` / `UNKNOWN_EYE_Y` → `data/terrain/terrain.ts`
  (re-exported by `world/terrain.ts`); the star classes → `scene/model/starClasses.ts`; the scrubber, `useWidth` and the
  figure's CSS → `scene/react/` (`Scene.module.css`, only the classes the canvas uses).
- *Bugs that died with the old code*: **`windU`** (owner decision 9) now goes through the camera as the world's wind
  does (a westerly moves right → left in the true view; the birds fly with it; `mapAir.test`, `mapLife.test` turned);
  **`glitter`** deleted with the SVG (the canvas's `glintsOf` / `facetShare` take the mirror's geometry).
- *The rays in fog* (the review's remaining item; `model/rays.ts` `beamThrough`, a general rule): fog scatters the light
  but also blocks it. The light a sunbeam about 2.5 km off sends toward the eye grows with the air's extinction β and dims
  on its way through the same air, β·d·e^(1−β·d) normalised to 1 at its peak (β·d = 1, ~10 km visibility) and held at 1
  in clearer air; ~0.75 at 5 km, ~0.35 at 3 km, ~0.03 at 1.5 km. Every case (crepuscular, over the ridge, the
  anticrepuscular through them, the glare) takes it. Tiberias 12:00 and Nahalal 08:00 in the harness's fog: no rays, the
  aureole only (`qa/canvas/c9/tiberias-1200-fog.png`, `nahalal-0800-fog.png`). Tests in `c9.test.ts` (+1).
- *Regression suite*: the SVG baseline's coverage (`sceneBaseline`: the 8 `SCENE_PLACES` × 06:20 / 12:00 / 16:30 /
  21:00) is the pixel references' own first 32 cases (`e2e/cases.mjs` `PLACES` × `HOURS`, the same ids and hours), plus
  the weather, dpr 2 and loading cases: 59/59 on both paint paths, none re-recorded at the switch. With the world and
  model tests (108 files, 1 098 tests) they are the scene's regression suite.
- *Bundle* (`npm run build`, bytes / gzip -9): before, the default page loaded `index` 565.6 kB / 196.9 kB and its CSS
  53.1 / 12.0 (the canvas chunk built but never loaded); after, `index` 422.6 / 142.7 and CSS 39.6 / 9.0 first, then the
  scene's chunk `CanvasScene` 212.1 / 80.1 and the paint worker 58.1 / 20.3 (was 60.6). All JS but MapLibre: 832 → 699 kB
  (−16 %); the PWA precache 1 101 → 958 KiB. The default page now fetches 267 kB of JS (transfer) against 201 kB before:
  the canvas scene is more code than the SVG scene was, and it no longer stays off the default path.
- *First paint* (the built app on `vite preview`, Haifa 12:00, CPU ×4, dpr 2.75, median of 5 warm-cache loads): first
  contentful paint 276 → 264 ms (the same, the text first); the scene's figure on screen 1 707 → 1 293 ms (the SVG
  rendered with the main chunk; the canvas comes with its chunk, its world and its first layers).
- *Perf* (`qa/canvas/perf.md`, C9 switch): as the defects run within the noise; OVERs are C5's and C6's, as before.
- *Smoke* (`qa/canvas/c9/`): the built app (`node e2e/scene.app.mjs docs/design/qa/canvas/c9 jerusalem@06:20 haifa@12:00
  tiberias@16:30 --built`): Jerusalem at sunrise, Haifa at noon, Tiberias at 16:30, each with the figure's label, the
  slider stepping an hour on ← (aria-valuenow 0 → 60) and back on Escape, the readout shown, no page error, nothing
  reaching Open-Meteo (the fixture is routed); `haifa-1200-page.png` the whole first screen; the two fog stills from the
  dev server (`?wx=` is a dev override).
- **Left for after C9** (none blocking): `columns.ts`'s band (above); `useLandmarks`' older pools and `rank.ts`'s `kind`
  rule (the overhead map and the stored landmark cache still use them); `data/world/` (the turning view's 360° world,
  unused since that study, kept for `camera-fable.md`); the birds and meteors into the canvas (owner decision 6: done at C10); the
  cold model and the cities' scrub model over budget (C5, C6). Deploys: the final list above (§5).

**Fix: the "פני הים" datum at the height of 0 m in the picture (2026-11-19).** The owner's report: Tiberias's dot reads
"−137 מ׳" on the town at the top of its land, and the dashed sea-level line lay far *below* it by the lake ("כנרת"), though
sea level stands 137 m above the town.
- *Cause:* the line's height was `terrain.seaY`, the panorama's own sea line: 0 m on the far ridges as seen from the
  place's eye (each far slope taken as straight from the eye to its crest), a few px over eye level. But the place is
  drawn from outside, its point (the dot) on the near ridge line (Tiberias's ridge there is +137 m, 2 km off), its rows
  above and below the dot by their height over the place point's (`lieOf`'s `levelY`). Against the dot the panorama's
  0 m fell 49 px under it. The line was also drawn against the near ridge with a height taken on the far one.
- *Rule* (`world/datum.ts`, one rule for every place below sea level, no place named): sea level is a height like any
  other, drawn by the rule that draws the dot and the rows. (1) The place's own 0 m contour: where its ground in the
  frame (and boundary) crosses 0 m (`zeroCrossings` on the local grid every 125 m), each spot drawn at `levelY(dx, dy,
  0)`. (2) Where the place's own ground never reaches 0 m (a village on the valley floor), the land round it as the
  panorama draws it, at its true height and distance from the eye (`RELIEF.high`, curvature and refraction): along each
  ray the nearest spot the eye sees where the ground passes up through 0 m (`panoramaTerrain.ts` `zeroContourOf`,
  `terrain.zeroContour`; `terrain.seaY` below sea level is now its median, not the straight-slope guess). Of either, only
  spots above the dot count (sea level stands over a place below it); the line at their median height. It runs from the
  hollow at the dot to the drawn land rising through it (the near ridge and the place's own land, `outlineOf`;
  `seaSpan` unchanged), where the slopes reach 0 m; an open side with no flank keeps `seaSpan`'s fixed end. Where neither
  contour has a spot above the dot there is no line and no note (the label "−N מ׳" says the place is below sea level,
  the spoken label says it in words); every harness place below sea level has one. The line is `labels.datum` (the far
  water layer draws it, `model/water.ts`), "פני הים" stands over it within its span (`sceneNotes` `datumNote`), and the
  height label keeps clear of it as of the marks (`besideDot`).
- *Places checked* (`qa/canvas/datum/`, before / after at 12:00, Tiberias also 16:30; `sheet-before-after.png`):
  Tiberias (own ground: 6 px over the dot, meets the town's slope west of it), Ein Gedi (own ground: 18 px over the dot,
  meets the cliff), Shadmot Mehola, and four new harness places below sea level (`DATUM_PLACES`, panoramas recorded
  from the DEM): Beit She'an, Jericho, Kalya, Neve Zohar (all by the land round them: the near ridge's face, the
  Gilboa's and Gilead's feet, the cliffs). Every line stands above its dot.
- *Tests:* `world/datum.test.ts` (8: the contour, the eye's 0 m on a synthetic slope and a hidden one, above the dot only,
  the line's span, and at all seven places: above the dot, the note over the line, the label clear of it, Tiberias's line
  meeting its slope). `water.test` and `model.test`: the datum only where the picture has 0 m above the dot (the
  fixture's height is below sea level everywhere; Haifa's ground is not, so its far water layer is gone from the
  order test). Pixel references re-recorded deliberately, the 20 with the datum: Tiberias's 10 (4 hours, 5 weathers,
  12:00 at dpr 2), Ein Gedi's 5, Shadmot Mehola's 5; the two loading cases unchanged; 59/59.
- *Follow-up (review of the sheet): the line only where land really crosses 0 m* (`datumLineOf`). The fixed open-side
  end (x = 96, `seaSpan`'s fallback) is gone (`seaLine.ts` with it). The line is a set of segments, each through a
  hollow under it from one real crossing to the next: a crossing is where the drawn land (near ridge, or the place's own
  land) rises through the line *and* its height there is ≥ 0 m; land drawn through the line while below 0 m (the place's
  land pressed up to the ridge line) is not one, the line runs on behind it, hidden. A hollow open to the frame's edge
  on a side carries no segment, except the dot's own: it ends that side `OPEN_REACH` (66 px, 1.5 × the note) past the
  dot, fading out over its last 40 px (the painter's gradient; the fade leaves the note's 44 px solid). Segments wholly
  hidden behind land are dropped. The note stands over the dot's segment, on its open side (away from the place).
  Results (`qa/canvas/datum/sheet-before-after-2.png`, before = 447d33f): Neve Zohar's line no longer floats over Moab
  (121–325, fading west, meeting the cliff at 0 m); Beit She'an's no longer crosses the valley (a short stretch round the
  dot fading both ways: no near land reaches 0 m); Tiberias, Ein Gedi, Shadmot Mehola, Jericho one-sided, fading toward
  the lake / valley; Kalya both sides (its near cliff crest within 5 km is −55…−128 m). Tests: `datum.test.ts` +2 (10).
  Pixel references re-recorded again, the same 20.
- *Open, for the owner (decided: owner decision 14, done below, "Uniform vertical scale per place"): the vertical scale of
  the place and its surroundings is not one rule.* Measured at 12:00
  (`lieOf`), the place's ground is drawn at the frame's `k0` px/m (`FRAME_SCALE.k`, 0.18–1.2, a view exaggeration chosen
  for houses), then pressed separately above the dot (into the room up to the highest ridge line + 6 px) and below it
  (into the room down to the sheet, or stretched to the sea horizon on a coast), then capped 6 px over the ridge line at
  each x. The two factors differ: below/above px per metre = 5.7 at Tiberias (0.31 vs 0.054) and Haifa (0.49 vs 0.086),
  2.4 Neve Zohar, 1.6 Be'er Sheva, 1.2 Ein Gedi; the other way round 0.2 Rosh Pina, 0.4 Shadmot Mehola, 0.5 Jerusalem,
  Jericho, Beit She'an. And the dot itself is laid on the near ridge's crest at the centre whatever that crest's height:
  Tiberias's crest there is +137 m, 2 km off (274 m above the place, ~28 px on the panorama's own scale), so the "cliff"
  under the dot is the ridge's, not the town's 73 m over the lake. A consistent rule (proposal, not implemented: it
  moves the dot off the ridge line and changes every place's look): the place's ground on the panorama's own scale at
  the outside eye's distance, s = 9.83 px/° × (180/π)/(1000·D) ≈ 0.563/D px/m (D = `frame.eyeN`, 3–19 km), the same
  above and below the dot, no press and no cap; the dot below/above the ridge line at its crest by (crest − place) × s.
  Its relief (px, now → proposed): Tiberias 41 → 40, Ein Gedi 52 → 58, Haifa 68 → 18, Rosh Pina 47 → 24, Jerusalem
  30 → 9, Be'er Sheva 19 → 7, Tel Aviv 16 → 2, Netanya 19 → 2, Shadmot Mehola 38 → 15, Kalya 39 → 15, Neve Zohar 40 → 14,
  Beit She'an 20 → 6, Jericho 17 → 7 (Ramon crater has no local ground). The panorama's px/m at the near crest itself is
  not usable for it (crests 0.4 km off give 1.4 px/m: Tel Aviv's 61 m would be 84 px).

**C10 done (2026-11-20): sky life and optics.** Commits on the C10 branch (from `0173702`; C9 merged in at `0338fec`, the datum work at `addf3be`; the 7 references both touched re-recorded on the merged code).
- *World* (`src/world/`, every rule general, from the one state):
  - `placeEnv.ts`: the land round the place (once per place): the sea's and the nearest lake's distance (the water mask, 24
    bearings to 20 km), the built and open shares within 2 km (the land cover), and the towns' **sky glow**, Walker's law
    Σ built area × (d + 0.5 km)^−2.5 over the far raster within 60 km (~0.04 Mitzpe Ramon, 0.17 Shadmot, 0.8 Rosh Pina,
    2.3 Tiberias, 3.3 Haifa, 5 Jerusalem, 6.5 Tel Aviv); fallbacks from the cover, else the population (`sources.glow`).
  - `life.ts` **birds**: a likelihood per kind from season windows (`season`), the sun's height, thermals (sun ≥ ~20–35°,
    direct light, a dry calm hour), the flyway (`flyway`: the whole country, the Rift and the hills most), the land (built,
    open, the sea ≤ 8 km, a lake ≤ 5 km), the temperature and the weather (`flyingWeather`: none at ≥ 2.5 mm/h, thunder or
    gusts ≥ 18 m/s); white storks 5 Mar–5 May and 10 Aug–12 Oct soaring at midday; common cranes on passage (late Oct–early
    Dec, Feb–Mar) and the Hula's wintering flocks at sunrise and sunset; swifts 15 Feb–25 Jul, morning and evening; gulls by
    the shore, most in winter; raptors at ≥ ~35° sun over open land; crows and rock doves by day (doves by built share);
    bats at dusk and dawn on warm calm evenings (insect-eaters in the warm months, fruit bats in towns all year). An hour's
    seeded draw against score × the kind's prevalence; at most two kinds. Migrants head north in spring, south in autumn;
    raptors drift downwind. **Aircraft**: the Schmidt–Appleman criterion (`contrails.ts`, Schumann 1996: EI 1.25, η 0.3,
    Sonntag saturation over water and ice; the threshold for saturated air at 250 hPa ≈ −41 °C, for dry air ≈ −51 °C)
    from the forecast's 250 hPa temperature and humidity (new fields, gated) or the climatological guess; a contrail forms
    below the threshold and persists in ice-supersaturated air; 1–3 airliners at FL340 on seeded tracks, and old spread
    trails when they persist; drawn only with their trail, by day and while the sun still reaches cruise level (to ~−4°),
    not through a thick deck. `airports.ts`: Ben Gurion, Haifa, Ramon, Herzliya, Rosh Pina by their coordinates, field
    heights, runways and movements an hour by day and night; the runway in use is the one most into the wind; arrivals on a
    3° glide path down the extended centreline, departures climbing ~5° (light planes 3°). **Meteors**: the IMO shower table
    (`astro/showers.ts`: peak date, ZHR, Gaussian width, radiant, speed); a shower night when its rate that night is ≥ 8;
    seen rate = ZHR × sin(radiant altitude) × 2.2^(LM − 6.5) × the clear share, LM from the twilight, the moon and the glow.
  - `nightSky.ts`: **planets** from `astro/planets.ts` (JPL's approximate Keplerian elements 1800–2050, precessed to the date;
    magnitudes after Hilton 2005 by distance and phase angle), each shown by `skyLimit` (the faintest magnitude against the
    twilight and the moon: Venus by sunset, Jupiter a little after, Saturn and a far Mars later) less its extinction near
    the horizon; never hidden by the towns' glow, only by cloud (a seeded draw against the clear share, as the stars);
    Mercury only at elongation > 18° with the sun under −6°. **Milky Way**: the galactic plane (`astro/galaxy.ts`, IAU
    J2000 pole) every 4° of longitude, its brightness by longitude (the bulge, Cygnus, Carina; the Great Rift), shown only
    with the sun under ~−15°, no moon up, a clear clean sky and the glow under ~1.
  - `optics.ts`: **rainbow** when rain cells exist, the sun is 0–42° high and shining on the scene (the light's source is
    the sun, direct ≥ ~0.3): round the antisolar point, primary 40.6–42.3°, secondary 50.1–53.6° at 0.43 of its strength,
    brighter where the rain cells are; **22° halo and sun dogs** under high cloud ≥ ~0.4 with little low and mid cloud in
    front; the dogs at the plate crystals' minimum deviation for the sun's height (21.8° at the horizon, farther as it
    climbs, none over ~60°).
- *Model* (`scene/model/life.ts`, `nightSky.ts`, `optics.ts`): layers `birds` (a strip of frames for the wing beats and the
  flock's own wheeling, periodic over the strip, flown across on a track at the birds' true angular speed), `aircraft`
  (strobes and beacon on a strip by night), `contrail` (on the dome, as the high cloud is drawn; a live trail laid behind its
  plane), `meteor` (a pulse with a meteor's light), `planets`, `twinkle` (the 8 brightest stars, each a small strip), `milkyWay`
  (on the dome), `bow` (rainbow over the clouds, halo in the high cloud). Every circle is traced on the sphere (`onCircle`) and
  projected through the bodies' scale; the halo is centred on the drawn sun. What flies keeps above the land and whatever
  stands on it (`landTopOf`, from the land layers). Two new composite-time primitives in `AnimSpec`: `flight` (a `Track`:
  offsets every `step` s, a pass every `cycle` s) and `wake` (a layer laid from its tail to its plane's x); `Pulse.look:
  'meteor'` and `Pulse.cycle`. Reduced motion: phase 0, as before.
- *Painters* (`scene/paint/life.ts`, `nightSky.ts`, `optics.ts`), in the anidoodle contract (pure in `desc` and `env.phase`,
  seeded, no clock, no `ctx.filter`): storks white with black flight feathers, neck and legs out; cranes' slow deep beat with
  the long neck; swifts' scythe wings in bursts; gulls' angled white wings with black tips; raptors' fingered broad wings and
  fanned tail, turning as they circle; crows' rowing wings; doves flashing pale as the flock banks; bats' quick jagged beat.
  Planets steady with a white core (Venus white, Jupiter cream, Mars ochre-red, Saturn pale gold); bows laid `lighter`.
- *Removed*: `src/atmo/life/` (the HTML birds, meteors, twinkle and their timers), its use in `App.tsx`.
- *Forecast*: `HourPoint.cruise` (`temperature_250hPa`, `relative_humidity_250hPa`), mapped in `mapHours.ts`, asked with
  `SCENE_HOURLY` behind `ASK_SCENE_HOURLY`, listed in the Worker's allowlist (deploy item 6).
- *Harness*: weather moments `cirrus` (with `forcedLayers`: the fixture's hours always carry mid cloud with their high) and
  `sunny`; `phase=meteor` (a moment into the first meteor).
- *Tests*: `astro/c10astro.test.ts` (Venus's 2025 elongations 47.2° / 45.9°, never over 47.6°; Jupiter, Saturn, Mars opposite
  the sun at their oppositions; Mars and Jupiter's RA/Dec at opposition; magnitudes incl. Mars −1.4 near and ≈ +1.2 far; the
  galactic centre and pole; shower dates and fall-off), `world/c10rules.test.ts` (season and hour gating of every kind, none in
  heavy rain, storm or gale, migrants' headings; the Schmidt–Appleman thresholds, formation and persistence, the climate's
  seasons; runway into the wind, glide path, traffic by airport and night; meteors only on shower nights and cut by moon, glow,
  cloud; planets' order of appearance in the dusk, city glow not hiding them; the Milky Way's darkness gates; circles at their
  radius, the antisolar point, the bow's conditions; halo and sun dog geometry), `scene/model/c10.test.ts` (flocks and low
  planes over the land at all 8 places, no birds in heavy rain, strips that loop, contrails only when the air makes them,
  planets at their place and steady, twinkling stars on strips, meteors only on a shower night, the Milky Way at Ramon not
  Tel Aviv, the rainbow in afternoon showers but not at noon or in steady rain, the halo round the drawn sun),
  `sceneHours.test.ts` (the cruise fields mapped).
- *Pixel references* re-recorded deliberately, 21 of 59, all for the new life: birds, low traffic, contrails (and the halo
  under the fixture's high cloud in the daytime moments, the twinkling stars by night): `ein-gedi-1200`, `ein-gedi-1630@2x`,
  `haifa-0620`, `haifa-1200`, `haifa-1200-dust`, `haifa-1200-overcast`, `jerusalem-0620@2x`, `jerusalem-1200`,
  `jerusalem-1200-dust`, `jerusalem-1200-offline`, `jerusalem-1200-overcast`, `ramon-crater-1200`, `rosh-pina-0620`,
  `shadmot-mehola-0620@2x`, `shadmot-mehola-1200`, `tel-aviv-1200`, `tel-aviv-1200@2x`, `tel-aviv-2100`,
  `tiberias-1200-overcast`, `tiberias-1200`, `tiberias-1200@2x`. 59/59 on both paint paths.
- *Perf* (`qa/canvas/perf.md`, C10): the model's crest and land profile laid once (rasterised columns, cached by the land
  layers' keys), contrails sampled every 3 km, strips of ≤ 30 frames; scrub.model and modelCold a few ms over C9's run,
  within its noise for Haifa; the animated frame within its 4 ms budget at p95 in most runs; memory unchanged.
- *Stills*: `qa/canvas/c10/contact-sheet.png` (20 moments, one per element), `strip-pigeons.png`, `strip-landing.png`,
  `strip-raptors.png`, `strip-contrail.png`, the stills in `qa/canvas/c10/stills/`.
- **Remaining** (for the owner's eye): birds are drawn larger than their true angular size (as the bodies are) but fly at
  their true angular speed, so a far flock crosses the sky over minutes; the Milky Way and the contrails lie on the dome (as
  the clouds do) while the planets and the bows keep the bodies' true scale; a persistent contrail is laid anew each pass of
  its plane. Deploy: item 6 above (with item 1).

**Uniform vertical scale per place (2026-11-20; owner decision 14).** Commits on `ccr-85ec24f0-9ayxgu` (from `54702fe`).
- *Rule* (`world/outside.ts` `lieOf`, one rule for every place, no place named): the place's picture has **one vertical
  scale `s`** (px / m), the same above and below the dot, for its ground and rows (`levelY`), its built cells and trees,
  its land silhouette (`landOf`), the coastal sea's shore and the datum. Each spot stands off the dot by its depth (north
  nearer, lower: `NEAR_DROP`, as before) and by `(h0 − h) × s`, with no perspective factor on the ground's heights, no
  press and no 6 px cap (the place's ground rises over the ridge line only where it truly stands higher, as its
  silhouette). The towers and houses keep their own legible sizes (`lookOf`, the frame's `k`): only the terrain shares `s`.
  - *Choosing `s`* (`verticalScale`): the place's total relief R = from the highest of its land and the near ridge's crest
    at the dot (and sea level, below 0 m) down to the lowest of its built rows, its water in the frame (a lake, the sea)
    and, on a coast, 0 m. It takes `0.93 × room × R / (R + 150 m)` px of the land area's room (`LAND_TOP` 40 px down to the
    floor, less the near drop: 59 px): a band that grows with the relief and saturates, never more than the room, clamped
    to 0.06–0.30 px/m (`VSCALE`). A flat city stays low (Tel Aviv 0.26, Netanya 0.27 px/m at the clamp's top), a mountain
    city keeps a tall band (Haifa 0.10, Jerusalem 0.12).
  - *The near ridge and the place agree* (option (a) of the brief, `placeDotY`): the dot stands under the near ridge's crest
    at the centre by the crest's height over the place × `s` (over it where the place stands higher), then moves only as
    far as the picture needs to stay in the land area (its top under `LAND_TOP`, its lowest built row and water over the
    floor, which wins) and, on a coast, for the shore to lie no higher than the sea's true horizon (the coastal sea still
    runs to its true horizon). Option (b), blending the near ridge into the place's ground, was not taken: it would redraw
    the panorama's own ridge (true height and distance from the place's eye) to suit the place, an invented ridge line,
    and the two scales would still meet only where the blend ends; (a) changes nothing in the panorama and puts the
    disagreement only where the land area forces it, by a measured number of px (below). The silhouette now also holds
    the built cells' own ground and is never smoothed under a column's own top, so no row floats over the land drawn
    under it without the cap.
  - *The datum is simpler* (`world/datum.ts`): sea level is a height on the same scale, `|h0| × s` over the dot at the dot's
    depth (`seaLevelY`, one number); the zero-contour medians (`zeroCrossings`, `placeContour`, `seaLevelAbove`) and the
    outline hollows (`outlineOf`, `datumLineOf`) are gone. The line runs along the dot's own row (`datumOfRow`), on each
    side to where that row's true ground rises through 0 m (`zeroAlongRow`, walked every 62.5 m), else `OPEN_REACH` past
    the dot fading out, as before. It is at the place's depth, so it is drawn in the near water layer (z 35, in front of
    the near ridge, behind the place's own layer), not the far one: the dot is now often on the ridge's face (Tiberias).
- *Measured at 12:00* (below/above px/m ratio, before → after; px/m; the place's ground relief in px, before → after; how
  far the dot moved off the crest relation to stay in the land area):

  ```
                    ratio        px/m above / below → s   relief px   dot moved
  tel-aviv          1.00 → 1     0.180 / 0.180 → 0.261    15 → 20      −1  (coast)
  netanya           0.80 → 1     0.272 / 0.217 → 0.272    19 → 20      −2  (coast)
  haifa             5.74 → 1     0.086 / 0.494 → 0.100    61 → 49     +22  (coast: the shore down to the sea horizon)
  beer-sheva        1.57 → 1     0.063 / 0.098 → 0.165    16 → 29     −10
  jerusalem         0.52 → 1     0.137 / 0.071 → 0.122    28 → 40     −12  (its lowest built rows over the floor)
  rosh-pina         0.21 → 1     0.275 / 0.057 → 0.133    39 → 42     −10
  shadmot-mehola    0.39 → 1     0.703 / 0.276 → 0.144    38 → 13      −6
  tiberias          5.70 → 1     0.054 / 0.310 → 0.092    40 → 45      +6  (its top under the land area's top)
  ein-gedi          1.20 → 1     0.061 / 0.073 → 0.073    49 → 42       0
  beit-shean        0.46 → 1     0.391 / 0.181 → 0.170    20 → 17       0
  jericho           0.52 → 1     0.232 / 0.120 → 0.119    17 → 15       0
  kalya             1.00 → 1     0.543 / 0.543 → 0.101    39 → 11       0
  neve-zohar        2.43 → 1     0.118 / 0.287 → 0.100    38 → 22      −3
  ramon-crater      no built cells: no local lie, the dot on the ridge line (unchanged)
  ```
  (Kalya's relief is sea level down to its lowest row, 391 m; its own ground spans 80 m, so 11 px.) Tiberias
  (the owner's case): the town's 73 m over the Kinneret and the 137 m up to sea level are now drawn at the same 0.092 px/m;
  the dot stands 31 px under the ridge line (the crest at the dot is +137 m, 274 m over the town), on the ridge's face, the
  "cliff" under the old dot gone. Haifa's Carmel keeps a tall band (the city climbing 40 px from the shore), Jerusalem's
  relief grows (28 → 40 px). The places whose own ground is flat but whose band was stretched by the old presses
  (Shadmot Mehola's 0.70 px/m above the dot, Kalya's 0.54) are now as flat as they are.
- *Stills* (`qa/canvas/vscale/`, before = `54702fe`): `before/` and `after/` of every harness place at 12:00 (the 8 base
  places, `DATUM_PLACES`, Be'er Sheva and Netanya) and Tiberias at 16:30; `sheet-before-after.png`.
- *Tests*: `world/vscale.test.ts` (6: the band and its saturation, the clamp, the dot's placement and its moves; at all 13
  places with built cells, every row's foot on the one scale above and below the dot and the measured ratio 1, the dot
  in the land area, Haifa / Jerusalem / Rosh Pina at least 25 px tall, Tiberias's dot under the ridge line).
  `world/datum.test.ts` rewritten for the simpler rule (7: the row's line and its open ends, the panorama's own 0 m
  contour as before, and at the seven places below sea level: the line `|h0| × s` over the dot, its note and the label
  clear of it, Tiberias's and Ein Gedi's ends where the row's ground is 0 m ± 15 m). `scene/model/outside.test.ts`: the
  climbing-rows test no longer skips the capped rows (there is no cap). Pixel references re-recorded deliberately, the 50
  that show a place's own ground: every case of Shadmot Mehola, Tel Aviv, Jerusalem, Haifa, Rosh Pina, Tiberias, Ein Gedi
  (`*-0620`, `*-1200`, `*-1630`, `*-2100`, the weathers, the `@2x` cases, `rosh-pina-0620-arrive-1.2`); Ramon crater and
  the loading / offline / arriving-at-0.7 cases unchanged; 59/59.
- *Perf*: the place is built once per place (the world builder keeps it); its cost unchanged in node (placeOf 9–44 ms
  before and after), and the scene model the same (1.5–3.4 ms a frame unthrottled, both; the land layers the same in
  number: the datum moved from `water.far` to `water.near`, Tiberias one layer fewer). `npm run test:perf` within its
  run-to-run noise against `54702fe` run in the same container: Shadmot Mehola scrub.model p95 15–19 ms after vs 16–26
  before, modelCold 25–40 vs 29–33; Haifa and Tel Aviv overlapping likewise; the OVERs are C5's and C6's, as before.


**C10 fixes (2026-11-20): the halo, the contrails, the Milky Way and the rainbow, each by a general rule.** Commits on
the C10 branch (from `54702fe`; `ccr-85ec24f0-9ayxgu` at `2d35366`, the vertical scale, merged in). The owner's report
on `qa/canvas/c10/contact-sheet.png`: the 22° halo a loop or a teardrop (at a low sun a pointed V); persistent contrails
huge arches, loops and hooks; the Milky Way a stiff column of stripes.
- *The cause, one for the first two*: shapes traced on the sphere were projected point by point through the scene's sky,
  which is cylindrical across (1.5 px a degree of azimuth, spreading as 1/cos h going up) and stretched up (the relief's
  tanh near the horizon, the dome above 22°): a circle round the sun is bent into a loop, and a contrail, a great circle,
  into an arch wherever it passes high.
- *The rule* (`scene/model/tangent.ts`): optics and contrails are drawn in the sky's **tangent frame** at their centre, the
  same px per degree across and up (`tangentScale`: the camera's px a degree of azimuth over cos h at the centre, held
  under 1/0.6 of it near the zenith), anchored where the projection puts the centre. A circle stays round; a great circle,
  gnomonic in the frame, stays straight.
- *Halo* (`model/optics.ts`, `paint/optics.ts`): a true circle round the sun as drawn, 22° at the frame's scale at the
  sun's height (so it sits where the sun's own mapping puts that ring across). Painted as radial washes: the sky a shade
  darker inside, a sharp faintly red inner rim, warm white fading out over ~10°. The sun dogs level with the sun at the
  plates' minimum deviation (21.8° at the horizon, farther as the sun climbs), soft patches taller than wide, red toward
  the sun and fading to a whitish tail outward. What falls under the land or the eye's horizon is clipped (`skyClip`: the
  sky's outline down to the crest or the horizon, whichever is higher).
- *Contrails* (`model/life.ts`): a live trail is drawn in the frame tangent at its plane (the plane at its true place, its
  trail straight behind it, its way ahead straight; the `wake` keeps laying it as it flies); an old trail in the frame at
  the middle of its stretch in view. Every trail is straight or very gently curved (the earth's curve), never turning
  back. A live trail is thin at the plane and spreads toward its old end, fading over its oldest quarter; an old trail is a
  wide soft band (a broad faint veil under it in the hand) with both ends fading, drifting with the high cloud as before.
  Short trails of non-persisting air stay thin behind their plane. How many: one to three planes by the Schmidt–Appleman
  margin, none to two old trails by the ice supersaturation, at most four trails drawn (`MAX_TRAILS`).
- *Milky Way* (`model/nightSky.ts`, `paint/nightSky.ts`, `astro/galaxy.ts`): still the galactic plane at its true place on
  the dome (where the stars are), and gated as before (dark sky only). Its width now follows its true angular width,
  swelling and narrowing (seeded, smooth along it) and held under 34 px only where the cylinder spreads the sky near the
  zenith; it fades out from 60° to 82° up (was cut at 74°). The hand: many soft seeded blobs, Gaussian across so its
  edges fade, mottled by noise; brighter warm knots at the star clouds (`starCloudAt`: the Large and Small Sagittarius
  clouds, Scutum, Cygnus; the bulge low in the south-west on a summer night); a dust of faint stars; the dark lanes taken
  out of its light (`destination-out`: the Great Rift a broken lane a little off its middle from Cygnus to Sagittarius,
  small dust patches elsewhere). Faint throughout, under the bright stars. (Mitzpe Ramon at 23:30 on 12 Aug: the plane
  passes within 2° of the zenith at azimuth 214°, so the band truly stands upright there; at Shadmot at 22:00 it leans.)
- *Rainbow*: a true circle round the antisolar point in its tangent frame, the frame's horizon on the eye's at that azimuth;
  its px per degree such that the bow's top stands where the sky puts the top's altitude, held within 1–2× the sky's scale
  across. Primary violet 40.6° to red 42.3° (red outside), the sky inside it a little brighter, Alexander's band between
  the bows a little darker, the secondary red 50.1° to violet 53.6° (reversed). Its strength round the circle (the rain's
  azimuths, the foot, only the view's own span of azimuth, never across the camera's seam) is a conic mask
  (`destination-in`); clipped by the land. None when nothing of it shows over the land in view (Haifa at noon: the bow's
  4° top lies due north, behind the eye).
- *Contract*: painters pure in `desc` (no phase needed), seeded, no clock, no `ctx.filter`; `createConicGradient`, clip
  and composite modes only, all worker-safe.
- *Tests*: `scene/model/c10fixes.test.ts`: the halo's projected 22° circle has x/y radii equal (ratio 1 ± 0.005) at
  four sun heights at three places, centred on the drawn sun, while the sky's own projection would bend it (> 5 %); its
  clip never under the land or horizon; sun dogs level with the sun, outside 22°, moving out as it climbs; every contrail
  over 8 places × 3 hours × 2 skies never turns back (each step < 90°), bends < 15° in all and strays < 3 % of its chord
  from it, at most 4 trails; a live trail thin at its plane, wider at its old end; the Milky Way's spine 90° from the
  galactic pole and at its true place, brightest toward Sagittarius low in the south-west, its width varying (> 1.3×),
  none over 82°, gated; the rainbow round the antisolar point on the horizon, round in its frame, clipped by the land, red
  outside on the primary and inside on the secondary, the darker band only between them. `c10.test.ts`'s halo check now
  asserts the circle's centre and radius.
- *Pixel references* re-recorded deliberately, 7 of 59, all for the straight contrails (the planes' trails and their
  angle): `haifa-0620`, `haifa-1200`, `jerusalem-0620@2x`, `rosh-pina-0620`, `shadmot-mehola-0620@2x`, `tel-aviv-1200`,
  `tel-aviv-1200@2x`. 59/59 on both paint paths.
- *Perf*: the new contrail model is cheaper than the arches' (0.05 vs 0.09 ms a call unthrottled, Haifa and Tel Aviv over a
  day's scrub); the halo, rainbow and Milky Way models under 0.01 ms. `npm run test:perf` against the same code before
  in the same container: within its run-to-run noise (`qa/canvas/perf.md`).
- *Stills*: `qa/canvas/c10/contact-sheet-2.png` (the same 20 moments as `contact-sheet.png`), and before/after close-ups in
  `qa/canvas/c10/fixes/`: `halo-jerusalem-1100.png`, `halo-jerusalem-0830.png` (the low sun's V gone),
  `contrails-jerusalem-1100.png`, `contrails-jerusalem-0830.png`, `milky-way-ramon.png`, `milky-way-shadmot.png`,
  `rainbow-tel-aviv-0800.png`.

**Decision 14, follow-up (2026-11-20): the near land is the place's own; the datum only on land.** Commits on
`ccr-85ec24f0-9ayxgu` (from `2d35366`; the C10 fixes merged in at the end, their 7 references re-recorded on the merged code).
From the review of `qa/canvas/vscale/sheet-before-after.png`: the near ridge and the place were still on two scales (the
ridge the panorama's, from the place's own eye), so the ridge dwarfed the place (Haifa's Carmel hump bare and dark over a
city whose own built cells reach its top; Rosh Pina, Ein Gedi); and the datum floated in the sky (Jericho, Kalya, Neve
Zohar, Ein Gedi).
- *The near land* (`world/outside.ts` `nearLineOf`, `landAround`, `drawnTerrain`; one rule, no place named): within the
  place's span the land drawn is the place's own ground on its scale `s`, through the same lie its rows stand on (`levelY`:
  its ground spots and its built cells' own ground), and the land truly behind or beside it: the local ground south of
  the frame, or east or west of it (never in front of its near edge), at its true depth through the same lie, a metre
  beyond the frame's far edge smaller by its depth (decision 14: one scale *at the same distance*), laid as continuous
  row profiles of the 250 m local grid. The panorama's ridge rises over the place only where that real land is higher.
  The land beside it is laid `NEAR_MARGIN` (40 px) past the place's span; past that the line eases into the panorama's
  ridge over at least `NEAR_BLEND` (24 px), wider where the two stand far apart (a slope of about 1 px a px at most). The
  far line follows it where the panorama's far horizon is that near ridge itself (`farShows` false), so the panorama's
  near ridge never shows through; where the eye truly sees far land over it, the panorama's far line stays. The near
  snow is on the place's scale there (from each crest down by `(crest m − snow line m) × s`). `s` now also holds the
  land round the place (`hiM`, and the dot's room above). The world draws the near plane, its faces, the marks and the
  datum on this land (`world.ts` `drawnOf`); the far towns keep the panorama's own, and so did the sun's and moon's skyline until the sky continuity fix below, which judges them on the land as drawn (the
  far towns are the far land's, drawn behind the near land). `landOf` (the place's land over the ridge) now rarely
  draws: the near line holds it.
- *The datum only on land* (`world/datum.ts` `datumOnLand`): a contour lies on land, so the row's line is drawn only where
  it stands over the drawn land (the near land, or far land showing over it), in pieces (under 10 px dropped); a piece
  cut by the land's edge ends there with no fade, a surviving open end keeps its fade. With no piece left: no line and no
  note. The note stands over the dot's piece, else the widest, centred on one shorter than the text.
- *Measured at 12:00* (before = `2d35366`; "ridge over rows": how far the drawn near land stands over the highest of the
  place's rows in a 3 px column, max, and the columns where it is over 4 px; rows: the spread of the rows' feet):

  ```
                    s              rows px    ridge over rows (max; cols > 4 px)   datum pieces (px at 375)
  tel-aviv          0.261 → 0.249  18 → 18     4 → 16   (1 → 52 of 77)              –
  netanya           0.272 → 0.264  16 → 16     3 → 10   (0 → 21 of 46)              –
  haifa             0.100 → 0.090  49 → 45    56 → 20   (40 → 32 of 97)             –
  beer-sheva        0.165 → 0.165  28 → 28     2 → 15   (0 → 74 of 97)              –
  jerusalem         0.122 → 0.107  40 → 36    18 → 27   (5 → 30 of 92)              –
  rosh-pina         0.133 → 0.077  38 → 25    12 → 13   (16 → 29 of 44)             –
  shadmot-mehola    0.144 → 0.144  11 → 11    22 → 21   (18 → 18 of 18)             122–254 → none (no land under it)
  tiberias          0.092 → 0.092  44 → 44    29 → 37   (44 → 22 of 47)             122–224 → 132–224
  ein-gedi          0.073 → 0.071  13 → 13     8 → 15   (1 → 21 of 24)              122–271 → 124–138, 225–271
  beit-shean        0.170 → 0.170  13 → 13     9 → 9    (9 → 5 of 33)               122–254 → 241–254
  jericho           0.119 → 0.119  12 → 12    12 → 14   (8 → 12 of 63)              122–333 → 265–302, 305–333
  kalya             0.101 → 0.101   5 → 5      1 → 3    (0 → 0 of 26)               122–321 → 272–321
  neve-zohar        0.100 → 0.100  16 → 16    19 → 19   (21 → 19 of 21)             122–305 → 259–305
  ramon-crater      no built cells: the panorama's ridge as it is (unchanged)
  ```
  Haifa: the bare Carmel hump over the city is gone; the city's rows reach the top of its own land (their top at the
  silhouette, 56 px of the old hump down to 20, which is the Carmel truly behind it, south of the frame). The other
  places' "ridge over rows" now measures real land behind or beside them at the place's scale (Tiberias's hills to the
  west, Be'er Sheva's and Tel Aviv's low rises beyond the frame), not the panorama's; it grew where the panorama's ridge
  had stood lower than that land at `s`. Rosh Pina's `s` falls (0.133 → 0.077) because Mount Canaan beside it (827 m) is
  now in the picture on the same scale; its rows keep 25 px. Every datum piece lies on land; Shadmot Mehola's sea level
  stands over no drawn land, so it has no line and no note (its label still says −175 m).
- *Tests*: `world/vscale.test.ts` as before (the mountain places' rows over 20 px: Rosh Pina's 25). `world/datum.test.ts`:
  the line on land only, each hard end at the row's 0 m crossing or the land's edge; Tiberias, Ein Gedi and at least five
  of the seven keep a line; no line and no note with no land under it (`datumOnLand`, unit). `scene/model/outside.test.ts`:
  rows stand on the drawn near land (none floats); the near snow on the place's scale at the dot. Pixel references
  re-recorded deliberately (the 51 that show a place's own ground or its arrival, on the merged code: every case of
  Shadmot Mehola, Tel Aviv, Jerusalem, Haifa, Rosh Pina, Tiberias, Ein Gedi, `haifa-1630-arrive-0.7` and
  `rosh-pina-0620-arrive-1.2`); Ramon crater and the loading / offline cases unchanged; 59/59.
- *Perf*: the near line has as many points as the panorama's ridge (201) and the land round the place is sampled on the
  local grid's own 250 m. `npm run test:perf` (Haifa, Tel Aviv, Shadmot Mehola, two runs each) against `d31e253` in the
  same container: worldCold 554–661 / 287–309 ms vs 631–676 / 304–322 (Haifa and Tel Aviv / Shadmot), scrub.model p95
  25–29 / 16–23 / 15–19 vs 26–28 / 20–26 / 15–17: within the run-to-run noise; the OVERs are C5's and C6's, as before.
- *Stills*: `qa/canvas/vscale/after2/` (the 14 places at 12:00 and Tiberias at 16:30), `sheet-2.png` (before = `2d35366`,
  `qa/canvas/vscale/after/`).


**The wear card on canvas (2026-11-20): the "מה ללבוש" clothesline drawn from the scene's own world.** Commits on
`ccr-wear-canvas` (from `e1cb3d7`, the head of `ccr-85ec24f0-9ayxgu`).
- *What and where.* The card's SVG line and its CSS/SMIL animation (`ui/wear/*`: `WearLine`, `garments`, `tops`, `gear`,
  `peg`, `gust`, `WearLine.module.css`) are gone. The card (`ui/WearCard.tsx`) keeps its section, heading and sentence
  and holds the line's box exactly as the SVG had it (`.line`: 100 % up to 335 px, `aspect-ratio: 335 / 86`, the same
  margins), `aria-hidden`, so nothing moves when the drawing arrives (card height 189 px before and after at 375 px). The
  drawing is the scene chunk's: `SceneCanvas` portals `scene/react/WearCanvas.tsx` into `[data-wear-line]` (as it does
  the sky into `[data-sky]`), with the world it already built; App only passes the tip's garments and the sheet's paper.
  No second world: the line answers the shown hour (scrubbing the valley moves the line with it). Its surface (`wear`)
  stands `PAD` px out from the box (pegs above the rope, the swing, long hems below), its own canvas, `aria-hidden`.
- *Model* (`scene/model/wear.ts`, `wearKit.ts`; pure): the rope a true catenary (`catenary`, `a` solved by bisection) with
  the pegs' point loads kinking it; the garments in the sentence's order (the first on the right), as the tip picks them
  (`text/wear.ts` unchanged but for its drawing-only `wind` field, now dead: the old drift was not camera-aware). From
  the world: `wearAir` (`world.wind`: still below ~8 km/h with no gusts over the mean; `blow` and `gusty` set the lean,
  the swing, the line's lift and the cycle; the sign is `wind.across`, the camera's), `wearWet` (rain now, or the ground
  still wet: darker, deeper cloth, a heavier hang and a deeper sag, less swing, beads on the rope, drops falling from the
  hems), snow lying on every up-facing edge and on the rope (`snowfall`), dust dulling the cloth toward the haze, and
  `wearLight` (`light.side`, `direct`, `colour`, `ambient`; the moon's faint side by night; `night.dark` dims and cools
  every colour on the line, rope and pegs too). The light is quantised (1/20 shine and dark, 1/48 colour) so a scrub
  repaints the cloth only when its light visibly turns.
- *Painter* (`scene/paint/wear.ts`, worker-safe: Path2D from the old drawing's own path data, cached): the scene's tone
  shapes lit from the light's true side (a falloff from a lit edge with its rim to a shade side, the drape and sleeve
  shadows mirrored to the side away from the light; with no side, the sky's light from above), the hem gathering shade,
  a grain per cloth (weave, knit, twill, nylon creases, straw), gravity folds from the pegs, seams and stitches, a soft
  ink edge so the cloth still reads on paper; spring pegs; the rope's lay, its ties and tabs (the shown hour's
  `ridgeNear`). Painted in a paint worker like the scene's (`warmPaintWorkers(3)`).
- *Animation* (composite-time only): `AnimSpec.sway` (`anim.ts` `gustAt`, `swayAt`): each sprite laid through an affine
  about its pivot following the old line's gust cycle (`GUST` stops kept): the rope's sag eased (a vertical scale about
  the ties), each garment lifted by its share of that sag, pegged cloth sheared at the hem, hooked things turned about
  the hook a beat late; drops fly a `Track` in the frame of what they drip from. A calm has no `animated` at all (no
  loop); reduced motion lays the rest pose (the downwind lean) and a drop hanging at the hem.
- *Tests*: `scene/model/wear.test.ts` (the gust cycle and the rest pose; the catenary and the loads; calm → still; the
  swing's sign is `wind.across` both ways and grows with the wind and the gusts; the cloth rides the rope's lift; rain →
  wet, darker, heavier, beads and drops; snow and dust; the light's side and its lit/shade order; night dims and cools
  the cloth, pegs, edge and rope; the layout inside the surface; keys free of the phase). Pixel cases `wear-calm`,
  `-windy`, `-rain`, `-dusk`, `-night`, and `wear-calm@2x`, `wear-rain@2x` (`scene.html?wear=`, `e2e/cases.mjs`).
- *Perf* (CPU ×4, dpr 3, harness): main thread at the cold start 14–24 ms (asking the worker and laying its bitmaps), the
  worker's paint ~60 ms; a swaying frame (laying ~6–16 small sprites through their transforms) p50 0.1 ms, p95 ≤ 1.4 ms
  (budget 4); ~5 MB of canvases. Painting on the main thread instead cost 55–120 ms in slices of up to 46 ms, so the line
  takes a third worker.
- *Bundle* (`npm run build`): main `index` 411.37 → 400.12 kB (gzip 140.69 → 136.67), its CSS 38.30 → 33.69 kB;
  the lazy `CanvasScene` chunk 264.13 → 284.55 kB (gzip 101.74 → 109.70); `paintWorker` 68.98 → 81.47 kB.
- *Stills*: `qa/canvas/wear/before/` (the SVG) and `after/` (canvas): calm, windy, rain, dusk, night in the app
  (`e2e/wear.stills.mjs`); `after/line-snow.png`, `after/line-dust.png` (harness); `sway-gale.png`, `sway-breeze.png`
  (`e2e/wear.strip.mjs`: the line laid at a run of phases).

**Sky continuity (2026-11-20): life is a process in time; the sky is hidden by the land as drawn.** Commits on
`ccr-sky-continuity` (from `0683a41`). Two owner reports, each fixed by one general rule (no place named).

*1. Life popped in and out as the 24 h slider was scrubbed* (each hour drew its own birds, planes and trails). **Rule: the
sky's life is a continuous process in time, never a per-hour draw.**
- *Schedule* (`world/lifeSchedule.ts`): for each place and day there is one deterministic schedule of events, seeded by
  the place and the date. A thinned Poisson process draws it, with a rate that follows the existing likelihoods
  (`birdScores` × prevalence, the Schmidt–Appleman margin and the trails' light, the airports' movements by day and by
  night under the low deck, the shower rate). The rates are sampled every 10 min and read straight between samples, so a
  gate (rain, storm, gusts, night) ramps the rate. It never cuts off an event already in the air. The kinds of events:
  - a flock's session: a straight path at its height. Its closest point is square to its way, on the side toward the
    view, and over the drawn land there (`floorAlt`). It begins and ends `reach` × its closest distance away (4–6×), where
    it has shrunk and faded into the haze (`fade` 0 at both ends). Migrants pass at their glide. Residents' centres
    wander at 0.5–2 m/s (a raptor drifts downwind), so they move at most ~25° a minute at their closest. Their fast
    motion is the composite loop.
  - an airliner's crossing: 150 km out to 150 km out, its closest point 15–60 km ahead.
  - a movement on the runway in use at its start: an arrival 50 km down its 3° glide to the runway, a departure up its
    climb (light planes out to 25 km).
  - a meteor: a moment of the night.
  At most three flocks and four persistent trails are under way at once: a newcomer waits while the sky is full.
- *Inputs* (`world/lifeDay.ts` `lifeInputAt`): the schedule reads the world's life input at any moment, built from the
  forecast's hours as a picked hour reads them, with the sun and moon at that moment. It never reads `now`: a moment past
  the forecast takes the nearest hour. The world builder keeps the schedules per date while their inputs stay the same
  objects (`makeLifeDays`). A minute's world evaluates the day's events and the day before's (`lifeAt`), so what flies
  past midnight flies on.
- *Rendering at t*: `world.life` holds only the events under way at t, where their paths have brought them:
  - flocks by azimuth, altitude and distance, with their closest distance and fade;
  - airliners and each puff of their trail;
  - movements, with their height over the field;
  - the meteors of the next 15 min.

  The model paints a flock or a plane once, round its own origin, at its full size (its closest distance). It is laid at
  composite time (`LayerBase.placed`; named so after the merge with the clothesline, whose rope has a `lay` colour) where its path puts it, scaled by closest ÷ present distance and faded by the air's haze
  and its session's ends. A scrub therefore moves it without a repaint.
- *Contrails* grow from their plane on a fixed grid of emission moments (20 s), one puff per moment. Each puff keeps its
  own seed and lump. It is carried by the upper wind from when it was laid (the 300 hPa wind where the forecast gives it),
  and spreads and fades by its own age. A persistent trail lives 18–48 min and stays after its plane has gone. Every trail
  is still a straight line in the tangent frame (one wind carries a straight track). The `wake` primitive is gone (removed again in the merge with the clothesline work: nothing uses it).
- *Airport traffic* follows its glide or climb in time. Near the field it shows over the five minutes its own vertical
  speed takes through the lowest air: it lifts out of the land's haze, or sinks into it, and is never cut on the runway.
  Far off it fades by distance before its path ends.
- *Meteors* stay brief flashes, tied to t: the meteors of the next 15 min are drawn, each flashing once that many seconds
  into the composite loop. None show under reduced motion.
- *Ambient animation*: the flock's strip of wing beats and wheeling stays as before. Its drift is now a closed sway
  (`flight`, a 24 s loop of a few px round its place), so it never fights the scrub position. Planes keep only their night
  strobes. Reduced motion shows the picture at t.
- *Depth*: an object is hidden by the land drawn in front of it (the land surface lies over the sky). Where it is nearer
  than the land at its x (its distance against the near and far planes' `distanceKm`, `inFrontOf`) and reaches down into
  the land's figure, a copy is laid on the land surface:
  - nearer than the near land: over everything there (z 40.5);
  - nearer than the far land only: between the far and near land (z 18).

  The sky copy is then laid only above the figure's top (`placed.above`). Nothing is clamped over the crest any more.

*2. A low sun was drawn over the near hill and the town* (Jerusalem-like land). The near land is the place's own ground
since decision 14's follow-up, but the sun and moon were still judged on the panorama's skyline. On top of that, C9's
`bodiesOverPlace` laid the disc again over the place's mass. **Rule: everything in the sky is hidden by whatever land and
structures are actually drawn in front of it, and the light judges the bodies on that same line.**
- `world/drawnSkyline.ts` is the top of what is drawn, rasterised every half px:
  - the near and far land as drawn;
  - the place's own ground over the ridge;
  - its boxes, towers, trees, the towers and towns beyond it;
  - the marks and the far towns' towers.

  It keeps the panorama's eye level, camera and peak, so the bodies are placed exactly as before and only judged against
  it. The sun's `overLand` and `clearance` use it, and with them the light's source and direct light, the water's sun path,
  the ridge rays and glare (`rayStrengths`) and the marks' `againstLight`. So do the moon's `overLand`, the twilight glow's
  crossing, and the day's visible sunrise and sunset (`light.ts` `visibleDay`, kept with the crossings).
  `bodiesOverPlace` and the `over` body part are removed. The stars, planets, Milky Way, halo, bows, rays and aureole are
  on the sky surface, under the land.
- Checked at sunrise and sunset at the 8 base places and the 4 `DATUM_PLACES`: the judged state equals what the model
  draws (the disc's top against the model's land top, `landTopOf`) at every moment more than 1.5 px from the line.

*Tests*:
- `world/lifeSchedule.test.ts` (8):
  - determinism (same place and day equal, another day or place differs);
  - every flock fades to 0 at both ends and is nearest at its middle, under 25° a minute;
  - rate ramps (no flock starts in heavy rain from its hour, some flock already up flies on through it);
  - the caps;
  - no airliner where the air makes no trail, none by night;
  - a trail's newest puff at its plane, a puff two minutes older and carried 3.6 km by a 30 m/s wind, the trail outliving
    its plane then gone by age;
  - arrivals descending in time, more traffic by day;
  - the day before evaluated past midnight.
- `scene/model/continuity.test.ts` (4): minute-by-minute scrubs (06:00–17:00) at Tel Aviv, Haifa and Jerusalem.
  - A minute moves a bird under 45 px and an aircraft under 200 px (its true angular speed near an airport).
  - Scale and alpha change by bounded steps.
  - Nothing appears or vanishes unless faint (alpha ≤ 0.2 or scale ≤ 0.25), at the frame's edge or hidden by the land.
  - A jump of hours gives the same `life` as a fresh build.
- `world/drawnSkyline.test.ts` (2):
  - at all 12 places, sunrise −10…+50 min and sunset −100…+20 min every 10 min, the judged `overLand` equals the drawn
    picture;
  - no sunlight and no glare from a sun behind the land;
  - no body layer on the land;
  - each edge of the day crosses once;
  - the moon by the same line.
- Updated: `c10.test.ts` (front copies only where the object is nearer than the land; the sway is a closed loop),
  `c10fixes.test.ts` (the trail's newest puff at its plane, widest at its old end), `c9.test.ts` (defect 3 superseded: no
  disc over the place's mass), `model.test.ts`, `c10rules.test.ts` (`birdsOf` now from a schedule with the hour held all
  day).

*Pixel references* re-recorded deliberately, 24 of 59: the new life (birds, planes and trails where the schedule puts them)
and the sun now behind the drawn land at `jerusalem-1630` and `haifa-0620`. The 24:
`ein-gedi-1200`, `ein-gedi-1630@2x`, `haifa-0620`, `haifa-1200`, `haifa-1200-dust`, `haifa-1200-overcast`,
`jerusalem-0620@2x`, `jerusalem-1200`, `jerusalem-1200-dust`, `jerusalem-1200-offline`, `jerusalem-1200-overcast`,
`jerusalem-1630`, `ramon-crater-1200`, `rosh-pina-0620`, `rosh-pina-0620-arrive-1.2`, `shadmot-mehola-0620@2x`,
`shadmot-mehola-1200`, `tel-aviv-0620`, `tel-aviv-1200`, `tel-aviv-1200@2x`, `tel-aviv-2100`, `tiberias-1200`,
`tiberias-1200@2x`, `tiberias-1200-overcast`. 59/59. Merged with main (the clothesline on canvas): `wear-dusk` re-recorded too. At Jerusalem 16:30 the sun is now behind the drawn land, so the clothes lose its warm direct light. 66/66 on both paint paths.

*Perf* (`npm run test:perf`, two runs each, against `0683a41` in the same container; `qa/canvas/perf.md`):
- scrub.model p95 is within the run-to-run noise:
  - Haifa: before 26–37, after 24–29;
  - Tel Aviv: before 24–26, after 25–28;
  - Shadmot: before 20–23, after 16–20.
- The animated frame is within its 4 ms at p95.
- worldCold grows by the two day schedules: +100–170 ms at CPU ×4 (Haifa 665–713 → 730–883, Tel Aviv 710–732 → 811–888,
  Shadmot 314–343 → 402–465). Unthrottled in node, a day's schedule takes ~10 ms (once per place, day and inputs).
- Per scrub frame, a flock or plane is laid, not repainted; only a contrail's band is repainted as it ages.

*Stills* (`qa/canvas/continuity/`):
- `strip-flock-crossing.png`: Jerusalem 08:14–08:44 every 3 min, two crane flocks flying in past the left edge, passing
  and receding.
- `strip-plane-approach.png`: Shadmot Mehola 08:16–08:36 every 2 min. An airliner comes up small and faint from far off,
  crosses and recedes; a crane flock enters past the edge and recedes into the haze.
- `strip-contrail-aging.png`: Jerusalem 10:44–12:24 every 10 min, trails growing from their planes, spreading, drifting
  and fading by age.
- `strip-sunset-{jerusalem,haifa,tiberias}.png`: before (`0683a41`) and after, the disc and its glare over the town
  before, sinking behind the drawn land after.
- `strip-sunrise-{jerusalem,haifa,tiberias}.png`.

*Remaining* (for the owner's eye):
- An event moves at its true speed (a resident flock's centre at its wander), and the slider steps by whole minutes. A
  jet near an airport, or an airliner at its closest, therefore still jumps tens of px a minute, continuously along its
  path.
- The approaches into Ben Gurion seen from Tel Aviv are mostly behind the city's own drawn land, or faint near the
  horizon.
- The cap and the day's start are judged per day: around midnight, the day before's events may add one to the caps.

**The living light (2026-11-20): light and shade change smoothly, from one continuous model.** Commits on
`ccr-living-light` (from `ace906a`). The owner's report: "the change of light and shade is sharp instead of alive; it
stands out on the houses and on the clothes". **Rule: every light parameter is a continuous function of the one world
state; a surface takes the light by its own normal; nothing switches.**

*Diagnosis* (a minute-by-minute scrub through sunrise, noon and sunset at Jerusalem, Haifa, Tiberias and Tel Aviv, the
fixture's own cloud and a forced clear sky; the largest change a single minute made, before → after):

| Where | Cause | Before (per minute) | After |
|---|---|---|---|
| Sunrise / sunset, `light.ts` | `daylight = smoothstep(0, 2 px)` of the clearance, no air mass in `direct`: the sun lit at nearly full strength until its centre touched the line, then nothing | direct 0 → 0.26 → 0.56 in 2 min; 0.08 → 0 | ≤ 0.054 (Tiberias, the steepest hills; 4–8 min fade) |
| Source switch | `direct < 0.05` → source `sky`: side, ray, shadow and colour all dropped; the colour jumped to the sky's | colour R 1.0 → 0.16; shadow alpha 0.51 → 0 | colour × share ≤ 0.1; shadow ≤ 0.05 |
| Noon crossing | `side` null while `|lateral| ≤ 0.02` (8 min at Jerusalem), then the other side: lit strip, roof, glyph mirror, cloth all flipped | box face 0.55 → 0.34 → 0.55 (other side); cast 0.51 → 0 → 0.51; cloth shine 0.95 → 0 → 0.95 | faces ≤ 0.03; cloth side ≤ 0.07 |
| Hour boundary, `layerCovers`, `airOf` | the hour's layers and visibility stepped on the hour (only the total was read between hours) | low cloud 0 → 0.46; direct 0.44 → 0.12; `wallShade` 0.19 → 0.65; tones 0.09 | covers ≤ 0.009; tones ≤ 0.035 |
| Cloud banks | `round(cover × max)`: a bank popped in or out | whole bank | gathers over one unit of cover (`share`) |
| Moonrise at dusk | `MIN_MOON` gate | direct 0 → 0.06, side 0 → 1 | continuous |
| Sky's form side, `skyFormOf` | `|across| > 0.08` and alt > −2° | 0 → ±1 | ≤ 0.08 |
| Lit windows, `litShareOf` | steps at −4° and on 17, 23, 1, 5 h | 0 → 0.06 → 0.12 | ≤ 0.03 |
| Ground wet, clothes' light | the hour's rain stepped; the clothes' shine quantised to 1/20 and gated by a side | 0.5 | 1/40 steps, no gate |

*The model* (`world/livingLight.ts`, `world/light.ts`):
- **Direct share** of the sun = `discShare(clearance)` (the true 0.53° disc as a circular segment over the drawn land,
  softened by a ±2.5 px edge: the air's shimmer, a penumbra) × `airDim` (the true air-mass and aerosol transmission,
  `sunLight`, as the adapted eye sees it: `strength^0.35`, so a sun 2° up gives about a third) × the cloud's transmission.
  The moon the same way (its phase, height and veil, its disc's share). `light.shares` keeps both; `body.visible` the disc
  share, used also by the glare (`rays` corona), the water's path, the coastal glint.
- **Direction** `light.dir` (`viewDir`): the source as a unit vector in the view's frame (across, ahead, up). The label
  (`source`) changes only under a share of 0.04; every directional effect eases in over `SHADING` (0.04–0.45 of direct),
  so an overcast's light is soft and nearly directionless and turns so gradually. The colour fades to the sky's as the
  share goes.
- **Faces** (`faceLight`, in `Shine.faces`): Lambert by each face's true normal (front, left, right, top) with a little
  wrap for plaster, a gentle contrast curve, and `rim` for a back-lit edge (the source low beyond the land). The painters
  mix every face from its base toward the lit tone by its own share: boxes and towers draw both side faces each by its
  share (`paint/outside.ts` `sideFace`), tile roofs light each plane by its share, flat roof edges by the top's; glyphs
  blend from even (symmetric) to sided by the two sides' difference (`Kit.k`), so the mirror at the crossing never shows;
  trees keep their own shape (the lobe seeded, not by the light); far towns blend their blocks by `sideK`.
- **Shade is filled**: by the sky (cooler, bluer, more under a clear sky) and a little warm bounce from sunlit ground
  (`tonesAt`); the cloth's shade by the sky too.
- **Alive touches**: a soft contact shade at every box's foot and under the eaves; a low sun glinting in the windows of
  the faces turned to it (front rows and the side faces' glass, `Shine.glint`); a back-lit roof ridge and tower edges
  catching the light beyond; cast shadows foreshortened to a stub as the light comes from straight ahead or behind.
- **The clothes** (`wearLight`, `paint/wear.ts`): the line hangs across the view, the cloth facing the eye; `across` the
  side light's signed strength, `front`, `back` (the sun beyond the line: in Israel's south-facing view the common case),
  `up`. The side falloff and the even light from above blend by the side's strength; the drape shade is crossfaded between
  its two mirrored halves; a back-lit thin cloth glows in its own colour (`THIN` by grain: a tee 0.9, a coat 0.2) with a
  rim on every edge; the rope's shadow falls across the cloth (on its face, or seen through it); a neighbour shades a
  garment when the light runs along the line (`cast`: its outline carried the line's spacing along the light).
- **Clouds in time**: the hour's layers and visibility read straight between hours (`hourBetween`), the ground's wetness
  too; the newest bank gathers (`CloudBank.share`). **Cloud shadows** (`model/cloudShadows.ts`, kind `cloudShadow`): under
  a broken low and mid cover with a sun to cast them, three bands of the land by distance, each a seamless tile of soft
  patches as large as clouds are there, laid `source-atop` the land (`LayerBase.blend`) at z 40.3; the tile is carried by
  `world.shadows.driftKm` (the 850 hPa wind's across part integrated through the day's hours, `cloudDriftKm`) through
  `AnimSpec.offset`, with a slow drift in the ambient loop, and laid at `AnimSpec.alpha` = their strength: a scrub moves
  them with no repaint (the tile repaints only when the cover steps by 1/16).

*Tests*: `world/livingLight.test.ts` (10): the disc share against a numeric segment, half at the edge, monotonic and
smooth; `airDim` monotonic and continuous, dimmer in haze; Lambert 1 square-on, monotonic in the angle, 0 past the edge;
no lit-side flip through the view axis (each face ≤ 0.05 per 0.25° of azimuth, equal straight ahead), east lights the left;
back light gives a rim and no front light; faces fade with the share to nothing; the layers and visibility halfway at :30;
banks gather (≤ 0.1 per 0.25 % of cover, never moving); the windows' share eased; the cloud drift continuous and integrated.
`scene/model/livingLight.test.ts` (13): ten scrubs (Jerusalem, Haifa, Tiberias at sunrise, noon and sunset, clear, and
long scrubs under the fixture's changing cloud) with every parameter's per-minute change under its bound (tones 0.035,
faces as painted 0.05, the cloth's side light 0.07, covers 0.02, windows 0.035); the noon crossing passes the cloth's side
through nothing and the two side faces meet; the sun fades over ≥ 4 minutes from a fifth of its light to none at all
three places; cloud shadows present under a broken sky (three bands, `source-atop`, moved by a minute's scrub without a
key change, the near band faster), none clear or under a closed deck. Updated: `drawnSkyline.test.ts` (a sun behind the
line keeps at most its disc's share, none wholly behind), `c9.test.ts` (glare by the disc's share), `wear.test.ts` (the
side where the side light is plain), `model.test.ts` (cloud shadows come and go with the weather).

*Pixel references* re-recorded deliberately, 51 of 66 (every case with direct light, a cloud layer read between hours, a
back-lit line or a cloud shadow). The 15 within tolerance and kept: `shadmot-mehola-1630`, `-2100`, `jerusalem-2100`,
`-2100-clear`, `rosh-pina-1630`, `-2100`, `ramon-crater-2100`, `tiberias-1630`, `ein-gedi-2100`, `ein-gedi-2100-loading`,
`tiberias-1200-rain-loading`, `wear-rain`, `wear-dusk`, `wear-night`, `wear-rain@2x`. 66/66 on both paint paths.

*Perf* (`npm run test:perf`, CPU ×4, against `ace906a` in the same container): scrub.model p95 Haifa 34.7 / 32.9 → 29.4 /
28.3, Tel Aviv 31.8 / 29.0 → 26.2 / 26.0, Shadmot 25.0 / 30.2 → 24.4 / 27.3 ms: within the noise. The animated frame
within its 4 ms at p50, p95 3.5–6.0 (before 4.6–6.3). A scrub frame repaints only light canvases (and a cloud shadow
tile when the cover steps a sixteenth); the cloud shadows cost three blits.

*Stills* (`qa/canvas/light/before/` = `ace906a`, `after/`; `e2e/light.strip.mjs`): `sunset-{jerusalem,haifa,tiberias}.png`
(houses close up, every 5 min, clear), `noon-jerusalem.png` (11:05–11:49 every 4 min: before, the lit faces drop at 11:21
and come back on the other side at 11:29), `broken-jerusalem.png` (10:00–10:21 every 3 min, the cloud shadows passing),
`wear-sunset.png` (15:40–16:29 every 7 min) and `wear-noon.png` (10:40–12:25 every 15 min: before, the cloth's shade
flips sides with a flat gap at 11:25).

*Remaining* (for the owner's eye): the cloud shadows are subtle on the dark land of this hand and only clear on the
town; the sky's cloud banks do not move with a scrub (their shadows do); the clothes' neighbour shadow needs the light
nearly along the line, so it is rare in a south-facing view.

**Flight over the land (2026-11-20): where birds and planes fly makes physical sense.** Commits on `ccr-flight-terrain`
(from `ace906a`). The owner's report: "pay attention to where they fly, so that they don't suddenly fly into the mountain,
for example." Each event used to follow a straight path at one height over the eye, and only the drawn land decided what
hid it: a near flock could cross the land and vanish "into" a hill, and a path could run through ground higher than
itself (at the base places in one day of the fixture: 0–225 flock-minutes inside the ground per place, up to 7 flocks
vanishing into the land in mid-frame). **Rule: every path lives in 3D over the real ground, and an object is hidden only
by land truly between it and the eye.** General rules, no place named:
- *The ground* (`world/flightTerrain.ts`): one height field per land, built once from what the scene already holds: the
  panorama's rays (the DEM along every bearing in view, out to 60 km, every 100 m near and 1 km far; a polar grid) and the
  local grid round the place (every direction, 250 m, ~6 km). It answers the ground at a point (m above sea level), and
  whether the ground stands in the line of sight from the eye to a point in the air (`blockedKm`: the Earth's curve and the
  refraction the panorama measures its ridges with, so a crossing behind a ridge happens where the ridge is drawn). Where
  the land is not known, flat ground at the place.
- *Birds* (`world/flightPaths.ts`): each kind keeps its height over the ground (`FLIGHT`): storks and raptors 200–1500 m
  (thermals), cranes 300–1500 m, swifts 50–500 m, gulls 10–150 m, crows and pigeons 10–80 m, bats 5–60 m. A flock's track
  is walked out from its closest point both ways (its way ahead, and back into its past), every `endM`/48 (10–250 m):
  - it looks ahead along its heading (a migrant 4–8 km, by its climb rate; a resident up to 3 km) and climbs as a rise
    comes in sight, at its kind's rate (cranes 1:10, storks 1:5, the small birds 1:4–1:3), with a little to spare;
  - where the rise asks more than it can climb by then, it turns: of seven headings round its own (±15°, ±30°, ±45°) the
    one that needs the least climbing, within 70° of its way, or to 120° along a wall while it still draws away from the
    eye (so every session still ends far off, faded);
  - a migrant aims, every few steps, at the lowest ground across its way at its look's distance (the pass, the valley's
    floor; a little more each km aside), so it leans through corridors while holding the flyway's direction: a cheap rule,
    no pathfinding;
  - residents stay home: gulls are turned back toward their water (the nearest sea or lake, its bearing now kept in
    `PlaceEnv`); crows, pigeons and raptors work the place itself (their session ends within a kilometre or two of it).
  The altitude along the finished track is then laid once: the kind's height over the ground smoothed over ±600 m, never
  under its least clearance × 1.15 + 3 m over the most of the ground at the point and at the quarters of the stretches to
  its neighbours, climbing ahead of a rise at most at its climb rate and sinking after it at most at its sink rate. The
  flock is evaluated along the track by arc length (`flockAt`, `trackPoint`): its heading is the track's there.
- *Reading clearly* (`lifeSchedule.ts` `unclear`): the schedule draws a flock's height in its kind's band, and raises it
  (up to three times, its way kept) while that reads more clearly against the land as drawn: it counts the samples of the
  track in the frame and not faded that are drawn over the land while the ground truly hides them, hidden inside land the
  scene draws behind them (they would seem to fly into a slope), drawn under land that is nearer, or skimming the drawn
  land's edge (within 0.3°, a third each), and a flock hidden at its closest. The lowest count wins. (The old `floorAlt`
  rule, which raised the closest point over the drawn land, is gone.)
- *Planes*: cruise stays at FL340, above everything. Airport traffic (`approachPath`, `departurePath`):
  - an arrival flies its last 15 km (a light plane 5 km) down the 3° glide path on the extended centreline to the
    threshold; before that the first of the straight-in, a base leg (either side) or a downwind leg (either side) whose 3°
    descent clears the ground by 300 m; with none, the one that clears it most, held level over the ground ahead;
  - a departure climbs out along the runway heading at ~5° (light ~3°) for 6 km (3 km), then turns at a rate-one turn
    toward its route (one of six ways by its seed): the first route nearest that way that clears the ground by 300 m after
    the turn and keeps 8 km from the eye (a jet turning back close past the eye sweeps across its sky faster than a
    minute's step can follow), else of the clear routes the farthest from the eye, else the clearest;
  - paths are kept per land for every day (`ROUTES`); heights are over the eye; the near-field fade spans 45 % of a path
    (was 25 %), so a turned departure fades out over its last minutes rather than its last two.
- *Depth on screen* (`scene/model/life.ts` `placedInDepth`): each flock and movement carries `blockedKm` from the world
  (the ground truly in its line of sight). Truly blocked: it is laid on the sky surface only, so the land drawn over it
  hides it, and it passes behind the ridge's silhouette and comes back out on the other side when its line of sight
  clears. Not blocked and nearer than the land drawn at its x (`inFrontOf`): a copy in front of that land, as before. Not
  blocked but farther than the land drawn there (the place's rows and towers, the outside view's ground): hidden by that
  nearer drawn land; the schedule's `unclear` steers flocks away from this. Flocks and low planes use the terrestrial
  direction (`airDirection`: the curve and the panorama's refraction, without the sky's astronomical refraction), the
  same footing the ridges are drawn on.
- *Continuity* is kept: a flock's session still begins and ends far off (`fade` by ground distance), the schedule is
  seeded per place and day, the rates ramp, and paths are built once per place, day and inputs.

*Tests*:
- `scene/model/flight.test.ts` (12: the 8 base places and the 4 `DATUM_PLACES`, every minute of 2026-11-17 through one
  world builder):
  - every flock under way keeps its kind's least clearance over the ground under it;
  - a flock nearer than the land drawn at its x, with no ground in its line of sight, is never hidden;
  - whatever is hidden (a flock or an airport movement) is hidden by land nearer than it: the ground in its line of sight
    (checked on the panorama's own profiles, apart from the world's sight lines, within 5 m) or land drawn nearer than it;
  - airport traffic clears the ground: by 300 m (−50 for the sampling) before an arrival's final, and on the final or
    the climb-out by its glide's share (≥ min(300, 0.4 × its height over the field) − 10 m).
- `world/flightPaths.test.ts` (5) on made-up ground: a crane climbs ahead of a 600 m ridge it can clear, at most 1:10,
  never under 300 m over the ground, and crosses it; a gull meeting a 450 m cliff turns along its foot instead of
  climbing it; a stork leans through a 300 m pass in a 900 m ridge; an arrival keeps the 3° final on the centreline and
  takes a base or downwind leg round a hill on the straight-in (the straight-in on flat ground); a departure climbs out
  along the runway and turns, round a massif, to a route that clears it.
- Updated by their rules, unchanged in their checks: `continuity.test.ts`, `c10.test.ts`, `lifeSchedule.test.ts`.

*Pixel references* re-recorded deliberately, 11 of 66, each only where a flock or a plane now flies elsewhere (the diffs
are the life objects alone): `ein-gedi-1630@2x`, `jerusalem-1200`, `jerusalem-1200-dust`, `jerusalem-1200-offline`,
`jerusalem-1200-overcast`, `shadmot-mehola-1200`, `tel-aviv-1200`, `tel-aviv-1200@2x`, `tiberias-1200`,
`tiberias-1200-overcast`, `tiberias-1200@2x`. 66/66 on both paint paths.

*Perf* (`npm run test:perf`, two runs each, against `ace906a` in the same container; `qa/canvas/perf.md`): scrub.model,
scrub.world and the animated frame are within the run-to-run noise (this container's noise is large: the gated steps were
over budget before the change too). worldCold grows a little, by the flocks' tracks, their reading and the airport
routes: Haifa 875–1000 → 1020–1225 ms, Tel Aviv 764–1140 → 778–942, Shadmot 508–535 → 579–688 at CPU ×4. In node,
unthrottled, a warm cold build is +0–20 ms (the height field ~5–20 ms once per land; a flock's way ~0.2–0.7 ms, laid once
and only its altitude laid again for a raise; the routes kept per land for every day). Per minute only the evaluation
runs: a point along a track and one sight line per object.

*Stills* (`qa/canvas/flight/`, each before (`ace906a`) and after; `e2e/flight.strip.mjs` scrubs a harness page through
the app's own `__scene.scrub`):
- `strip-rosh-pina-{before,after}.png`: 07:30–08:03 every 3 min. Before, a crow flies into the mountain at 07:42 and comes
  out of it at 08:00 (it was up to 270 m inside the ground); after, it crosses over the ridge in plain view.
- `strip-tiberias-{before,after}.png`: 08:00–08:22 every 2 min. Before, crows sink into the hill behind the town; after,
  they stay over it and recede into the haze.
- `strip-ein-gedi-{before,after}.png`: 09:35–09:57 every 2 min. Before, gulls are drawn on the cliff face and vanish into
  it; after, nothing in this window is drawn on the cliff or flies into it (the hour's gulls keep 10–150 m over the
  ground they fly over, and their tracks turn along the cliff's foot).
- `strip-haifa-carmel-{before,after}.png`: 13:04–13:26 every 2 min. Before, gulls sink into the Carmel; after, they keep
  over the town and the bay and fade into the distance.
- `strip-jerusalem-cranes-{before,after}.png`: 08:00–08:33 every 3 min, two crane flocks at their cruise over the hills.
- `strip-haifa-approach-{before,after}.png`: 12:20–12:31 every minute, a window on the Zevulun valley (×3). An arrival into
  Haifa on its 3° glide is behind the Carmel (the ground truly in its line of sight) and comes out over the valley.
- `strip-ben-gurion-approach-{before,after}.png`: Tel Aviv 09:00–09:22 every 2 min, a window ×3 on the south-east. The
  arrivals into Ben Gurion come up the 3° straight-in from the south-south-west (clear of the ground by 580 m and more) and
  are behind the city's own drawn towers for most of it, as before.

*Remaining* (for the owner's eye):
- The ground is known along the view's rays (60 km) and round the place (6 km); behind the view farther than that a path
  assumes the place's own ground (nothing there is in the frame).
- Buildings are not in the DEM: a crow or pigeon keeps 10–80 m over the ground, not over the roofs, and the land drawn
  nearer than an object (the place's rows and towers) hides it without a sight line of its own.
- The coastal plain gives Ben Gurion straight-in approaches on every runway; the base and downwind legs show where high
  ground stands on a centreline (the tests' made-up hill), not at the base places on this fixture's day.

**Living land (2026-11-21): the land's colour and greenness from observed data; stages 1–4 of 6.** Commits on
`land-living` (from `origin/main`). Brief: `docs/design/LAND-LIVING-BRIEF.md`; review log, handoffs and gates:
`docs/design/qa/canvas/land/REVIEW.md` (writer Antigravity, reviewer Codex, gated by Claude Code). Stages 5 (wind on land)
and 6 (stills) are added below as they close.

*The pipeline* (data → one world state → model → painters; every value carries its source and date):
1. **Data** (`src/data/land/`, entry `landData.ts`, hook `useLand.ts`; never blocks first paint: the scene draws on the
   fallback and refines when data lands).
   - *Near (±5 km):* the newest clear Sentinel-2 L2A scene from Earth Search STAC (`satellite.ts`, `cogReader.ts`,
     `nearGrid.ts`, `s2Aggregate.ts`, `s2Math.ts`). True colour (TCI, 0..255 ↔ reflectance 0..0.25, checked on the
     recorded fixture), NDVI = (B08−B04)/(B08+B04) on reflectance, snow from SCL 11 and NDSI (B03/B11). Only SCL
     {4,5,6,7,11} are valid. Earth Search's COGs are already harmonised (`earthsearch:boa_offset_applied`), so the
     `raster:bands` offset of −0.1 is not applied again (checked live: sea ≈ 1–21 DN, land ≈ 700 DN in B04). L2A is
     terrain-corrected by Sen2Cor, so no de-lighting is applied on top.
   - *Far (the panorama, tens of km):* NASA GIBS MODIS Terra 8-day NDVI (palette PNG, validated) and surface reflectance
     bands 1-4-3 (JPEG) (`gibs.ts`, `gibsDecode.ts`, `gibsPalette.ts`), CORS `*`, cross-calibrated against the near
     scene where they overlap.
   - *Recent weather:* past rain and soil moisture through the Worker's new narrow `/v1/land-weather` route
     (`recentWeather.ts`), off behind `ASK_LAND_WEATHER = false` until deployed (deploy item 7 above).
   - *Cover:* ESA WorldCover classes (`worldCoverCog.ts`, `worldCoverGrid.ts`, `fineCover.ts`); a coarse overview
     `public/data/land/il/coarse.json` (`scripts/land/buildCoarse.ts`) covers every footprint.
   - *Fallback:* climatology by Köppen–Geiger class (0.5° table generated from Beck et al. 2018 by
     `scripts/land/buildKoppen.ts`, checksum pinned), month and cover class (`climatology.ts`).
   - *Cache:* IndexedDB `shamayim-land-v1` (`landCache.ts`): near 5 d, far 3 d, weather 6 h (stale cap 24 h), cover 30 d
     (a partial mosaic 1 h); nothing older than 30 d is served.
   - *Tests* never touch the network: recorded fixtures `src/test/fixtures/land-*.json` (`scripts/land/recordFixtures.ts`
     records them).
2. **World** (`src/world/landLiving.ts` → `WorldState.land`, key `keys.land`; rebuilt only when the date or the data
   change, never on the hour). Sampled along the view's rays (`landRays.ts`) and over the place's own ground
   (`landSample.ts`): cover class, light-free albedo (`landReflectance.ts`, `landRadiometry.ts`), NDVI, dryness, snow,
   each with source and date. An old observation blends toward climatology by its age (`landAgeBlend.ts`,
   w = exp(−age/τ), τ albedo 30 d, NDVI 25 d, dryness 10 d, snow 5 d; heuristic timescales, causal: only observations
   on or before the shown date). Never from place names.
3. **Colour** (`src/scene/model/landColour.ts`, `landPalette.ts`, `landSnow.ts`, `landVeil.ts`; painter
   `src/scene/paint/landSurface.ts`). Each land plane (back, far, near) gets a small deterministic Oklab-quantised
   palette (farthest-point + Lloyd, no randomness) of the albedo sampled by distance along each ray column, with soft
   transitions between distance bands. Open water (WorldCover 80) is excluded. The palette is part of the form layer;
   the existing light, cloud shadows, aerial perspective and haze act on it unchanged, so scrubbing the hour repaints
   only `plane.*:light` (checked in `npm run test:perf`). Model descriptions stay compact and structured-cloneable.

4. **Vegetation** (model `src/scene/model/landVegetation.ts`, `vegRules.ts`, `vegSample.ts`, `vegBuilders.ts`,
   `vegAgriBuilders.ts`, `vegOrchard.ts`, `vegCropEvidence.ts`; painters `src/scene/paint/landVegetation.ts`,
   `landVegCrowns.ts`). Driven only by data per cell (WorldCover class, NDVI, dryness, season, slope magnitude), with a
   per-cell seeded rng: woodland as clustered groves of rounded crowns, scrub and grass tufts whose density follows NDVI
   (straw-gold when dry), cropland fields whose state (green, ploughed, stubble) follows NDVI and season, bare/desert
   ground left bare. Orchard and palm rows appear only inside mapped crop polygons (OSM-derived, `israelData.ts`),
   each footprint clipped exactly against its polygon (holes included); suitability or greenness alone never makes a
   plantation, and background vegetation is decided independently of crop discovery. Crop probes are culled to the
   plane's projected view sectors (output identical, checked by descriptor hashes). Detail drops out by distance before
   it aliases (a resolvability cut in metres per pixel). Vegetation is form (date and data, not the hour); its sunlit
   catchlights are on the light layer and share the crowns' geometry. Each tree carries a seeded phase and height for
   wind. Descriptors stay under 10 KB, compact and structured-cloneable.

*Checks at the stage 3 gate* (`9c13156`): `npx tsc -b` pass; vitest 142 files / 1307 tests; build; pixels 66/66 (the
references re-recorded for intended changes are listed per stage in REVIEW.md). Stills:
`docs/design/qa/canvas/land/stage3/` (before/after, winter and late summer).
*Checks at the stage 4 gate* (`2ae4925`): `npx tsc -b` pass; vitest 151 files / 1339 tests; build; pixels 66/66. Stills:
`docs/design/qa/canvas/land/stage4/` (8 places × winter, spring, summer).
