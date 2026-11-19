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
