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
