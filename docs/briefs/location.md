# Brief: any place, real terrain (v5-A)

Shamayim is a Hebrew RTL weather PWA (React 19, Vite 8, TS, vitest, oxlint). Today it is fixed to
Shadmot Mehola (`src/config/place.ts`, `SHADMOT_MEHOLA`) and its scene (`src/ui/scene/ValleyScene.tsx`)
draws a hand-made Jordan Valley cross-section (paths `FAR`, `NEAR`, sea-level line `SEA_Y`, labels
"פני הים" / "−175 מ׳", village dot). Make the app work for any place in Israel (and roughly anywhere),
keeping Shadmot Mehola the default and pixel-identical on first load.

## Goals
1. **Place model.** `Place` gains optional `elevation`. A `usePlace()` hook holds the current place,
   persisted in localStorage (guarded like `src/data/cache.ts`). Default `SHADMOT_MEHOLA`.
2. **Choose a place.** In `TopBar`, tapping the place name opens a small sheet:
   - "המיקום שלי" (geolocation; on deny/timeout show a plain Hebrew error, keep the old place),
   - a search field using Open-Meteo geocoding (`https://geocoding-api.open-meteo.com/v1/search?name=…&language=he&count=6`),
     results show name + admin1/country in Hebrew, debounce 300 ms, abort stale requests,
   - recent places (max 4). Keyboard and screen-reader friendly, RTL, 44 px targets.
   - Reverse naming for GPS: nearest geocoding result is fine; else "המיקום שלי" with coords.
   Region line: admin1/admin2 from geocoding (Shadmot Mehola keeps "בקעת הירדן").
3. **Real terrain.** New `src/data/terrain/`: sample 41 points along an east–west line through the
   place, ±12 km (west on the left, as on a map), from Open-Meteo elevation
   (`https://api.open-meteo.com/v1/elevation?latitude=…&longitude=…`, comma lists, max 100 per call).
   Also a second line ±30 km for the far layer. Pure `profileToPath(samples, w=375, h=128, …)` builds
   the SVG path with vertical exaggeration chosen so relief fills the band (min relief so a flat coast
   still reads; sea = flat water band, elevation ≤ 0 and within 1 km of coast is fine to treat as sea if
   samples are 0 and the geocoder says coastal — keep it simple, document the rule). Cache per place in
   localStorage (terrain never changes). While loading or on failure: generic gentle hills, never blank.
   For `shadmot-mehola` keep the existing hand-drawn `FAR`/`NEAR` paths (the art is tuned); the
   sampled profile is for every other place.
4. **Scene labels.** Sea-level line + "פני הים" only when the place is below 50 m or the sea is in
   view; the village dot sits at the centre sample's height; elevation label from the forecast
   elevation (`Forecast.elevation`) formatted like today ("−175 מ׳", "754 מ׳").
5. **Forecast per place.** `useForecast(place)` already takes a Place; make sure switching refetches,
   cache keys by `place.id` (geocoding id or `gps:lat,lon` rounded to 2 dp).

## Constraints
- Files ≤ 150 lines; DRY; no new runtime dependencies. Hebrew copy, feminine/neutral where the app does.
- Do not touch `src/atmo/**` (another lane is working there). Sun path stays driven by `lat`.
- `ValleyScene` keeps its props contract except new `terrain` input; layout `[data-scene]` stays.
- Tests: `profileToPath` (monotone x, bounds, flat input, Shadmot fallback), geocoding mapper,
  place persistence. All of: `npx tsc -b`, `npx oxlint`, `npx vitest run`, `npm run build` must pass.
- Commit in small English commits with clear messages.

## Done
Report: files changed, how the terrain rule works, what you could not verify (UI in a browser).
