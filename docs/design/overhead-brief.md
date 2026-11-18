# Brief: "מבט מלמעלה" — the view-from-above page (radar + satellite clouds)

Shamayim is a Hebrew RTL weather PWA (Vite + React 19 + TS, phone-first 375 px). Read `docs/design/SPEC.md`,
`docs/design/ILLUSTRATION.md`, `src/App.tsx`, `src/ui/PlacePicker.tsx` (+ `.module.css`, an existing full-height paper
page: copy its open/close, focus and inert handling), `src/ui/scrub/` and `src/ui/scene/ValleyScene.tsx` (the time
scrub), `src/ui/tokens.css`, `src/index.css`, `src/ui/Attribution.tsx`.

## Data (done — use it, don't rewrite)
`src/data/overhead/sources.ts`:
- RainViewer past radar: `RAINVIEWER_INDEX` → `parseRadarIndex(json)` → `{ host, frames: {time(ms UTC), path}[] }`
  (13 frames, 10 min apart, ~2 h). `radarTiles(index, frame)` = MapLibre raster tile template (512 px, scheme 2
  "Universal Blue", smoothed). **Max zoom 7** on the free tier (set `maxzoom: 7` on the source; MapLibre overzooms).
  No nowcast exists any more. CORS `*`.
- EUMETSAT WMS: `satelliteMapUrl(layer, '{bbox-epsg-3857}', 512, timeMs)` gives a MapLibre raster source URL.
  `CLOUD_MASK_LAYER` = `msg_fes:clm` (cloud white 255,255,255; clear land green 0,192,0; clear sea blue 0,0,255).
  `satelliteSlotFor(frameTimeMs, Date.now())` = the 15-min slot to show with a radar frame. ~20–35 min latency. CORS `*`.
- Basemap: OpenFreeMap vector style `https://tiles.openfreemap.org/styles/positron` with `maplibre-gl` (already
  installed, v5). **Lazy-load** maplibre (`import('maplibre-gl')` + its CSS) only when the page opens — it must not
  enter the main bundle.

## Design (from the design advisor, Fable — follow it)
- **Entry:** a 56 px row at the top of the sheet, above the wear card, shown only when rain is forecast within 3 h
  (any hour with precipitation ≥ 0.1 mm or precipProb ≥ 50 in `forecast.hours` from now to now+3 h). It reads like the
  sentence, e.g. "גשם בדרך — מבט מלמעלה" with a small chevron (‹ in RTL). On dry days the row is absent and a quiet text
  link "מבט מלמעלה" sits at the end of the sheet above the attribution. Pass both through one small component.
- **Page:** a full-height paper page (radius 28 like the picker) that rises once; closes with ✕, swipe down, Back
  (history entry), Escape. One view, two layers on one clock: clouds always on, rain on top. No layer toggle.
- **Basemap look:** belongs to the paper world, not a pasted Google map. Restyle the positron style at load time:
  paper-tinted land (use the sheet's `--sheet` colour), water a pale ink-blue, coastline/lakes/Jordan as ink hairlines,
  **no roads, no POIs, no buildings**, 6–8 town labels max, Hebrew names (`name:he`, fallback `name`), font from the
  style's glyphs (keep it legible), only city/town places.
- **Clouds:** never the provider's picture. Use MapLibre `addProtocol('shamayim-sat', …)` to fetch the clm tile and
  repaint it on a canvas: cloud pixels → chalk-white with alpha ~0.85, everything else transparent; draw it with a
  soft shadow (a second copy of the layer offset 2 px, dark, low opacity) so white reads on light paper. Day and night
  identical. On the dark sheet (`.dark-sheet` on `.app`) clouds are pale on navy.
- **Rain:** same protocol trick (`shamayim-radar`): decode the Universal Blue palette to intensity (its colours go
  from light blue → blue → yellow → red → pink with rising dBZ; use luminance/hue bands, test on a real rainy tile —
  if none today, synthesize one in a unit test) and repaint as a three-step wash: blue-grey → indigo → plum,
  multiply-like opacity. Legend: three swatches "קל · בינוני · חזק".
- **Marker:** the place as the scene's village dot, with dashed rings at 25 and 50 km.
- **Scale:** ~350 km across on open, centred on the place, slightly west of it (rain comes from the sea). One extra
  zoom step allowed; pan limited to Israel ± margin (bounds 29–34.5°N, 32–37.5°E).
- **Time:** a rail under the map like the valley scrub: horizontal drag through the radar frames (last ~2 h).
  Readout in the app's serif display, e.g. "לפני 20 דק׳" / "עכשיו". On open it plays through once (≈ 3 s) and rests on
  the latest frame. Release holds. Reduced motion: no play-through, latest frame only, with previous/next buttons.
  Preload each frame as its own raster layer at opacity 0 and switch opacity (no flicker).
- **Honesty:** always show the data age ("ענן: לפני 30 דק׳ · גשם: לפני 10 דק׳"); grey a layer whose newest data is
  > 45 min old. When there are no echoes, the legend says "אין גשם במכ״ם" — never "אין גשם" alone (radar misses light
  rain in the Jordan Valley). If a source fails, say so in one quiet line; the rest still works. Offline: "אין חיבור".
- **Attribution** (one line, comma style like `Attribution.tsx`): "מכ״ם: RainViewer, לוויין: © EUMETSAT 2026,
  מפה: © OpenMapTiles, © OpenStreetMap" with links. MapLibre's own attribution control off (we show it ourselves).

## Rules
- Files under ~150 lines each, DRY; put the page in `src/ui/overhead/` (e.g. `OverheadEntry.tsx`, `OverheadPage.tsx`,
  `OverheadMap.tsx`, `mapStyle.ts`, `recolor.ts`, `TimeRail.tsx`, CSS modules). Pure logic (`recolor.ts`,
  rain-within-3h, `mapStyle.ts` restyling, frame-age text) gets vitest tests (`*.test.ts`, node env — no DOM tests).
- Touch `src/App.tsx` minimally (mount the entry row + link + page). Do not touch `src/atmo/`, `src/ui/scene/`,
  `src/data/terrain/`, `worker/` (another session edits illustration files).
- Hebrew copy, RTL. Contrast ≥ 4.5 for text on both sheet themes. Visible focus, 44 px targets.
- Checks must pass: `npx tsc -b`, `npx vitest run`, `npm run -s lint`, `npx vite build` (check maplibre is a separate chunk).
- Do not commit; leave the work in the tree. End with a short report: files, what you could not verify.
