# Canvas scene: performance, stage by stage

Budgets and method: `docs/design/CANVAS-SCENE-PLAN.md` §3. Runner: `npm run test:perf` (`e2e/scene.perf.mjs`):
the scene harness (`scene.html`) in the preinstalled headless Chromium, `--disable-gpu` (software raster, so every
raster is counted on the main thread), CPU throttled ×4 (CDP `Emulation.setCPUThrottlingRate`), dpr 2.75, 375 px wide;
a cold load at 06:00, then 60 scrub frames across the day (12 min apart), each a synchronous world + model + paint
(since the pass before C4: + ask, with the paint worker, whose arrivals are added to the frame they land in; see there).
Gated steps fail above 1.5 × budget; "reported only" steps are explained in the plan's §6.

## C1 (2026-11-19): sky gradient and flat planes

What is drawn: the sky gradient (one sky layer, the whole sky surface, 1032 × 1177 device px) and the far and near
planes as flat fills (form + light canvases each). No animated layer yet.

```
haifa  (CPU ×4, dpr 2.75, software raster)
  worldCold    p50  326.80  p95  326.80 ms  (n  1, budget 15, reported only)
  modelCold    p50    3.00  p95    3.00 ms  (n  1, budget 10)
  firstPaint   p50   60.50  p95   60.50 ms  (n  1, budget 60)
  slice.land   p50   22.20  p95   22.20 ms  (n  1, budget 8, reported only)
  slice.sky    p50   38.30  p95   38.30 ms  (n  1, budget 8, reported only)
  scrub.world  p50    7.00  p95   87.10 ms  (n 60, budget 10, reported only)
  scrub.model  p50    0.30  p95    1.10 ms  (n 60, budget 10)
  scrub.land   p50    2.70  p95    5.40 ms  (n 60, budget 10)
  scrub.sky    p50   16.50  p95   24.30 ms  (n 60, budget 10, reported only)
  memory       14.4 MB (budget 48)
  scrub repainted: plane.far:light, plane.near:light, sky:form
  last paint per layer (ms): sky 0.3, plane.far 0.5, plane.near 0.0
  anim         no animated layer yet (C6–C8)

tel-aviv  (CPU ×4, dpr 2.75, software raster)
  worldCold    p50  434.80  p95  434.80 ms  (n  1, budget 15, reported only)
  modelCold    p50    4.70  p95    4.70 ms  (n  1, budget 10)
  firstPaint   p50   57.70  p95   57.70 ms  (n  1, budget 60)
  slice.land   p50   12.00  p95   12.00 ms  (n  1, budget 8, reported only)
  slice.sky    p50   45.70  p95   45.70 ms  (n  1, budget 8, reported only)
  scrub.world  p50    5.20  p95   54.80 ms  (n 60, budget 10, reported only)
  scrub.model  p50    0.30  p95    1.10 ms  (n 60, budget 10)
  scrub.land   p50    2.00  p95    3.40 ms  (n 60, budget 10)
  scrub.sky    p50   15.50  p95   23.50 ms  (n 60, budget 10, reported only)
  memory       12.1 MB (budget 48)
  scrub repainted: plane.far:light, plane.near:light, sky:form
  last paint per layer (ms): sky 0.9, plane.far 0.0, plane.near 0.0
  anim         no animated layer yet (C6–C8)

shadmot-mehola  (CPU ×4, dpr 2.75, software raster)
  worldCold    p50  209.10  p95  209.10 ms  (n  1, budget 15, reported only)
  modelCold    p50    3.00  p95    3.00 ms  (n  1, budget 10)
  firstPaint   p50   65.80  p95   65.80 ms  (n  1, budget 60)
  slice.land   p50   19.30  p95   19.30 ms  (n  1, budget 8, reported only)
  slice.sky    p50   46.50  p95   46.50 ms  (n  1, budget 8, reported only)
  scrub.world  p50    6.00  p95   71.60 ms  (n 60, budget 10, reported only)
  scrub.model  p50    0.30  p95    1.00 ms  (n 60, budget 10)
  scrub.land   p50    3.10  p95    4.80 ms  (n 60, budget 10)
  scrub.sky    p50   19.00  p95   22.20 ms  (n 60, budget 10, reported only)
  memory       13.6 MB (budget 48)
  scrub repainted: plane.far:light, plane.near:light, sky:form
  last paint per layer (ms): sky 0.1, plane.far 0.0, plane.near 0.0
  anim         no animated layer yet (C6–C8)

within budget
```

Reading:
- **Within budget** on the gated steps: the model (≤ 5 ms cold, ≤ 1.5 ms a scrub frame), the first full paint
  (55–66 ms against 60, gate 90), the land's scrub frame (light canvases only: p95 3–5 ms against 10), memory
  (12–14 MB against 48).
- **The cold world** (190–440 ms throttled) is the marks (`hillScene`), as C0 recorded: rechecked at C4. A scrub
  frame's world (p50 5–7 ms, p95 55–90 ms) is reported with it: the p95 frames are to be looked into at C4 too.
- **The sky** repaints whole each scrub frame (16–19 ms p50): a full-surface gradient at dpr 2.75 costs ~15 ms in
  software raster ×4 whatever the path (measured: direct fill 18 ms, cached + 1:1 blit 22–26 ms, a cached blit alone
  2 ms; a *scaled* blit 22 ms, which is why caches are kept at the device's ratio). C6 owns it.
- **Cold slices** are over 8 ms (land 12–22, sky 38–46): a 2D canvas defers raster to the first blit, so one slice
  holds at least one layer's whole raster. Reported only until C6 / the phone check.

## C2 (2026-11-19): the land's planes in the enriched hand

What is drawn: the sky gradient (unchanged), the far and near planes with their form (neutral fill, texture on the near
plane, gullies, terraces, scrub) and their light (tone by distance, snow, shade and lit washes, floor shadow, rim, lifts),
laid over the form with `overlay`. The far plane is cut to what shows over the near ridge.

```
haifa  (CPU ×4, dpr 2.75, software raster)
  worldCold    p50  335.60  p95  335.60 ms  (n  1, budget 15, reported only)
  modelCold    p50   10.90  p95   10.90 ms  (n  1, budget 10)
  firstPaint   p50   96.70  p95   96.70 ms  (n  1, budget 60)  OVER
  slice.land   p50   25.50  p95   30.90 ms  (n  2, budget 8, reported only)
  slice.sky    p50   40.30  p95   40.30 ms  (n  1, budget 8, reported only)
  scrub.world  p50    8.40  p95   88.50 ms  (n 60, budget 10, reported only)
  scrub.model  p50    8.10  p95   13.20 ms  (n 60, budget 10)
  scrub.land   p50   12.10  p95   20.20 ms  (n 60, budget 10)  OVER
  scrub.sky    p50   17.40  p95   24.90 ms  (n 60, budget 10, reported only)
  memory       14.0 MB (budget 48)
  scrub repainted: plane.far:light, plane.near:light, sky:form

tel-aviv  (CPU ×4, dpr 2.75, software raster)
  worldCold    p50  407.70  p95  407.70 ms  (n  1, budget 15, reported only)
  modelCold    p50   11.20  p95   11.20 ms  (n  1, budget 10)
  firstPaint   p50   63.30  p95   63.30 ms  (n  1, budget 60)
  slice.land   p50   24.20  p95   24.20 ms  (n  1, budget 8, reported only)
  slice.sky    p50   39.10  p95   39.10 ms  (n  1, budget 8, reported only)
  scrub.world  p50    6.80  p95   58.70 ms  (n 60, budget 10, reported only)
  scrub.model  p50    3.30  p95    9.80 ms  (n 60, budget 10)
  scrub.land   p50   10.50  p95   19.70 ms  (n 60, budget 10)  OVER
  scrub.sky    p50   19.40  p95   28.00 ms  (n 60, budget 10, reported only)
  memory       11.7 MB (budget 48)

shadmot-mehola  (CPU ×4, dpr 2.75, software raster)
  worldCold    p50  268.70  p95  268.70 ms  (n  1, budget 15, reported only)
  modelCold    p50   13.20  p95   13.20 ms  (n  1, budget 10)
  firstPaint   p50  116.50  p95  116.50 ms  (n  1, budget 60)  OVER
  slice.land   p50   33.30  p95   37.10 ms  (n  2, budget 8, reported only)
  slice.sky    p50   46.10  p95   46.10 ms  (n  1, budget 8, reported only)
  scrub.world  p50    5.50  p95   55.60 ms  (n 60, budget 10, reported only)
  scrub.model  p50    3.40  p95    7.20 ms  (n 60, budget 10)
  scrub.land   p50   12.80  p95   20.10 ms  (n 60, budget 10)  OVER
  scrub.sky    p50   15.70  p95   21.80 ms  (n 60, budget 10, reported only)
  memory       13.2 MB (budget 48)
```

Reading:
- **Within budget**: the model (cold 11–13 ms, scrub p95 7–13 ms against a gate of 15), memory (12–14 MB).
- **Over the gate**: the land's scrub frame (p50 10–17 ms, p95 15–23 ms against 15) and the first paint (63–117 ms
  against 90, of which the sky is 39–46 ms), over several runs (the block above is one of them). Runs vary by ±20 % on this machine (cold steps are one sample); the same day's C1
  rerun read firstPaint 49–74, scrub.land p95 3–5.
- **Where the scrub frame goes** (Haifa, by switching parts off): composite of the four canvases ~2 ms, the tone fill of
  both planes ~4 ms (a full-plane pass in software raster), washes ~2 ms, rim and lifts ~2 ms; the p95 is mostly
  spikes (the world's per-frame rebuild, `scrub.world` p95 55–90 ms, leaves garbage that is collected during the paint).
  A clip cost every later fill ~3× (7 ms for the lit washes alone): the light painter lays everything after the tone with
  `source-atop` instead. Painting the soft part small and drawing it back up cost more than it saved (a scaled blit is
  the slow path here, as C1 found for the sky).
- **The first paint's land** is the near plane's texture (value noise per 3 px texel, ~10 ms of it cold) and the cold
  JIT of the new painters.
- Options for the owner / the next stage: the plan's fallback (light canvases capped at dpr 2 while scrubbing; to
  measure, a scaled blit being the slow path in software), quantising the light key while scrubbing, and the real phone
  (`?perf=1`, GPU raster), where per-pixel passes cost far less than here.

## C3 (2026-11-19): water, haze band, far towns

What is added: the haze band in the sky layer; per place the far towns (`farCities`, light-only) and the water
(`water.far` with the sea-level datum, `water.near`), both light-only layers whose empty form is not blitted
(`Painter.formless`). The towns' field and the ripples' places are built once with the terrain in the world, so neither a
cold model nor a scrub frame recomputes them.

```
haifa  (CPU ×4, dpr 2.75, software raster)
  modelCold    p50   31.80 ms  (budget 10)  OVER
  firstPaint   p50  118.40 ms  (budget 60)  OVER
  scrub.model  p50    9.90  p95   14.40 ms  (budget 10)
  scrub.land   p50   18.60  p95   25.40 ms  (budget 10)  OVER
  scrub repainted: farCities:light, plane.far:light, plane.near:light, sky:form, water.near:light
tel-aviv
  modelCold    p50   17.90 ms  OVER
  firstPaint   p50   80.20 ms
  scrub.model  p50    3.90  p95    9.70 ms
  scrub.land   p50   12.60  p95   18.40 ms  OVER
  scrub repainted: farCities:light, plane.far:light, plane.near:light, sky:form
shadmot-mehola
  modelCold    p50   21.80 ms  OVER
  firstPaint   p50  141.90 ms  OVER (105–142 over runs)
  scrub.model  p50    4.00  p95    8.50 ms
  scrub.land   p50   19.10  p95   25.00 ms  OVER
  scrub repainted: plane.far:light, plane.near:light, sky:form, water.far:light (the datum, when the ink turns)
```

Reading:
- **C2 on the same machine the same day, before C3**: haifa modelCold 21.6, firstPaint 112.9, scrub.land p50 15.0 /
  p95 19.6; tel-aviv 12.6, 79.9, 11.6 / 16.8; shadmot 21.4, 111.5, 16.6 / 24.9. So C3 adds ~3–6 ms to a scrub frame
  where water and towns repaint (Haifa, both), little elsewhere; first paint and the cold model are within the run-to-run
  noise (±20 %) at Tel Aviv and Shadmot, Haifa's cold model ~+10 ms (the water's surface and the towns' tiers).
- **Not recovered**: the land scrub frame and the first paint stay over their gates, as at C2. The per-layer paint times
  are under 1 ms (towns 2.3 ms); the frame is the composite (software raster defers each canvas's raster to its blit),
  dominated by the planes' `overlay` light. Tried and dropped: the sky gradient as a one-column pattern laid across
  (no change: 40–45 ms either way).
- First version of the towns computed their field in the model: modelCold 83–116 ms; moved to the world's terrain part.

## Performance pass before C4 (2026-11-19): the paint worker, the sky in rows, the world's per-frame waste

What changed (the look unchanged: 53/53 pixel references pass at the same tolerance, painted in the worker and on the
main thread alike; worker and main-thread stills are pixel-identical; the SVG baseline untouched):
1. **The world's scrub frame.** `astro/utc.ts` built an `Intl.DateTimeFormat` on every call (~100 calls a frame): one per
   time zone now (same output). The twilight glow's ridge crossing (`sunOverRidge`, ~100 sun positions) depended on the day
   only but ran every twilight frame: kept per skyline and day (`world/light.ts`), found on the cold build.
   `clearanceOf` / `groundAt` (`world/sceneLight.ts`, ~500 calls a frame from the ridge light and the floor shadow) scan
   only the run of a sorted profile toward the light, and find x by bisection (same points, same sums, so the same
   numbers: the SVG scene shares them and its snapshots are unchanged).
2. **The sky in rows** (`paint/sky.ts`): the gradient and the haze band are a function of the row, so each device row's
   colour is computed (the canvas gradient's own interpolation, the band laid `source-over`, its edge rows by coverage)
   and written with a native 32-bit fill into a reused `ImageData`: 4–6 ms against 13–20 ms for the gradient fill
   (largest difference from the old pixels 2/255 on 0.4–0.7 % of pixels).
3. **The paint worker** (`compose/paintWorker.ts`, `remoteCache.ts`, `worker.ts`): every layer is painted in a module
   worker on an `OffscreenCanvas` with the same painters and the same `paintPart` as the main thread, and handed back as a
   transferred `ImageBitmap`; the main thread asks for the stale parts and lays the bitmaps. One batch in flight per
   surface; a newer ask for the same part replaces an older one. While a scrub frame's light is painted the last light
   stays laid over the form (the light trails the hand by a batch), and the exact light lands when the hand stops. No
   worker, or one without a 2D `OffscreenCanvas`: the surface paints on the main thread as before (`?paint=main` forces it;
   `npm run test:perf -- --paint=main`, `SCENE_PAINT=main npm run test:pixels`). The sky's and the land's workers start as
   the scene's chunk loads.
4. **Compile hint** for the model: `//# allFunctionsCalledOnLoad` heads `scene/model/*.ts` (dev) and the production
   `CanvasScene` chunk (a `generateBundle` step in `vite.config.ts`): Chrome compiles the scene's functions as the chunk
   loads instead of one by one on first call. Cold model at Shadmot 12–15 → 6–8 ms, Tel Aviv 18–32 → 7–17.
5. `farCities` model: the tier lookup a plain loop (no closure per town box).

Before / after (CPU ×4, dpr 2.75, software raster; ms; "before" is this morning's rerun of C3, C3's own record in
brackets; "after" is the range over three runs (four for the cold model), painted in the worker; gates at 1.5 × budget: model cold 15, first paint
90, scrub frames 15):

| | Haifa before | Haifa after | Tel Aviv before | Tel Aviv after | Shadmot before | Shadmot after |
|---|---|---|---|---|---|---|
| modelCold (gated) | 34.2 (31.8) | 12.9–29.6 **over in 3 of 4 runs** | 17.9 (17.9) | 7.4–11.3 | 13.9 (21.8) | 1.7–6.8 |
| firstPaint, main thread (gated) | 109.9 (118) | 21–33 | 91.9 (80) | 21–26 | 104.8 (105–142) | 17–25 |
| firstShown, until every layer shows | 109.9 | 160–172 | 91.9 | 134–162 | 104.8 | 137–155 |
| scrub.land p50 / p95 (gated) | 20.9 / 28.4 (18.6 / 25.4) | 0.1 / 1.3–1.4 | 13.3 / 20.0 (12.6 / 18.4) | 0.1 / 0.8–1.1 | 18.4 / 24.3 (19.1 / 25.0) | 0.1 / 0.8–1.4 |
| scrub.model p95 (gated) | 15.0 | 8.6–13.4 | 8.6 | 8.4–13.8 | 7.7 | 7.3–11.0 |
| scrub.world p95 | 87.3 | 7.3–12.8 | 61.3 | 5.8–7.1 | 64.1 | 4.8–8.9 |
| scrub.sky p50 / p95 | 21.3 / 27.5 | 0.2–0.3 / 1.2–4.2 | 21.4 / 28.1 | 0.1–0.3 / 0.8–4.1 | 19.7 / 24.2 | 0.1–0.4 / 1.0–1.6 |
| scrub.latency p50 / p95 (light trails the hand) | 0 | 285–400 / 330–540 | 0 | 116–215 / 211–271 | 0 | 130–185 / 170–252 |

Main-thread fallback (`--paint=main`, the same day): first paint 113–144 / 92 / 113–121 ms, scrub.land p95 29.5–31.5 /
19.0–19.9 / 22.5–25.8 ms (Haifa / Tel Aviv / Shadmot): the land's light is as before, over the gates; the sky's scrub frame
12–13 ms p50 (was 19–21). Unthrottled (`--rate=1`), with the worker: first shown 30–35 ms, scrub latency p50 6–10 / p95
10–23 ms, worker batch land 5.6–8.3 ms p50.

One run in full (with the worker):

```
haifa  (CPU ×4, dpr 2.75, software raster, painted in the worker)
  worldCold    p50  477.50  p95  477.50 ms  (n  1, budget 15, reported only)
  modelCold    p50   19.00  p95   19.00 ms  (n  1, budget 10)  OVER
  firstPaint   p50   26.90  p95   26.90 ms  (n  1, budget 60)
  firstShown   p50  160.40  p95  160.40 ms  (n  1, budget 60, reported only)
  scrub.world  p50    3.40  p95    7.30 ms  (n 60, budget 10, reported only)
  scrub.model  p50    3.80  p95    8.60 ms  (n 60, budget 10)
  scrub.land   p50    0.10  p95    1.30 ms  (n 60, budget 10)
  scrub.sky    p50    0.20  p95    1.60 ms  (n 60, budget 10, reported only)
  scrub.latency p50  285.50  p95  331.70 ms  (n 13, budget 33, reported only)
  memory       14.2 MB (budget 48)
  scrub repainted: farCities:light, plane.far:light, plane.near:light, sky:form, water.near:light
  worker batch (ms, the worker's own time, raster included): sky p50 33.5 p95 61.6 (n 31), land p50 123.6 p95 158.0 (n 14)

tel-aviv  (CPU ×4, dpr 2.75, software raster, painted in the worker)
  worldCold    p50  479.20  p95  479.20 ms  (n  1, budget 15, reported only)
  modelCold    p50   11.30  p95   11.30 ms  (n  1, budget 10)
  firstPaint   p50   26.20  p95   26.20 ms  (n  1, budget 60)
  firstShown   p50  161.50  p95  161.50 ms  (n  1, budget 60, reported only)
  scrub.world  p50    2.70  p95    7.00 ms  (n 60, budget 10, reported only)
  scrub.model  p50    3.20  p95    9.60 ms  (n 60, budget 10)
  scrub.land   p50    0.10  p95    1.10 ms  (n 60, budget 10)
  scrub.sky    p50    0.30  p95    1.10 ms  (n 60, budget 10, reported only)
  scrub.latency p50  190.90  p95  247.30 ms  (n 17, budget 33, reported only)
  memory       11.8 MB (budget 48)
  worker batch (ms, the worker's own time, raster included): sky p50 32.2 p95 64.1 (n 30), land p50 74.0 p95 154.1 (n 18)

shadmot-mehola  (CPU ×4, dpr 2.75, software raster, painted in the worker)
  worldCold    p50  243.10  p95  243.10 ms  (n  1, budget 15, reported only)
  modelCold    p50    6.80  p95    6.80 ms  (n  1, budget 10)
  firstPaint   p50   24.90  p95   24.90 ms  (n  1, budget 60)
  firstShown   p50  147.60  p95  147.60 ms  (n  1, budget 60, reported only)
  scrub.world  p50    3.00  p95    8.90 ms  (n 60, budget 10, reported only)
  scrub.model  p50    3.50  p95    9.00 ms  (n 60, budget 10)
  scrub.land   p50    0.10  p95    1.10 ms  (n 60, budget 10)
  scrub.sky    p50    0.40  p95    1.60 ms  (n 60, budget 10, reported only)
  scrub.latency p50  185.10  p95  251.50 ms  (n 20, budget 33, reported only)
  memory       13.2 MB (budget 48)
  worker batch (ms, the worker's own time, raster included): sky p50 37.8 p95 56.4 (n 30), land p50 70.2 p95 137.2 (n 21)

OVER BUDGET (×1.5):
  haifa modelCold p95 19.0 ms > 15.0
```

Reading:
- **What the gated steps now measure.** With the worker a step is the main thread's time: `firstPaint` is asking for
  every layer and laying each arriving batch; `scrub.land` is the frame's ask and composite plus laying whatever arrived
  before the next frame (the runner adds the arrivals in). The wait is reported beside it: `firstShown` (until every
  layer shows) and `scrub.latency` (from a frame's ask until a light painted for it, or for a later frame, shows). As
  before, the visible canvas's own raster at the frame's commit (~5 ms land, ~3 ms sky at ×4) is outside every step.
- **Where the old frame went** (measured layer by layer, forcing each canvas's raster): the planes' light is path-bound,
  not pixel-bound: the near plane's light 9–11 ms (the tone fill 2–3, the five nested wash bands 4–5, rims and lifts 1–2),
  the far plane's 4–9; the land's composite raster 5–6 ms; the sky's gradient 13–20 ms. The world's p95 was the
  `Intl.DateTimeFormat`s (800 ms of the 60 frames) and the twilight crossing (30–50 ms frames).
- **Options measured and not taken.** The plan's fallback, the light at a lower ratio while scrubbing: the near plane's
  light 9.0 → 5.9 ms at ratio 2 and 6.8 at 1.375 (path-bound: a quarter of the pixels is not a quarter of the time), but
  laying it back up with `overlay` costs 3.1–4.0 ms against 1.4 for a 1:1 blit: ~1.5 ms a plane saved, against a softer
  light while scrubbing; not worth it. Quantising the light key while scrubbing: every step still pays a whole light
  paint, so the p95 frame is unchanged (with 12-minute frames and 30-minute steps 40 % of frames repaint); with the
  worker a frame never waits for a paint anyway. Merging form and light of the far plane: its light changes every
  frame, its form never; merged, the form would be repainted every frame (texture, gullies: more, not less).
- **The light trails the hand while scrubbing** (the price of a free main thread): at ×4 by 120–400 ms (p50), unthrottled
  by 6–10 ms. The ×4 figure is pessimistic for a phone: the emulation slows the worker more than four-fold (a lone batch
  of land light takes 34–48 ms at ×4 and 6–8 ms at ×1; while the main thread scrubs every frame it takes 50–130 ms, on a
  4-core machine, so the throttle evidently shares one budget between the page's threads, and a thread waking from idle
  pays ~15–20 ms at its first raster at ×4, none at ×1). Haifa trails most: five layers in one batch. To check on the
  phone (`?perf=1`: `latency.land`, `worker.land`). Next steps if it shows there: the land's layers split over two
  workers, fewer wash bands in a superseded scrub light.
- **The first paint shows later** (`firstShown` 134–172 ms at ×4, 30–35 at ×1, against 92–144 for the sliced main-thread
  paint): the worker compiles the painters cold, under the same throttle. The main thread is free meanwhile (no slice of
  20–60 ms any more), and in the app the CSS gradient stands under the sky until the canvas is in (§1e).
- **Still over: Haifa's cold model** (19–30 ms against 15 in three runs of four, 12.9 in the fourth). It is first-run code: the same model for a place built fresh
  in a warm page costs 3–7 ms (Haifa included), so what remains is V8 running the model's functions for the first time at
  ×4 (the compile hint took the compile part; Haifa runs the most code: water near and far towns). Tel Aviv and Shadmot
  are under it now. To recheck in a production build on the phone, where the chunk is compiled as it streams.
- **GPU raster**: `--gpu` here is SwiftShader (the GPU emulated on the CPU), and measured no faster (with the worker:
  first paint 21–27, scrub.land p95 1.0–1.7, latency p50 151–291; main thread: scrub.land p95 25–28, first paint 103–172).
  So neither run stands for a phone's GPU raster; the gates stay on the software run, the conservative one.
- **Memory** counts the bitmaps the main thread holds (11.8–14.2 MB); the workers hold a canvas per layer part besides,
  blank between paints (a transfer takes its pixels), so at most as much again while a batch is painted.

## C4 (2026-11-19): glyphs, icons, landmarks, the village portrait

What is added: two light-only layers (`marks.far`, `portrait`), repainted on every scrub frame (their light), bounds fixed
across hours; the world's place part without `hillScene`.

```
worker (default)          haifa            tel-aviv         shadmot-mehola
  modelCold p50           39.7 OVER        11.0             12.3
  firstPaint p50          30.5             15.9             21.0
  firstShown p50          176.3            138.6            149.8
  scrub.model p50/p95     4.5 / 12.8       3.3 / 9.9        3.7 / 13.9
  scrub.land p50/p95      0.1 / 0.9        0.1 / 0.9        0.1 / 1.1
  scrub.latency p50/p95   366 / 410        179 / 298        213 / 289
  worker land batch p50   179.0            86.8             86.9
  memory                  14.7 MB          12.0 MB          13.5 MB
main thread (--paint=main)
  modelCold p50           27.8 OVER        12.7             10.0
  firstPaint p50          124.5 OVER       113.7 OVER       146.3 OVER
  scrub.land p50/p95      23.4 / 47.7 OVER 16.5 / 29.7 OVER 24.4 / 40.8 OVER
  portrait paint (ms)     1.9              2.3              2.6
```

Reading: against the perf pass the same day, the worker's land batch grows 15–55 ms (the portrait's light and its grain
fill; Haifa most, with its three marks and the Báb), the scrub latency is in the same range; the gated main-thread steps
of the worker path stay within budget but Haifa's cold model (its range 13–40 ms over runs). worldCold in the browser
(×4) 227–411 ms, reported only; in node the place part is now 1–10 ms for a portrait (was 4–9 with `hillScene`) and
7–25 ms for a city (Tel Aviv 59 → 25: its `outsideSkyline`, C5's).

## C6 (2026-11-19): the sky, the bodies, the stars, the clouds, lightning and shimmer

What is added: the sky's base as the sky canvas's CSS background (gradient, glows, Earth's shadow, haze band: no canvas
paint); on the sky canvas the stars, the sun and moon (two small layers round their discs), the clouds per level (bands
round the whole horizon, 360° of the camera, drifting), up to two flash layers (thunder) and a shimmer tile (heat). The
animation is applied at composite time (drift in whole device px, flash alpha), so an animated frame paints nothing. The
cold load and the scrub run with reduced motion (no loop racing them); the animation is measured on its own page, 10 s at
the `thunder` moment (every layer drifting, two flash layers), with motion on.

Worker path (the default), three places, after the performance pass:

```
haifa / tel-aviv / shadmot-mehola  (CPU ×4, dpr 2.75, software raster, painted in the worker)
  modelCold     30.3 / 17.9 / 17.6 ms              (budget 10)  OVER, as before C6 (13–30)
  firstPaint    20.8 / 21.8 / 31.9 ms (main thread) (budget 60)
  firstShown   164 / 143 / 199 ms                   (reported; was 134–172)
  scrub.model  p50 6.1 / 5.5 / 6.8   p95 13.5 / 11.3 / 16.5 ms  (budget 10; Shadmot's p95 over ×1.5 by 1.5 ms)
  scrub.land   p50 0.1               p95 0.9 / 1.5 / 1.0 ms
  scrub.sky    p50 0.5 / 0.4 / 0.4   p95 1.2 / 1.1 / 1.3 ms      (gated from C6, budget 10)
  scrub.latency p50 338 / 216 / 183  p95 407 / 251 / 246 ms      (reported)
  worker batch  sky p50 560 / 621 / 383  p95 961 / 634 / 693 ms; land p50 141 / 91 / 74 ms
  anim.sky     p50 0.6–0.7           p95 1.2 ms  (n 300, 10 s)  (budget 4)
  memory        25.4 / 21.6 / 24.0 MB
```

Main-thread fallback (`--paint=main`):

```
  firstPaint    138 / 96 / 136 ms         (budget 60)  OVER
  scrub.land    p50 22 / 13 / 18  p95 42 / 18 / 25 ms  OVER (as before C6)
  scrub.sky     p50 167 / 145 / 145  p95 385 / 361 / 347 ms  OVER
  clouds' paint: low 21–63, mid 33–39, high 10–30 ms
  anim.sky      p95 1.2–1.3 ms
```

Reading:
- **The main thread is within budget on the worker path**: a sky scrub frame is 0.4–0.5 ms p50 (C1–C3: 12–21 ms, the
  gradient repainted whole), the animated frame 0.6–0.7 ms p50, 1.2 ms p95 (budget 4): drift and flashes are laid, never
  painted. The sky's first paint adds nothing on the main thread (the base is CSS, the rest is asked of the worker).
- **The clouds are the cost**: a scrub repaints them whenever their light crosses a key step (tones 1/64, strengths
  1/20, the light's direction 8°), and the 60 frames of the runner step 12 minutes from dawn to dusk, so nearly every
  frame does. In the worker that is 380–620 ms per sky batch at ×4 (the land's: 74–141), so the sky's light trails the
  hand by ~0.2–0.4 s while scrubbing (newest ask wins; the last clouds stay laid); unthrottled about a quarter of that.
  On the main-thread fallback it is 145–167 ms p50 a frame: over the gate, as the land's light was before the worker.
- Tried, kept: a shared scratch sheet per paint and one puff sprite (no canvas allocated per bank), the rim from the mass
  itself (2 blits, not 2 × N gradients), decks without per-puff washes, the clouds worked at 1 px per CSS px inside the
  painter (`SOFT_SCALE`: 1.5 → 1 cut Haifa's main-thread cloud paint ~40 %; the gradient count was not the cost: a
  shared sprite in place of per-puff gradients changed nothing measurable). Snapped light numbers (the key names exactly
  what is painted) so a slow scrub repaints the clouds only on a step.
- **Options left**: split the clouds' light from their form (the planes' split; a cloud's tones and light both change
  with the hour, so it needs a recolouring the 2D canvas has no cheap way to do without `filter`), coarser steps while
  scrubbing (repaint on release), fewer field sheets on the main-thread fallback, or the plan's own fallback for
  phones without a worker canvas. To check on the phone (`?perf=1`: `worker.sky`, `latency.sky`).

## C5 (2026-11-19): every place seen from outside, one builder

What is added: one light-only layer (`outside`, z 38) for every place over a panorama: its built cells from the land
cover (a city's 12–13 k cells culled to 1–3 k drawn boxes), towers, trees (≤ 900), marks, the towers beyond and the
coastal sea. Its shapes are cached per place view, width and text zones, so a scrub only redoes the tones (per haze tier)
and the marks' glyph tones; the place part of the world (boundary mask, land-cover fabric, mass and spires, towers beyond)
is built once per place.

```
worker (default)          haifa            tel-aviv         shadmot-mehola
  worldCold p50 (×4)      759              649              255           (C4: 227–411, reported only)
  modelCold p50           41.2 OVER        39.8 OVER        12.3
  firstPaint p50          29.5             23.2             16.6
  firstShown p50          139.5            153.3            178.6
  scrub.model p50/p95     8.1 / 17.2 OVER  7.1 / 17.0 OVER  3.8 / 10.7
  scrub.land p50/p95      0.1 / 0.9        0.1 / 1.4        0.1 / 1.3
  scrub.latency p50/p95   461 / 511        253 / 387        230 / 285
  worker land batch p50   202.1            122.5            94.9
  memory                  15.0 MB          12.7 MB          13.3 MB
```

Reading: the gated paint steps stay within budget; **over**: the cold model of the two cities (the outside layer's first
shape: a pass over 1–3 k boxes, ~1.5 k trees and the clear zones) and the scrub model's p95 (p50 within; the copy of the
cached items per frame and the GC). Before the shape cache the scrub model was 9.5 / 22.5 (Tel Aviv). In node the place
part is 50–90 ms for a city (fabric from the land cover ~13 ms, the mass ~20 ms with the column index, the boundary
mask ~1 ms, the towers beyond 2–20 ms) and ~10–20 ms for a village; it runs once per place (memoised), never per hour.
Options left: cull the fabric cells hidden behind nearer ones before projecting the rest, build the shape in the paint
worker, keep the items' array between scrub frames (only the marks change).

## C7 (2026-11-19): the weather

What is added: on the sky the curtains under the far falling banks (a band layer, drifting with its cloud layer), two
falling tiles (far and near rain or snow: small tiles laid as moving patterns), rays, dust or wind streaks (a drifting
tile); on the land the near fall (a tile), mist (drifting tiles), sheen, smoke (a strip of 8 frames); the water's and the
place's layers become strips (6 frames, 4 frames) when they have ripples or trees in a wind. The perf runner now measures
both surfaces' animation (`anim.sky`, `anim.land`; the animated frame is their sum) at the `thunder` moment, which has
rain, flashes, mist and smoke.

Worker path, CPU ×4, dpr 2.75 (haifa / tel-aviv / shadmot-mehola), after merging C5:

```
  modelCold     50.6 / 34.4 / 31.4 ms     (budget 10)  OVER (C5's outside builder and C6; the weather ~0.15 ms of it unthrottled)
  firstPaint    27.8 / 30.7 / 24.2 ms     (budget 60)
  scrub.model   p95 22.0 / 20.8 / 13.4 ms (budget 10)  OVER for the two cities (C5)
  scrub.land    p95 1.1 / 1.0 / 1.3 ms
  scrub.sky     p95 1.2 / 1.2 / 1.2 ms
  anim.sky      p50 1.1 / 1.0 / 0.9   p95 1.8 / 1.7 / 1.9 ms
  anim.land     p50 0.7 / 0.5 / 0.2   p95 1.3 / 1.2 / 1.2 ms
  anim frame    p50 1.8 / 1.5 / 1.1   p95 3.1 / 2.9 / 3.1 ms   (sky + land, budget 4)
  worker cold batch at thunder: sky 298 / 384 / 282 ms, land 466 / 240 / 147 ms
  memory        29.4 / 25.6 / 24.1 MB; at thunder 33.3 / 31.8 / 25.5 MB (budget 48)
```

Reading:
- **The animated frame stays within its budget**: the falling tiles are one pattern fill per area (nested columns: four
  areas per raining bank overhead), the strips one sub-rect blit each; nothing is painted per frame. The loop ticked
  111–229 times in 10 s per surface (not 300): the two surfaces' loops share the main thread with the compositor's
  raster at ×4; on the phone to check with `?perf=1` (`anim.sky`, `anim.land`).
- **The worker pays for the strips once per key**: a land batch at the thunder moment is 147–466 ms at ×4 (the smoke's 8
  frames, the outside layer's 4 when its trees sway); while scrubbing the strips' light repaints, so the land's light
  trails the hand more (scrub latency p50 250–810 ms at ×4, C6: 183–338, C5's outside layer among it).
- Memory rises 2–4 MB at a stormy moment (the strips, the band-wide curtain layer).

Main-thread fallback (`--paint=main`, Haifa): painting whole strips on every scrub tripled the land's scrub frame (p50 169
→ 575 ms); the main thread's cache now paints a strip a frame at a time (the frame shown when its key changes, the others
as the loop first lays them: `LayerCache.ensureFrame`), which brings it back (p50 167, p95 225 ms: over the gate as the
fallback was before C7). The animated frame there is p50 1.1, p95 4.8 ms (the first loop paints the strips' frames once).

## C5b (2026-11-19): the outside view's polish, and the place part

The place part of the world (`placeOf`, built once per place) in node, warm (4 builds; the first build of a city cold
~90 / 50 ms for Tel Aviv / Haifa), before → after:

```
  tel-aviv 66 → 30   jerusalem 81 → 40   ramat-gan 77 → 14   haifa 55 → 30   beer-sheva 40 → 22   netanya 27 → 15 ms
```

Where it went (CPU profile of 4 Tel Aviv builds): `dedupeTowers` compared every tower with every kept one (114 ms over 4
builds): now by 15 m buckets, the same answer; `groundFn` scanned the ridge's points per call: now a binary search, the
same answer (shared with the SVG, whose snapshots stay byte-identical); the frame's four quantiles sorted a copy each: one
typed sort per axis; each built cell's ground read once; the towers beyond no longer ask the panorama's projection
(they are in the outside view's own, C5b item 5).

In the browser, worker path, CPU ×4, dpr 2.75 (haifa / tel-aviv / shadmot-mehola; n = 1 per cold step, so noisy):

```
                    before (merged C6+C7)       after (C5b, three runs)
  worldCold         785 / 684 / 262 ms          480–566 / 449–492 / 250   (reported only)
  modelCold         43 / 31 / 24 ms   OVER      42–103 / 38–70 / 25   OVER (budget 10; the outside layer's first shape)
  firstPaint        21 / 28 / 7 ms              36 / 26 / 25
  scrub.model p95   34 / 24 / 19 ms   OVER      18–24 / 24–29 / 13   OVER for the cities
  memory            —                           31 / 27 / 24 MB
```

Reading: the world's cold build is a quarter to a third shorter; the model's cold and scrub steps are as before within
the noise (the sky's light on the mass adds three tones per haze tier, from the tier tones already made). Not done: the
place part is still built on the main thread on the first paint's path (its inputs, the land cover, the city raster,
the water mask and the boundaries, live there); moving `placeOf` into a worker, or building it when its own inputs
arrive rather than with the first forecast, is the next step.

## C8 (2026-11-19): loading as an animation

`npm run test:perf` (CPU ×4, dpr 2.75, software raster, worker path), after the C5b merge. The new rows measure, per place,
the harness's `land=loading` page (6 s with motion: the mist drifting, the line forming, the sky's clouds) and its
`land=arrive` page (2.5 s from the reveal's start: the land's layers fading up, the mist thinning, the crest drawn, the
sky gliding), each frame the sky's and the land's loops summed:

```
                  loading: world / model / first paint, frame p50 / p95     arrive: frame p50 / p95
  haifa           54.3 / 25.6 / 21.6 ms, 0.50 / 2.00 ms                     0.80 / 2.10 ms
  tel-aviv        43.9 / 42.5 / 23.2 ms, 0.60 / 1.80 ms                     0.70 / 2.30 ms
  shadmot-mehola  48.1 / 24.4 / 23.7 ms, 0.60 / 2.10 ms                     0.70 / 2.10 ms
```

Within the 4 ms animated-frame budget: every motion of the arrival is laid at composite time (alpha, a window of a
cached canvas in up to 11 blits, a whole-pixel offset), nothing repainted per frame. The loading world is a tenth of the
known one (no place part, no far towns); the loading model is mostly the sky's cold model. The rest of the run as at C5b
(cold and scrub model OVER for the cities, C5's and C6's).


## C9 review pack (2026-11-19): towers beyond seen from the eye, haze along a crest, snow on the place's ground

`node e2e/scene.perf.mjs --place=haifa,tel-aviv,rosh-pina,tiberias` (CPU ×4, dpr 2.75, software raster, worker path):

```
                  modelCold   scrub.model p95   firstPaint   anim frame p50 / p95   memory
  haifa           45.1 ms     17.9 ms           —            —                      —
  tel-aviv        42.5        23.6              —            1.40 / 2.90            32.7 MB (thunder)
  rosh-pina       38.5        15.8              25.3         1.50 / 3.30            25.5 MB
  tiberias        30.5        15.8              23.1         1.40 / 2.80            26.2 MB
```

(Haifa's and Tel Aviv's other rows fell off the captured output.) Within C5b's and C8's ranges: the visibility test of a
tower beyond is one `seenAt` a tower in the world's place part; `hazeAlong` is linear in the crest's points. The OVERs
are C5's and C6's (cold model, scrub model for the cities and now Rosh Pina and Tiberias at ~1.05×, within the noise).

## C9 defects (2026-11-19): the mass against the light, the towns beyond, water names, rays

`npm run test:perf` (all places) and `node e2e/scene.perf.mjs --place=haifa,tel-aviv,ramat-gan` (CPU ×4, dpr 2.75, software
raster, worker path), n = 1 for the cold rows:

```
                  worldCold   modelCold   scrub.model p95   firstPaint   anim frame p50 / p95   memory
  haifa           555–601 ms  59–80 ms    16.6–20.6 ms      31.1 ms      1.40 / 3.00 ms         30.7 MB
  tel-aviv        515         42–57       15.6–20.4         24.7         1.50 / 3.10            26.6
  ramat-gan       476         54          14.7              26.8         1.50 / 3.00            23.6
  shadmot-mehola  221         24          13.0              21.1         1.00 / 2.50            24.4
```

The world's cold build is up by ~10 % for the cities (the towns beyond: one `seenAt` per raster square within 6 km of the
place, outside it; Ramat Gan keeps 891 of them), modelCold within the pack's noise (one cold sample: 45 → 59 / 80 ms for
Haifa over two runs). The rays are four small cached sky layers (a scrub repaints those that change: `rays`, `rays.ridge`,
`rays.anti`, `rays.corona`, `bodies.aureole`, `bodies.sun.over`); the animated frame stays within its 4 ms budget, memory
under 48 MB. The OVERs are C5's and C6's (cold model, the cities' scrub model), as before.

## C9 switch (2026-11-19): canvas the default, the old code gone, rays in fog

`npm run test:perf` (all places; CPU ×4, dpr 2.75, software raster, worker path), n = 1 for the cold rows:

```
                  worldCold   modelCold   scrub.model p95   firstPaint   anim frame p50 / p95   memory
  haifa           467 ms      52 ms       21.9 ms           26.3 ms      1.30 / 2.50 ms         30.7 MB
  tel-aviv        457         48          14.8              24.7         1.40 / 2.80            26.6
  shadmot-mehola  228         26          11.4              23.3         0.50 / 1.90            24.4
  loading (3 places)   world 37–38 ms, model 18–22, first paint 19–24, frame p95 1.1–1.5 ms
```

Within the defects run's noise (one cold sample each; Haifa's cold world came out lower, 467 against 555–601, not
attributed; the rays' fog term is one exp per world). OVERs: Haifa, Tel Aviv and Shadmot modelCold, Haifa's scrub.model p95, C5's and C6's as before.

The built app, first paint (`vite preview`, Haifa 12:00, CPU ×4, dpr 2.75, median of 5 warm loads): FCP 276 → 264 ms; the
scene's figure on screen 1 707 → 1 293 ms; JS fetched by the default page 201 → 267 kB (transfer). Bundle before / after
in CANVAS-SCENE-PLAN.md §6 ("C9, the switch").

## C10 (2026-11-20): sky life and optics

`npm run test:perf` (all places; CPU ×4, dpr 2.75, software raster, worker path), n = 1 for the cold rows; then
`--place=haifa,tel-aviv` twice more:

```
                  worldCold   modelCold    scrub.model p50 / p95   firstPaint   anim frame p50 / p95   memory
  haifa           555 ms      67–79 ms     11.5–12.0 / 23–28 ms    23–32 ms     1.2–1.8 / 3.1–5.4 ms   31.3 MB
  tel-aviv        510         51–71        9.7–11.7 / 18–28        28–31        0.5–1.4 / 3.2–4.6      27.6
  shadmot-mehola  263         32–41        8.3–8.9 / 19–21         25           1.0 / 2.9–3.4          24.9
```

The new layers: the sky's life (birds and their strips, aircraft, contrails, twinkling stars, planets, meteors, the Milky
Way, the bows). A first cut cost the scrub model ~+40 ms at Haifa (the land's crest and profile sampled per layer through
the skyline's polylines, contrails sampled every 1 km over hundreds of km); now the crest is rasterised once per world and
box and the land profile cached by the land layers' keys, contrails every 3 km over at most 20 min of flight: the scrub
model is a few ms over C9's run (within its noise for Haifa, +3–10 ms p95 for Tel Aviv and Shadmot), modelCold +15–20 ms.
The sky's worker batch grows at an hour's change (new flocks' strips, ≤ 30 frames); the animated frame stays within its
4 ms budget at p95 in most runs (one Haifa run 5.4 ms, the next 3.1). Memory unchanged.

## C10 fixes (2026-11-20): halo, contrails, Milky Way, rainbow in the sky's tangent frame

`npm run test:perf` (all places; CPU ×4, dpr 2.75, software raster, worker path), against `2d35366` (the same code
without the fixes) run in the same container just before:

```
                  scrub.model p50 / p95       modelCold        firstPaint     anim frame p50 / p95
                  before      after (2 runs)  before  after    before after   before     after
  haifa           12.3 / 24.5 12.1–13.4 / 27–32  71   92–117   34     33–39   2.0 / 4.3  0.4–1.6 / 3.1–3.4
  tel-aviv        10.6 / 25.7 11.0–11.7 / 22–24  65   66–85    34     41–56   1.8 / 4.3  1.2–1.8 / 3.9–4.1
  shadmot-mehola   9.9 / 18.8  8.8–9.8 / 20–24   25   36–51    16     23–31   1.0 / 3.6  1.3 / 3.1–3.3
```

Within the run-to-run noise (the same code at `54702fe` gave Haifa scrub.model p50 10.9–11.3, modelCold 64–115 over
three runs). Unthrottled in node, the contrail model is cheaper than before (0.05 vs 0.09 ms a call over a day's scrub at
Haifa and Tel Aviv); the halo, rainbow and Milky Way models stay under 0.01 ms. Memory unchanged.
