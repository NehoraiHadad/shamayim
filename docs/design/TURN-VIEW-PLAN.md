# Turning view: the plan to "ship-quality" (2026-11-19)

Owner's bar: **100% quality, fast, and it brings value.** The view turns all the way round; the place stands on a stage
in front (option A2, `camera-fable.md`); the land, the sky and the weather are true to the place, the season and the
current state. This plan runs end to end without stopping for approval between phases; the owner gets stills and a
short report at the end of each phase and can redirect at any time. It only stops for the decisions listed in §6.

## 0. Where it stands (done)
- One camera (`domain/camera.ts`); a 360° world (`data/world/world.ts`, 288 rays); views are slices of it.
- Physics stays the place's own: visible sunrise/sunset, rim glow and sunlight on the land are judged against the land
  in the sun's direction (tests in `world.test.ts`); the default scene is byte-identical (six-place baseline).
- Prototype behind `?view=turn`: 120° view, true directions, stage from the built-up raster, compass, smooth turning.
- Measured problems: a drag frame costs 50–70 ms median, 300–550 ms p90 at 4× CPU throttle (the whole scene re-renders
  per move); the foreground is an empty flat tone; the stage is flat; nothing tells the user why to turn.

## 1. Rules for every phase
1. **Physics first.** Angles, sun and moon, sunrise/sunset times, shadows and light come from the world, never from the
   screen. Anything found wrong is fixed, with a test that pins the true behaviour.
2. **The default scene does not change** until phase 6 (the six-place baseline stays green; a deliberate change gets
   new stills and a re-recorded baseline in the same commit, stated in the message).
3. **Real data only.** Nothing invented to fill space: where the data says "nothing", draw nothing (bare ground).
   Seeded variation only *within* what the data says (which house in a built square, which tree in an orchard).
4. **Drawn in the app's style.** Flat tones, hard skyline, small marks; data decides where a tone goes and which tone.
5. **Each phase ends with:** tests green, typecheck, lint, build, stills for four headings at Shadmot, Jerusalem,
   Tel Aviv and Makhtesh Ramon, a perf run (§5), a commit and push, and a short report.

## 2. Phases

### Phase 1 — Real land: what grows where, and how it looks this week
Goal: the foreground and middle ground show the true land cover, in this week's colours.
- **Sources** (all open; attribution added to `Attribution`):
  - ESA WorldCover 10 m (2021, CC BY 4.0): tree cover, shrubland, grassland, cropland, built-up, bare, water, wetland.
    Its bucket has no CORS, so it is **pre-built** into our own data like the city raster: `scripts/land/` cuts
    Israel into 0.1° cells, 30 m class grid (majority of 3×3), run-length encoded, served from `public/data/land/il`
    (budget ≤ 4 MB total, ≤ 40 KB a cell). CI workflow like `landmarks.yml`, yearly.
  - Copernicus Sentinel-2 L2A (via the Earth Search STAC API, CORS open): the newest clear scene (cloud < 20 % over
    the place) of the last 30 days, read **in the browser** as a window of the true-colour COG (6 × 6 km at 20 m,
    ~300 × 300 px) with `geotiff`. Kept per place for 5 days; the last clear one stays when it is cloudy.
- **Model** (`data/land/`): `landAt(lat, lon) → { cover, colour }` where colour is this week's mean true colour of that
  class around the place (per class, per distance band), so a green winter field, a yellow summer one, a ploughed one
  and a snowy Hermon all come from the satellite. No per-pixel photo is drawn.
- **Drawing:**
  - Stage (≤ 400 m, pole view): ground patches per land cell projected from the pole (fields as flat tinted strips,
    orchards as rows of small tree glyphs, tree cover as clumps, water as a sheet with the sky's tint, bare ground as
    the land's own tone). Houses from the built-up raster stay.
  - Middle ground (0.4–5 km, backdrop): the near land's fill is tinted per column by the cover/colour along that ray
    (`seenAt` already knows which ground is visible); orchards and tree belts get a dotted texture at the distance.
  - Far ridges: only the colour (green after rain, brown in summer); snow from the satellite when it is fresher than the
    forecast's snow line.
- **Acceptance:** at Shadmot the date groves, the fields and the fish ponds sit where the satellite shows them;
  Makhtesh Ramon is bare rock in its real tones; a field is green in a winter scene and straw in a summer scene of the
  same place; nothing is drawn where the data has nothing.

### Phase 2 — Fast: the backdrop is drawn once, the turn only moves it
Goal: dragging the compass stays at frame rate on a mid phone.
- The backdrop (far ridges, near ridges, far city, plain patches, middle-ground land, ridge light) is rendered once as
  a **360° strip** (1125 px at 120° per 375) in sectors of 120°; only the sectors in view are mounted; turning sets one
  `translateX` (with wrap-around). Rebuilt only when the minute, weather or light changes, not when the heading does.
- Sun, moon, clouds and glows are positioned by the camera every frame (cheap: a handful of nodes).
- The stage is re-projected per frame with plain boxes while the finger is down; full glyphs, labels, mark fitting and
  shadows are rebuilt in a **settle pass** 150 ms after the turn stops.
- Heavy work is memoised by heading-independent keys; the world, land and city data are computed once per place.
- **Acceptance (§5 budget):** unthrottled, the drag holds 60 fps (p90 ≤ 17 ms); at 4× CPU throttle the drag's p50
  equals the scene's own idle p50 and its p90 is within one frame of idle's. (The absolute 4× numbers first written
  here are unreachable in headless software rendering, where the idle scene alone is 33 ms a frame; a phone with a GPU
  is checked in phase 5.)
- **Done 2026-11-19:** Shadmot, drag 1×: p50 16.7 / p90 16.7 ms; 4×: p50 33.4 / p90 66.6 ms against idle 33.3 / 49.9.
  What it took: the heading lives in the scene (a turn never re-renders the page); the compass sits over the time
  scrubber (before, a drag on it scrubbed time); sectors are memoised and only the two in view are mounted; while
  turning the stage's houses are two flat paths, full drawing 150 ms after the turn stops. Sectors are drawn 5° wider
  each side and cut to their core, light each column by the sun's turn from that column, and share one tone and one
  sea line, so their joins do not show.

### Phase 3 — Value: the weather has a direction
Goal: a reason to turn, every day.
- **Rain:** the radar nowcast (bearing, distance, motion) draws the rain where it is: a curtain of rain over the true
  ridge in its direction, its distance by height and haze, moving at its speed. The compass marks it; a tap turns to it;
  one line says "גשם מעל הגלבוע, מתקרב, בעוד כ־40 דקות" from the existing rain verdict.
- **What you can see today:** visibility (forecast + aerosol) decides which far ridges and landmarks show; a short line
  names the far thing seen today ("רואים היום את החרמון") or hidden ("אובך מסתיר את הרי הגלעד").
- **Clouds** from the satellite at their true bearing (already in `cloudSightings`), drawn in the view they are in.
- **Sun and moon events:** where the sun sets behind which ridge today; moonrise direction; the compass marks both.
- **Acceptance:** with synthetic rain (`?rain=`) from the west, the west view shows it over the right ridge and the line
  matches the rain map; at Rosh Pina on a clear day the Hermon is named; on a hazy day it is not.

### Phase 4 — The stage follows the ground
- The stage ground and every house sit on the DEM (a fine near read of the same tiles, 30 m within 600 m), seen from the
  pole: a village on a slope climbs it, a hilltop town falls away on the far side.
- Building footprints: the house count and sizes follow the raster; where OSM footprints are dense, the stage draws the
  footprints' real outlines (a pipeline step after phase 1's, same cell format).
- **Acceptance:** Rosh Pina's houses climb the slope; Jerusalem's edge falls toward the valley; no house floats.

### Phase 5 — Polish and device
- Real-phone pass (Android mid-range, iPhone): drag feel, inertia, the compass size and contrast, reduced motion,
  screen-reader slider texts, the labels (elevation, sea line) placed for the stage.
- Night: lit windows from the stage houses; moonlit land tints from the land model.
- Loading: the turning view appears only when world + land are ready; until then the current scene.

### Phase 6 — Ship
- The owner looks at the stills and the phone build and decides: the turning view becomes the scene (default heading
  south, true directions), or stays an option. The cross-section stand-in is removed (`camera-fable.md` §2.4); the
  baseline is re-recorded once, in that commit.

## 3. Order and why
1 → 2 → 3 → 4 → 5 → 6. Land first because it decides what the strip must draw (phase 2 renders what phase 1 adds);
speed before value so the value is felt; the ground-following stage after, since it is the least visible gap.

## 4. Data, size and cost
| Data | Where it comes from | Size | Refresh |
|---|---|---|---|
| World horizon | AWS Terrain Tiles, in the browser (as today) | ~90 KB stored a place | once |
| Built-up raster | our `public/data/city` (as today) | as today | monthly CI |
| Land cover | ESA WorldCover → our `public/data/land` | ≤ 4 MB total | yearly CI |
| This week's colour | Sentinel-2 L2A COG window, in the browser | ~0.5–1.5 MB a fetch | every 5 days a place |
| Rain, clouds, visibility | as today | — | live |

## 5. Performance budget and how it is measured
`scripts/turn-perf.cjs` is a Playwright run (fixture forecast, 4× CPU throttle, 60 drag steps on the compass, frame
times from `requestAnimationFrame`). Budget in phase 2's acceptance; every later phase must stay inside it.

## 6. Decisions the owner is asked for (defaults used until answered; work never waits)
- True directions (facing south, east on the left) — default yes.
- 120° field of view — default yes.
- Sentinel-2 read from the phone (a weekly 0.5–1.5 MB fetch a place) vs. a server step — default the phone.
- The turning view as the default scene at phase 6 — asked at phase 6.
