# Radar page (מבט מלמעלה): engineering review of the UX brief

Reviewer lane: feasibility, data truth, architecture, tests, risk. Answers `docs/briefs/radar-ux.md`. Read with
`src/ui/overhead/*`, `src/domain/rainNowcast.ts`, `src/domain/rainSentence.ts`, `src/data/overhead/*`.

## Position

Almost everything in the brief can be built from data we already fetch. Nothing needs a new dependency. Three things
need fixing before any visible work: **(1)** the outlook goes stale without anyone noticing, **(2)** the dark sheet's
radar colours are invisible, and **(3)** two files are already at their line limit. The future frames ("the rail runs
into the next hour") are feasible and honest enough **up to +60 min**, drawn as one shifted image. Build them last,
after a synthetic `?rain=` fixture exists, because today is dry and nothing rainy can be checked by eye.

## What the data really is

`useRainOutlook` (App level, every 5 min) reads two 256 px RainViewer images at z6 centred on the place: the newest
frame and the one ≥30 min before it. It turns them into a 128×128 grid. At lat 32.4 a cell is ~4.13 km (2 px ×
2.07 km), so the grid covers ~530 km square. `rainOutlook` returns:

| Field | Form | Drawable? |
|---|---|---|
| `motion` | `{kmh, heading}`, heading = where the rain is **going**, degrees from north | Yes, through a `destination(place, km, bearing)` helper |
| `nearest` | `{km, bearing, band}` from the place, nearest echo **cell centre**, at frame time | Yes, but it is not aged |
| `arrivesIn` / `lastsFor` | minutes in 5-min steps, aged once at fetch time (`sinceFrame`) | For text only |
| `band` / `now` | 0–3; band = `radarBand + 1`, so any pixel with alpha ≥ 40 counts as "light" | Yes |
| **missing** | frame time; where the arriving rain is now; the grid itself | Must add the first two |

Truth findings (fix in step 2):
- **Stale outlook.** `sinceFrame` runs once per fetch. When offline, the hook's `catch` keeps the last outlook
  forever, so "גשם בעוד כ־25 דקות" can stay on screen for an hour. App's `rainy` flag and the entry row ride on it
  too. Fix: carry `at` (the frame's epoch ms) in the outlook, age it at render, and drop it when
  `frameIsStale(at, now)` (>45 min).
- **Map and sentence can disagree.** The map timeline is fetched once when the page opens. The outlook refreshes
  every 5 min in App. Anchor everything we draw (future frames, arrow) to the outlook's `at`, not to the map's
  last frame. When the two differ by more than 10 min, hide the future frames.
- **Motion resolution.** Motion is found in whole cells over a 30-min baseline, so speed comes in steps of
  4.13/0.5 = **8.3 km/h** and heading in integer (dx, dy) steps: ~14° at 30 km/h, 26–45° at ≤16 km/h. The
  position error of the extrapolation is about ±2 km per axis per 30 min of lead: **±6 km at +60 min, ±9 km at
  +90**. On the map (~1 km/px at the opening zoom) that is a few pixels, which is acceptable. The arrival-time error is
  δv/v: ±14% at 30 km/h, ±28% at 15 km/h. The `about()` buckets already absorb this. The bigger lie is the
  model itself: rain does not stay the same shape. Convective cells grow and die within 30–60 min. That is why the
  map stops at +60 even though the sentence goes to 90.
- **"Light" includes weak returns.** Weak tan pixels (`radarBand` 0) become band 1, which may be clutter or virga. The
  map shows the same pixels, so the two agree, but "יש גשם קל 30 ק״מ" may sometimes be noise. Only a rainy day can tell.
- **`nearest.band` is the band at the nearest edge.** A storm's edge is usually light, so a heavy storm reads as
  "גשם קל". The headline should use the strongest band within ~1 cell radius of that point. This is optional and can
  come later.

Add to `rainOutlook` (pure, testable): `approach: {km, bearing} | null`, the position *at frame time* of the
rain that reaches the place at `wetFrom` (the cell at `c − v·t`). Then the arrow and the pointer do not have to
re-derive it from rounded minutes.

## Idea by idea

**Clock time first, end labels, as-of line** — feasible, trivial. Use `nowIn(place.timezone, new Date(ms)).slice(11,16)`
(Node has full ICU, so it is testable). Replace `ענן: … · גשם: …` with one line: `מכ״ם 14:20` normally, and a
warning line when `frameIsStale`. Cloud age is dropped from view; it stays only in the status when the cloud fetch
failed. `aria-valuetext` becomes "14:20, לפני 40 דקות" for past frames and "15:10, הערכה" for future ones.

**Play/pause loop** — feasible. Replace the rAF in `usePlayback` with a `setTimeout` chain: 450 ms per frame and a
1.5 s hold on the last real frame. Loop 3 times, then stop on the latest frame. Pause on `document.hidden` and
whenever the user touches the rail. Reduced motion: no autoplay, the play button still works, and the step is 1.2 s.
Each step only calls `showWeather` (about 31 layers × 3 paint guards) and makes one MapLibre repaint, so it costs
almost nothing in battery. Put the logic in a pure `playbackPlan.ts`: `delayFor(index, last, reduced)`,
`next(state)`, and the loop count.

**Ring labels, place label** — feasible as **DOM `Marker`s**, not symbol layers. Symbol layers need glyphs, which
the fallback paper style lacks, and the RTL plugin. DOM text is shaped natively and themed by CSS variables. Note the
scale: at the opening zoom 25 km is ~24 px, so labelling the 25 km ring crowds the dot. **Label only the 50 km ring**
("50 ק״מ", at bearing 135°, away from rain off the sea). The place label goes inside the existing marker element and
needs a `dir="rtl"` wrapper, because the map container is `dir="ltr"`. Risk: it collides with the curated town label
in Jerusalem, Tel Aviv and Haifa. QA there.

**Legend, clouds swatch, wash vs sea** — feasible. Measured composite contrast of the current `RADAR_WASH`:

| Band | on light land | on light water | on dark water `#334760` | on dark sheet `#101833` |
|---|---|---|---|---|
| light | 1.59 | 1.54 | 1.55 | 2.01 |
| moderate | 2.72 | 2.62 | 1.20 | 1.73 |
| heavy | 4.85 | 4.60 | **1.05** | 1.59 |

The dark sheet is effectively broken: heavy rain over the dark sea has no luminance contrast at all. Fix:
- Make `RADAR_WASH` a `{light, dark}` pair.
- Put the ink in the protocol URL (`shamayim-radar://dark/https://…`, the same pattern as `sat://shadow/`).
- On a paper change, call `setTiles` on the radar sources. The tiles have `max-age=172800`, so the refetch is a cache hit.
- Add `radarWash.contrast.test.ts` using `src/theme/contrast.ts`'s `ratio`:
  - moderate and heavy must be ≥ 3:1 (WCAG 1.4.11) against land and water on both papers;
  - light must be ≥ 2:1 *and* visibly different in hue from water;
  - neighbouring bands must be ≥ 1.4:1 apart, or differ in hue.
- A candidate dark ramp that passes the contrast thresholds: rgb(150,205,235)/.75, rgb(245,215,90)/.9, rgb(255,120,170)/.95.
  The palette itself is the design lane's call.

The legend reads `RADAR_WASH`, so it follows the ramp automatically. The cloud swatch is static (252,251,246 on
`mapInk().land`).

**Title** — copy only (`OverheadPage.tsx` h2, `OverheadEntry.tsx`). This **breaks QA commands** that open the
page with `scripts/shot.mjs … "מבט מלמעלה"`, so update the clickText in TASKS/NOTES.

**Headline ("גשם בעוד ~25 דק׳")** — feasible. Add a pure `rainHeadline(o, clockIn, forecastRainAt)` to
`rainSentence.ts` (56 → ~90 lines), reusing `about()`/`KIND`. It must come from the same outlook as the sentence,
so the two never contradict each other. Return null when there is no outlook or it is stale; no headline is better than
an old one.

**Motion arrow on the map** — feasible from `motion` plus `approach` (arriving rain) or `nearest` (passing rain).
- Draw it as GeoJSON: a shaft whose length is 30 min of travel, clamped to 15–60 km, plus a two-segment chevron head.
  No sprite or icon is needed, since the sprite is stripped in `restylePositron`.
- Use two line layers (a halo in the land colour plus a thin stroke in `ink.text`), recoloured in the paper update.
- Show it only when `motion.kmh ≥ 4` and the rail is on the latest frame. On past frames it would point from a
  place where the rain no longer is; on future frames the moving image already shows the motion.
- Pure `motionArrow(outlook, place)` → `FeatureCollection | null`, tested for bearing, length and null cases.

**Off-screen pointer to the nearest rain** — feasible and needed. `MAP_BOUNDS` and `minZoom = opening zoom` mean
the user *cannot* pan or zoom out to rain 230 km north.
- Target point: `destination(place, nearest.km, nearest.bearing)`.
- Recompute on `move` with the existing rAF-throttled pattern: `map.project(target)` (it returns off-canvas pixels
  fine) and `map.project(place)` as the origin. Use the place, not the centre, because the centre is shifted 0.22° west.
- Pure `edgePointer(from, to, {w, h}, inset = 28)` → `{x, y, angle} | null`. It is null when the target is inside the
  inset rect; otherwise it gives the ray/rect intersection.
- Render a DOM chip `גשם · כ־230 ק״מ` with a rotated chevron, `aria-hidden` (the sentence says it), `dir="rtl"`.
- Hide it when the outlook is stale or the rail is in the future.
- Only the grid's ±265 km is known, so beyond that there is no pointer; that is honest.

**ⓘ How to read** — a `<details>` disclosure with no technical risk. It needs its own grid row: `.panel` uses fixed
`grid-template-rows: auto auto minmax(170px,1fr) auto auto`, and the headline adds a row too.

**Future frames on the rail** — feasible. Recommended mechanism:
- **One MapLibre `image` source** holding the newest frame as a single 512 px image at z7 centred on the place:
  `{host}{path}/512/7/{lat}/{lon}/2/1_1.png`. Checked live today: 200, `image/png`, `max-age=300`. Its
  extent equals the nowcast grid (~530 km) and its resolution equals the z6 512-px tiles (~1 km/px), so there is no
  blur jump.
- Recolour it through the existing protocol: `shamayim-radar://…` should apply to `getImage` in MapLibre 5.24.
  **Verify this.** Fallback: fetch it, call `recolorRadar` on a canvas, and use a blob URL (revoke it on abort).
- For lead time t, call `setCoordinates(corners(destination(centre, kmh·t/60, heading)))`. That is a GPU quad move
  with no re-upload. Raster layers have no `raster-translate`, so this is the clean way.
- Image sources are drawn as a quad in Mercator, so a Mercator image lines up exactly. Corner maths: centre in
  Mercator metres ± 256 px × 156 543.03/2^7 m.
- Steps are 10 min (the same spacing as the past frames) from the latest frame until ≥ now+60. That is about 7 steps,
  with an "עכשיו" tick at the fractional index (now − latest)/10.
- Future frames hide the cloud layers, because there is no cloud nowcast and frozen clouds would read as a forecast.
  Fade the image's opacity 0.85 → 0.45 over the lead time, and add a `הערכה` chip on the map.
- No future frames when `motion` is null, below 4 km/h, the outlook is stale, or the map and outlook frames differ by
  more than 10 min.
- The rail then shows the past on the right, the "עכשיו" tick, and the estimate on the left. Mark the future segment
  with a dashed track.
- Pure `aheadFrames(latestMs, nowMs, motion)` → `{t, opacity, offsetKm}[]` and `imageCorners(lat, lon, z, px)`, both
  tested (corner round trip, width in km, steps and opacity).

## Files (line counts today) and plan

| File | Now | Action |
|---|---|---|
| `ui/overhead/mapRuntime.ts` | **136** | Split first: `paper()`/`updatePaper` → `mapPaper.ts`; new layers go in `nowcastLayers.ts` |
| `ui/overhead/OverheadPage.tsx` | **129** | Split first: swipe-to-close → `useSwipeClose.ts`; status words → pure `overheadStatus.ts` (+test) |
| `ui/overhead/OverheadPage.module.css` | **118** | Freeze; new styles in `MapOverlay.module.css`, `RainHeadline.module.css` |
| `ui/overhead/placeMap.ts` | 34 | `ring()` reuses new `geo.ts` (`destination`, `imageCorners`) |
| `ui/overhead/TimeRail.tsx/.css` | 50/93 | End labels, play button, now tick, future segment (stay under 150; else `PlayButton.tsx`) |
| `ui/overhead/usePlayback.ts` | 33 | Rewrite on `playbackPlan.ts` |
| `ui/overhead/timing.ts` | 30 | + `clockAt(ms, tz)`, `railText(...)` |
| `ui/overhead/recolor.ts`, `tileProtocols.ts` | 34/99 | Light/dark wash; ink prefix in URL; synthetic branch (DEV) |
| `ui/overhead/weatherLayers.ts` | 58 | `Frame` gains `ahead?: number`; `showWeather` hides cloud in future |
| `domain/rainNowcast.ts` | 109 | + `approach` (stays ≤ 130) |
| `domain/rainSentence.ts` | 56 | + `rainHeadline` |
| `data/overhead/useRainOutlook.ts` | 85 | + `at`; synthetic branch; export a `RadarOutlook = RainOutlook & {at}` |
| `App.tsx` | — | Pass `outlook` (aged with `outlookNow`) to `OverheadPage`; `rainy` uses the aged one |
| new | — | `geo.ts`, `edgePointer.ts`, `motionArrow.ts`, `aheadFrames.ts`, `playbackPlan.ts`, `MapPointer.tsx`, `nowcastLayers.ts`, `data/overhead/syntheticRain.ts` |

**Vitest (node, no DOM)** for: `geo`, `edgePointer`, `motionArrow`, `aheadFrames`, `playbackPlan`,
`overheadStatus`, `timing` additions, `rainHeadline`, `approach` and outlook ageing (`outlookNow`), wash contrast,
`syntheticRain`. MapLibre glue (`nowcastLayers`, `MapPointer`) stays thin and untested, as it does today.

## Performance, offline, RTL, theme

- **Bundle:** keep everything that touches MapLibre in the lazy chunk (`import type` only outside it). The headline
  and outlook ageing are a few hundred bytes in the main chunk. The synthetic fixture loads only behind
  `import.meta.env.DEV` with a dynamic import, so it is dropped from production.
- **Network:** unchanged except one ~1–30 kB image when the page opens (and the optional 60-min frame, below).
  Tiles: about 2×2 512-px tiles per layer at z6, which is 13 radar + 18 cloud layers already preloaded at opacity 0.
- **Loop:** no continuous rAF. MapLibre idles between steps. Stop on hidden, closed, after 3 loops, or on
  reduced motion.
- **Offline:** tiles and basemap are not cached by the service worker, so offline shows `אין חיבור`. The headline,
  arrow, pointer and future frames all follow the aged outlook and disappear after 45 min. Never draw nowcast overlays
  over an empty map.
- **RTL:** the slider is `dir="rtl"` (min on the right). Keep the manual ArrowLeft = +1, add Home/End, and place
  ticks with `inset-inline-start`. The map container is LTR, so every DOM overlay sets `dir="rtl"` and wraps
  numbers in `<bdi>`. The RTL text plugin only matters for the town symbol layer; the new text is DOM, so it does not
  need the plugin.
- **Dark sheet:** DOM overlays inherit `--sheet`/`--sheet-ink`. Map-drawn marks (the arrow, the wash via the URL ink)
  must go through the paper update driven by the `MutationObserver`. Test both papers with `?at=` night stills.

## Risks and what needs a rainy day

Unverifiable when dry:
- whether RainViewer covers Israel well (IMS composite or only neighbours);
- false light echoes and clutter;
- real cell motion versus whole-cell steps;
- the colour of real Universal Blue tiles after recolour;
- arrow and pointer placement on real fields.

Verifiable without rain:
- image-corner alignment, with a one-off script comparing the 512/z7 centred image against stitched z7 tiles for a
  rainy city anywhere (e.g. London) in the same frame;
- whether the protocol applies to the image source;
- everything else, through the fixture below.

Optional motion upgrade, decided after a rainy day: also read the frame ~60 min back (256 px, ~1–5 kB). When its
motion agrees with the 30-min motion to within one 30-min cell step, use it. That halves the speed step to 4.1 km/h;
otherwise keep the 30-min result. Pure `steadierMotion(m30, m60, kmPerCell)`.

## Synthetic fixture: `?rain=` (DEV only, same style as `?seen=`)

The format is `?rain=bearing:km:radiusKm:band[:towardDeg:kmh],…` or a preset:
- `arrive` = `270:45:20:2:90:30`
- `here` = `0:0:25:3:90:30`
- `pass` = `270:30:12:2:0:30`
- `far` = `0:230:30:2`
- `still` = `200:20:10:1`
- `none`

Each blob is a disc whose position *now* is given and which moves rigidly back in time.
`data/overhead/syntheticRain.ts` (pure, tested):
- `parseRain(s)`: the blob list.
- `syntheticGrids(blobs, lat, nowMs)`: `{older, newer}` `EchoGrid`s with real geometry (128 cells, kmPerCell from
  lat, frames at now−10 and now−40 min). It feeds the **real** `rainOutlook`, so the sentence, headline, arrow,
  pointer and future frames are all exercised.
- `syntheticIndex(nowMs)`: 13 frames with host `https://synthetic.invalid`, path `/synthetic/<sec>`.
- `paintTile(blobs, place, z, x, y, size, frameMs)`: per-pixel lon/lat → local km → band → Universal Blue
  RGBA (the values in `recolor.test.ts`). The protocol and the centred image use it instead of `fetch` when the
  host is `synthetic.invalid`.

Wiring: `devParams.forcedRain()`, a branch in `useRainOutlook` (skip the network), a branch in `OverheadMap`'s timeline,
and the protocol's factory takes the blobs. QA matrix: 6 presets × light/dark (`?at=…T21:00`) × reduced motion, using
`scripts/shot.mjs`.

## Order (each step ships alone; every step runs `npx tsc -b`, `npx vitest run`, `npm run -s lint`, `npx vite build`)

1. **Splits only:** `mapPaper.ts`, `useSwipeClose.ts`, `overheadStatus.ts` (+test), `geo.ts` (+test, `ring` uses it).
   No visible change; compare stills before and after.
2. **Outlook truth:** add `at` and `approach`, `outlookNow` ageing and staleness, and pass the outlook to the page;
   `rainy` uses the aged outlook. Tests.
3. **`?rain=` fixture:** grids, index, painted tiles. Tests; stills for every preset.
4. **Time copy:** clock labels, rail end labels, one as-of/stale line, aria-valuetext, title rename (+ update QA
   clickText). `timing` tests.
5. **Wash palettes:** light/dark wash, ink-in-URL, contrast test, clouds swatch, larger legend.
6. **Place label + 50 km ring label** (DOM markers). Stills in Shadmot, Jerusalem and Tel Aviv.
7. **Headline:** `rainHeadline` + render. Tests.
8. **Loop playback + play/pause:** `playbackPlan` tests; check reduced motion.
9. **Motion arrow:** `motionArrow` tests; `arrive` and `pass` stills.
10. **Off-screen pointer:** `edgePointer` tests; `far` still.
11. **Future frames:** `aheadFrames` and `imageCorners` tests, the corner-alignment script, protocol-on-image check,
    and the rail's future segment.
12. **ⓘ How to read.** Then, on the first rainy day: verify against the real radar and decide on the 60-min motion
    baseline.
