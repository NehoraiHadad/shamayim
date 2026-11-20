# Living land: review log

Brief: `docs/design/LAND-LIVING-BRIEF.md`. Writer: Antigravity. Reviewer: Codex. One section per stage.
Writer adds a **Handoff** (what changed, files, how tested, open questions). Reviewer adds **Findings**
(`file:line` · severity blocker/major/minor/nit · what and why) and a **Verdict**: `approved` or `changes requested`.
The writer answers each finding under **Answers** (fixed in `<sha>` / declined because …).

## Stage 1: data layer

### Handoff (Antigravity, 2026-11-20)

**Commits:** `c28d152`, `df166ba`, `31c03d9`, `4420f11`, `a62ad68` on `land-living`.

**What changed:**
- **Near-field Sentinel-2 L2A (`src/data/land/types.ts`, `s2Math.ts`, `satellite.ts`):**
  - Extends Earth Search STAC + AWS COG reader to read `visual` (true colour), `red` (B04) + `nir` (B08) for NDVI, `green` (B03) + `swir16` (B11) for optional NDSI, and `scl` from the same STAC item.
  - Dynamically selects the coarsest COG overview `<= STEP_M / 2` (50 m), picking the aligned 40 m overview (2745×2745) across both 10 m bands (`visual`, `red`, `nir`, `green`, IFD 2) and 20 m bands (`swir16`, `scl`, IFD 1) so ±5 km reads ~250×250 pixels per band. Supports northern and southern UTM zones (`32601–32660` / `32701–32760`).
  - Masks SCL to valid ground `{4 vegetation, 5 bare, 6 water, 7 unclassified, 11 snow}`, excluding `{0 nodata, 1 saturated, 2 dark/cast shadow, 3 cloud shadow, 8/9 clouds, 10 cirrus}`.
  - Applies L2A reflectance scaling (`scale = 1/10000`) and `BOA_ADD_OFFSET` (`-1000` DN / `-0.1` reflectance for PB ≥ 04.00): reads `raster:bands[0]` (`scale`, `offset`, `nodata`) first, falling back to `s2:boa_add_offset`, `earthsearch:boa_offset_applied`, or `s2:processing_baseline >= 4.0`. Clamps negative reflectance to 0 and rejects nodata (`DN = 0`).
  - Each 100 m cell carries `rgb`, `ndvi`, `ndsi`, `valid` fraction (`0..1`), and `source: 's2:<date>'`, plus item `sunElevation`/`sunAzimuth` for Stage 2 de-lighting.
  - Removed dead SVG-era `src/data/land/landPaint.ts`.
- **Far-field NASA GIBS evaluation & reader (`src/data/land/gibsDecode.ts`, `gibs.ts`):**
  - **Licence:** NASA EOSDIS / GIBS open data (public domain, free for commercial and non-commercial use with attribution "NASA GIBS / EOSDIS").
  - **CORS & latency (probed live 2026-11-20 with `Origin: https://shamayim.nehoraihadad.com`):**
    - `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/2026-11-18/GoogleMapsCompatible_Level9/8/103/153.png` → **200**, `456–580 ms`, `Access-Control-Allow-Origin: *`, `image/png` (51 KB, 256×256 colorType=3 indexed palette, rolling 8-day composite updated daily `P1D`, lag 1–2 d). Verified 143/143 exact `PLTE` match against `https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_NDVI.xml`. Decoded purely with `DecompressionStream` (zero canvas, no anti-fingerprinting noise).
    - `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L3_SurfaceReflectance_Bands143_8Day/default/2026-11-01/GoogleMapsCompatible_Level8/8/103/153.jpeg` → **200**, `368–451 ms`, `Access-Control-Allow-Origin: *`, `image/jpeg` (18 KB, 8-day cloud-cleared true-colour surface reflectance composite, DOY cadence `1 + 8k`, lag 10–19 d; note `.jpeg` extension, `.jpg` 404s). Decoded via `createImageBitmap` + `OffscreenCanvas` in browsers and skipped cleanly where unavailable.
    - Also tested: `MODIS_Terra_L3_NDVI_16Day` (`200`, `545 ms`, `ACAO: *`, `P16D`), `MODIS_Terra_CorrectedReflectance_TrueColor` (`200`, `351–485 ms`, `ACAO: *`, daily single-pass so vulnerable to cloud), `VIIRS_SNPP_NDVI_8Day` (`400` at Level9; Level8 in capabilities).
  - **Implemented:** `fetchFarLand` fetches `MODIS_Terra_NDVI_8Day` (zoom 8 ≈ 520 m/px) + optional `MODIS_Terra_L3_SurfaceReflectance_Bands143_8Day` into a ±60 km grid (2 km step, 60×60) tagged `gibs:<date>`. When GIBS RGB or GIBS entirely is unavailable, `sampleLandAt` falls back to per-cover-class Sentinel-2 means (`s2-mean:<date>`) and then `climatology`.
- **Recent weather behind Worker allowlist gate (`worker/src/routes.ts`, `worker/test/validate.test.ts`, `src/data/land/recentWeather.ts`, `src/data/openMeteo/workerContract.test.ts`, `docs/design/CANVAS-SCENE-PLAN.md`):**
  - Raised `past_days` max on `/v1/forecast` from `1` to `60` and added `soil_moisture_0_to_1cm`, `soil_moisture_1_to_3cm`, `soil_moisture_3_to_9cm`, `soil_moisture_9_to_27cm` to `CURRENT` (~2.1 KB response vs ~82 KB for 60 days of hourly soil moisture).
  - App request gated behind `ASK_LAND_WEATHER = false` (`src/data/land/recentWeather.ts`); Worker contract test verifies the query passes `canonicalQuery(ROUTES['/v1/forecast'], ...)`.
  - Appended deploy item 7 with `wrangler deploy` and `curl` check to "Deploys pending for the owner" in `docs/design/CANVAS-SCENE-PLAN.md`.
- **Climatology, caching, unified sampler & hook (`climatology.ts`, `landPack.ts`, `landCache.ts`, `sampleLand.ts`, `useLand.ts`):**
  - Pure physics climatology from `(lat, lon, elevationM, month, cover)` (Peixoto & Oort 1992 temperature proxy, ISA −6.5 °C/km lapse, Köppen–Geiger subtropical/Mediterranean/temperate/tropical/alpine belts, MODIS MCD43A3/MOD13Q1 cover albedos & NDVI, hemisphere-inverted seasons); zero place names.
  - IndexedDB TTL cache (`shamayim-land-v1`, binary TypedArrays quantized to ~60 KB per near grid via `landPack.ts`) with in-memory fallback, fresh TTLs (`5 d` near, `3 d` far, `6 h` weather), stale-while-revalidate up to `30 d` (`MAX_STALE_MS`), and eviction beyond `30 d`.
  - `sampleLandAt` resolves the full fallback chain (`s2:<date>` → `gibs:<date>` → `s2-mean:<date>` → `climatology`; `open-meteo:<date>` → `climatology`) with source flags on every value.
  - `useLand` never blocks first paint; `useLandCover` preserved unchanged for `App.tsx`.
- **Fixtures & offline tests (`scripts/land/recordFixtures.ts`, `src/test/fixtures/land-*.json`, `src/data/land/*.test.ts`):**
  - Recorded small live fixtures (`land-s2-shadmot.json` 12.7 KB, `land-gibs-ndvi.json` 3.6 KB, `land-weather-shadmot.json` 3.3 KB); all unit tests run 100% offline with mocked fetch/TIFF.
  - Updated `TASKS.md` ("Living land" section).

**Files:**
- Added: `src/data/land/{types,s2Math,gibsDecode,gibs,recentWeather,climatology,landPack,landCache,sampleLand}.ts`, `src/data/land/{s2Math,gibs,recentWeather,climatology,landCache,sampleLand}.test.ts`, `scripts/land/recordFixtures.ts`, `src/test/fixtures/land-{s2-shadmot,gibs-ndvi,weather-shadmot}.json`.
- Modified: `src/data/land/{satellite,useLand,land.test}.ts`, `worker/src/routes.ts`, `worker/test/validate.test.ts`, `src/data/openMeteo/workerContract.test.ts`, `docs/design/CANVAS-SCENE-PLAN.md`, `TASKS.md`.
- Deleted: `src/data/land/landPaint.ts`.

**How tested (exact results):**
- `npx tsc -b`: **PASS** (0 errors).
- `npm run lint`: **PASS** (0 errors; 0 warnings in any touched/added file; only 11 pre-existing warnings in `docs/design/prototypes/` and `scripts/city/geometry.ts`).
- `npm run build`: **PASS** (`tsc -b && vite build`, 419 modules transformed).
- `cd worker && npm run typecheck && npm test`: **PASS** — 6/6 test files, **51/51 tests passed** (672 ms).
- `npx vitest run src/data/land src/data/openMeteo/workerContract.test.ts`: **PASS** — 17/17 test files, **88/88 tests passed** (1.42 s).
- `npx vitest run --maxWorkers=2`: **123/126 test files passed, 1242/1251 tests passed**; the 9 failures were all 5000 ms Vitest default timeouts (5106–7882 ms) in 3 untouched `src/scene/model/` test files (`loading.test.ts` 4, `weather.test.ts` 4, `c10fixes.test.ts` 1) under Windows CPU load. Re-running those exact 3 files (`npx vitest run src/scene/model/loading.test.ts src/scene/model/weather.test.ts src/scene/model/c10fixes.test.ts --maxWorkers=1 --testTimeout=15000`): **PASS** — **3/3 test files, 95/95 tests passed** (0 regressions across all 1,251 root + 51 worker tests).

**Open questions for Stage 2:**
- `sampleLandAt` currently treats `MIN_CELL_VALID = 0.2` as the cutoff for using a near S2 cell vs falling back; Stage 2 (`world/landLiving.ts`) will handle blending older observations toward climatology by age (`grid.date` vs shown date) and de-lighting S2 RGB using `sunElevation`/`sunAzimuth`.
- `satellite.ts` is 152 lines (2 lines over the 150-line target); happy to extract `selectOverview` if reviewer prefers strict ≤ 150 lines.

## Stage 2: world state

## Stage 3: land colour painting

## Stage 4: vegetation

## Stage 5: wind on land

## Stage 6: stills and docs
