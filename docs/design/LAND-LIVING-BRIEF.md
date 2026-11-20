# Living land: brief (2026-11-20)

The land in the valley scene becomes "living": its colour, greenness and vegetation come from real observed data about
what is on the ground this week, not from guesses or a fixed tone. Branch `land-living` (from `origin/main`), PR to
`main` at the end. Reports to the owner may be in Hebrew; code, commits and docs in English.

## Workflow: writer and reviewer
- **Writer: Antigravity.** Implements the stages below in small, reviewable commits on `land-living`. After each stage
  it pushes, then writes a short handoff note under that stage in `docs/design/qa/canvas/land/REVIEW.md`: what
  changed, which files, how it was tested, open questions.
- **Reviewer: Codex.** After each stage it reviews the diff against this brief and the repo rules. It checks
  correctness; rule breaks (point fixes, a clock in painters, `ctx.filter`, live network calls in tests); performance;
  missing tests. It adds findings under that stage in `REVIEW.md`, each with `file:line` and severity
  (blocker / major / minor / nit), and does not edit code. The writer fixes each finding or answers it before moving on.
- **Orchestrator: Claude Code** runs both, runs the checks, and gates each stage.
- **Stages, each reviewed before the next:** 1 data layer · 2 world state · 3 land colour painting · 4 vegetation ·
  5 wind on land · 6 stills and docs. A stage is done when the reviewer marks it "approved" in `REVIEW.md` and all
  checks pass.

## Read first
- `docs/design/CANVAS-SCENE-PLAN.md`: architecture, rules, §6 status. World state in `src/world/`; pure scene model in
  `src/scene/model/`; painters in `src/scene/paint/` (signature `(ctx, desc, env)`, helpers in `core.ts`); compositor
  and paint worker in `src/scene/compose/` (form split from light: scrubbing repaints only the light). Light is
  continuous (`src/world/livingLight.ts`); cloud shadows already move over the land. Birds and planes follow the terrain
  (`src/world/flightTerrain.ts`).
- `docs/design/TRUE-SCENE-PLAN.md`, "After (agreed order)": land colour by season / this week → vegetation from
  WorldCover → rain direction (done) → wind (partly done).
- **Drawing contract:** pure in time and phase; seeded rng; no clock; no `ctx.filter`; painters safe in a Worker on
  OffscreenCanvas; model descriptions structured-cloneable; drawn in the scene's own illustrated hand ("the current
  hand, enriched"), not a photo.
- **Owner rules:** true to nature, automatic from data; one world state drives everything (light, season, weather,
  wind); no point fixes for particular places, mountains or settlements, only general algorithms.
- **Repo rules (owner's global):** files small and modular, ideally under 150 lines; DRY; remove dead code and imports
  when replacing something; meaningful names; keep `TASKS.md` current (a "Living land" section) at every stage; clear
  English commit messages.

## What exists already (reuse it, don't start over)
- `src/data/land/satellite.ts`: newest clear Sentinel-2 L2A scene from Earth Search STAC (cloud < 20 %, last 45 days),
  ±5 km true-colour window at 20 m averaged into a 100 m grid (`LandColour`, `colourAt`).
- `src/data/land/landPaint.ts`: the SVG-era painter (tint from that colour + cover classes; `BASE`, `coverMeans`).
- **That pipeline is unused by the canvas scene.** `App.tsx` only calls `useLandCover`. Find what still references it
  (`useLand.ts`, `land.test.ts`, the dev harness), then revive it into the canvas world or replace it, deleting what dies.
- WorldCover per place (`useLandCover`, `COVER` in `src/data/land/grid.ts`) is used for built cells, trees, water
  (`public/data/land/water.json`).
- EUMETSAT cloud mask corrects "now" (`src/data/overhead/`, `src/domain/observedCloud.ts`).
- Forecast via the Cloudflare Worker (`worker/src/routes.ts`), proxying Open-Meteo with a field allowlist. New fields
  need a Worker deploy by the owner (not by us).

## Goal: a data-based picture of the land, as a pipeline
1. **Data layer** (`src/data/land/`): gather, cache, fall back, always marking the source.
   - Near (≈5 km window): Sentinel-2 L2A. Keep true colour; add NDVI from B04/B08 (COGs on the same STAC items);
     optionally NDSI snow from B03/B11; newest clear scene, masked by SCL (cloud, shadow, nodata out).
   - Far (panorama land, tens of km): a coarser source — NASA GIBS MODIS/VIIRS NDVI + true colour, or the Sentinel-2
     mean per cover class extended outward. Check licence, CORS, availability; use the Worker cache if needed.
   - Recent weather: past precipitation for the last 14–60 days and soil moisture from Open-Meteo (`past_days`,
     `soil_moisture_*`), behind the Worker allowlist gate (a flag like `ASK_SCENE_HOURLY`, off until deployed).
   - Fallbacks: climatology by region, month and cover class, recorded in the source flag. WorldCover always gives
     the class.
   - Caching per place with a sensible TTL. Never block first paint: draw with the fallback, then refine.
2. **World state** (`src/world/`, e.g. `landLiving.ts`; note `src/world/land.ts` already exists for land *form*): one
   `land` state per place for the date shown, sampled by distance along the panorama's rays and over the place's own
   ground: cover class, observed albedo (de-lit), NDVI, dryness, snow, source + date. From data, never place names.
   When the observation is old, blend toward climatology.
3. **Model and painters:** paint the land planes with that albedo, then the existing light, aerial perspective and haze.
   An illustration: quantised tones, gentle patches. Vegetation: pine-forest texture; orchard and plantation rows; a
   field patchwork green / ploughed brown / straw by NDVI; scrub; bare and desert tones; all fading with distance.
   Wind on land: trees lean and sway in gusts with the camera-aware wind sign the scene already uses; dust lifts on dry,
   bare, windy days. Keep the form/light split.

## Precision (owner's standing request)
"Pay attention to subtleties and physical accuracy." Real units and provenance for every number: reflectance scale and
offset of the L2A bands (processing baseline ≥ 04.00 adds a −1000 DN offset), SCL class codes, NDVI = (B08−B04)/(B08+B04)
on reflectance, de-lighting by the scene's sun geometry where claimed, distances along rays in metres. Wind sign must
match the existing `Wind.across` / `lateral` convention (a westerly moves right → left in the true, un-mirrored view).
State every approximation in a comment; no hand-waved constants without their source.

## Checks
- Unit tests for: NDVI computation; fallback chain and source flags; climatology blending by age; land comes from data
  only, never from place names; cover-to-vegetation rules; wind-lean sign.
- Run `npx tsc -b`, `npx vitest run --maxWorkers=2`, `npm run test:pixels`, `npm run test:perf` (no noticeable
  regression), `npm run build`.
- Never call Open-Meteo or satellite services live from tests or runners. Use fixtures and route interception like
  the existing runners (`src/test/fixtures/forecast-*.json`); add small recorded satellite fixtures (a recording script
  may hit the network; tests never do).
- Re-record pixel references only for intended changes (`npm run test:pixels -- --update --only=<name>`) and list each.
- Before/after stills in `docs/design/qa/canvas/land/`: Galilee, coast, Jezreel and Jordan valleys, Jerusalem, Negev,
  Dead Sea; each in winter, late spring, late summer; plus one windy day.

## Deploys for the owner
Do not deploy anything. Append anything that needs a Worker or allowlist change to "Deploys pending for the owner" in
`docs/design/CANVAS-SCENE-PLAN.md`, with exact commands and a curl check.

## Done when
Real colour and greenness per place, with vegetation and wind; every source cached with a fallback and a source flag;
all checks pass; every stage "approved" in `REVIEW.md`; §6 of the plan documents the pipeline; branch pushed with a PR.
