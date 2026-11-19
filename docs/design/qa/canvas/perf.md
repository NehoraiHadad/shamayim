# Canvas scene: performance, stage by stage

Budgets and method: `docs/design/CANVAS-SCENE-PLAN.md` §3. Runner: `npm run test:perf` (`e2e/scene.perf.mjs`):
the scene harness (`scene.html`) in the preinstalled headless Chromium, `--disable-gpu` (software raster, so every
raster is counted on the main thread), CPU throttled ×4 (CDP `Emulation.setCPUThrottlingRate`), dpr 2.75, 375 px wide;
a cold load at 06:00, then 60 scrub frames across the day (12 min apart), each a synchronous world + model + paint.
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
