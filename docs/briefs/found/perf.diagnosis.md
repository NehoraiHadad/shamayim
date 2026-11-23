# perf: PR 11's modelCold +29 % and the thunder canopy's ~900 ms

Compared: base = a92d405f (parent 1 of fcd96b26), head = fcd96b26, fix = head + `perf.patch` (same folder, git diff, 31 model files,
+125/-85, not committed). Scripts and raw outputs: `C:\Users\Nehorai\AppData\Local\Temp\claude\87a0158badd6a3e9\eb85c57c-e289-424e-a563-683b76f4ebde\scratchpad\perf`.
The machine was shared with other agents all along: processes ran at HIGH priority, base/head/fix interleaved. Only ratios and paired
differences count; absolute ms changed up to 3x between sessions.

## Verdicts

| Fault | Verdict | Cost | What to do |
|---|---|---|---|
| modelCold +29 % (haifa) | true; a fifth to a third is a measuring artefact | Chromium dev x4: 1292 -> 1719 (+33 %) | apply `perf.patch`: equal output, recovers part; the rest is real geometry work |
| warm model (per hour, scrub) | true (not asked; found on the way) | Node haifa: 31.0 -> 40.9 ms (+32 %) | `perf.patch`: -3 to -4 ms |
| thunder canopy.near ~900 ms vs 69 | mostly NOT paint: a `--disable-gpu` artefact | real paint + raster ~36-64 ms vs 22-26 ms (GPU path) | no code change; measure it on the GPU path |

## 1. Canopy: the 900 ms is the worker waiting for the main thread

Scene: shadmot-mehola 2026-11-17T12:00 thunder. `canopy.near` = 0 trees, 30 tufts, 1018x141 device px, 10 poses, beam + shade = 20 canvases
(base: one 1018x1410 strip for form, one for light). Per pose head makes 182 fills + 60 strokes, base 91 + 30: exactly twice, small.

Worker job ms summed over all `canopy.near` jobs (Chromium, `e2e/harness.mjs` conditions; 2 runs of each):

| | base | head |
|---|---|---|
| `--disable-gpu` (what every e2e runner uses, harness.mjs:56-61) | 523, 498 | 1401, 1301 (without the cold beam preview: 1015, 910) |
| GPU path (`--use-angle=swiftshader`) | 26, 22 | **64, 36** |

Instrumented job (software path, head): `new OffscreenCanvas` 0.1 ms, `getContext` 0.1, **first draw + pose 25-175 ms**, `transferToImageBitmap`
3 ms x 18 = 50 ms in the final job. Base: `paint` 2.3 ms per chunk, but its first chunk 176-260 ms, spent entirely in the first `clearRect` on
the strip (runBatch) - the same wait, paid once per strip instead of once per canvas.

Proof by a blank-page micro benchmark (`micro.mjs`, `micro2.mjs`; a worker, no app code; main thread idle or running 80 ms tasks):

| `first draw` on 20 new 1018x141 canvases | idle main | busy main |
|---|---|---|
| `--disable-gpu` | 15 ms (0.8 each) | **416-507 ms, max 81-83 each = one main task** |
| same + `willReadFrequently` | - | 677 ms (no help) |
| same, one canvas reused, transferred 20x | 5 ms | 85-335 ms |
| SwiftShader GPU | 1.9 | 2.6 (the first canvas of the worker waits once: 81) |
| real GPU (D3D11) | 2.6 | 2.4 (same single wait) |

So with no GPU context, the first draw on a fresh worker canvas waits for the main thread's running task (a hop for a context that does not
exist; the browser source was not read, the wait length equals the task length). With any GPU context it happens once per worker. At scene start
the main thread runs long tasks under CPU x4, so ~18 fresh canvases cost ~18 partial waits. The wait is latency, not CPU: the worker is asleep, main is not blocked by it.

Refuted (prototyped, reverted): "all deferred raster lands in the last chunk, transfer per chunk". Final job 123/129 ms -> 13/97 ms, but the
sum is unchanged (1015/910 -> 821/1022) and total raster is only ~50 ms software, ~4 ms GPU. Not worth its code.

Recommended, in order:
1. No change to the painter or the queue. In the perf record judge `canopy.near` by the GPU path (`node e2e/scene.perf.mjs --place=shadmot-mehola --gpu`,
   `node e2e/land.perf.mjs --windy --gpu`: the flag exists), or subtract the waits. `PaintResult.ms` (documented as "the worker's time for this part, raster included") includes them.
2. Only if the no-GPU browser must be fast too: one reused canvas per endpoint, each pose taken by `createImageBitmap(canvas)` (does not
   discard the backing; micro benchmark: 1 wait, then 0.7 ms per pose: 65 + 13 ms vs 416-507 busy). It makes `runBatch` async (restart/discard/error paths
   in paintWorkerRun.ts and RemoteQueue change). Cost higher than the gain for real devices; not prototyped in the app.
3. Sharing geometry between beam and shade is already done: `receiverBrush` fills one Path2D on both contexts.
Caution for other readings: worker figures on the software path (`plane.*`, `flash`, `shafts`, `outside`) can contain the same wait on each new canvas.

## 2. modelCold

### Reproduction
| | base | head | |
|---|---|---|---|
| Chromium dev server, CPU x4, haifa 06:00, n 11 | 1292 (1101-1422) | 1719 (1561-1918) | +33 % |
| Node fresh process, haifa 06:00, n 11 | 409.6 | 524.7 | +28 % |
| Node, tel-aviv 12:00, n 7 | 451.6 | 533.2 | +18 % |
| Node warm (per hour model, same inputs), haifa, n 11 | 31.0 | 40.9 | +32 % |
worldCold unchanged (7.5 s both). Node ignores the compile hint; Chromium honours it (next paragraph). Ranges do not overlap in Chromium.

### A third of the dev-server gap is a missing hint, not the model
`vite.config.ts:6-13` says the model files carry `//# allFunctionsCalledOnLoad` for the dev server; `e2e/scene.perf.mjs` measures the dev server
(`startServer`, line 60). Base: 29 of 103 files hinted; head: 34 of 138. PR 11's ~32 new files have none, so V8 compiles their functions one by one on first
call. Hint on every model file: 1719 -> 1557 (-162 ms = 38 % of the gap). PR 11's files only + the earlier lazy ground: 1635 (-84 ms = 20 %).
Production hints the whole CanvasScene chunk: it does not have this part.

### The rest, by function (Node cpu profile, inclusive median deltas, haifa 06:00, base -> head; not additive: nested)
| ms | function | cause |
|---|---|---|
| +81 | `outsideLayer` total | of which: |
| ~+55 | `outsideShape` vs old `shapeOf` | `townGroundKm` 22, `neighbourhood` 11-25 (137,695 pairs checked, 37,930 hits), tiers/behind 8 |
| +11.5 | `buildingFaces` | 65 tiers x palettes = 972 receiver entries (haifa; Jerusalem 612, Rosh Pina 125, Beit Shean 129, Tel Aviv 84, Neve Zohar 44, Shadmot 27, Ein Gedi 27) |
| +13 | `buildingLight` / receivers | first call |
| +7.6 | `refreshLandmarkItems` | |
| +22.4 | `planeGeomOf` | geometry key 6.9, `demAcrossSlope` 6.4, `measuredFaceAt` 5.3 |
| +12.6 | `farCities` | new geometry |
| +6.7 | `canopyTones` | |
| -27 | `crestLightOf` | removed by PR 11 |
Much of it is interpreter + first compile: the same functions take ~10 ms warm. Irradiance per building is **already** memoised per world
(`worldReceivers`, `exposedColors`), so a further memo cannot help: this is why the earlier attempt did nothing.

### Equal-output fix (`perf.patch`)
1. **Compile hint** on PR 11's new model files (one comment line each): consistent with vite.config.ts, dev-server figures only.
2. **`townGroundKm` only when used**: `wallDistance.ts` `wallAir(world, () => number)` returns the identity when `facadeTwilight(sunAlt)` is 0
   (every hour with the sun above 15 deg or below -18 deg); `outside.ts` fills `shape.groundKm ??= townGroundKm(world, view)` once per shape.
   Haifa 12:00 cold: `townGroundKm` 25.0 -> 0 ms; 06:00 unchanged (twilight needs it).
3. **Surface before air** in `buildingLight.ts` + `buildingExposure.ts`: `surfaceFaces(material, tiled, plain, detail)` is built once per
   world; each distance tier only adds its air (`facesThrough(showAt(km))`). Haifa warm, 12 models: `buildingFaces` 96.7 -> 55.5 ms inclusive
   (-3.4 ms per model).
Tried and dropped for no gain: typed-array neighbourhood, numeric nested Maps for the tier index.

### Identity (done on the final patch)
216 / 216 model fingerprints identical to head: sha1 of `JSON.stringify(model)` (typed arrays, Maps, -0, non-finite preserved): 8 places (haifa, jerusalem, tel-aviv,
rosh-pina, shadmot-mehola, ein-gedi, beit-shean, neve-zohar) x 13 cases (06:00, 06:30, 07:00, 10:00, 12:00, 15:30, 16:00, 16:50, 21:00, noon
thunder, noon broken cloud, 15:30 clear, 10:00 gale) x both styles, + haifa 2026-03-15 07/10/12/16 x both styles. The shapes cached across hours of one process are exercised.
`tsc --noEmit -p tsconfig.app.json`: only the pre-existing `geotiff` not-installed error.

### Gain, head -> fix
| | base | head | fix |
|---|---|---|---|
| Node warm, haifa 12 h, n 7 (first session) | - | 43.4 | 40.3 (-7 %) |
| Node warm, haifa, n 7 (second, busier session) | 18.9 | 30.0 | 25.6 |
| Node warm, jerusalem, n 5 | - | 36.4 | 35.1 |
| Node cold, haifa 12:00, n 7 (two sessions) | - / 319 | 607.6 / 419 | 570.8 / 407.7 (-6 %, -3 %) |
| Node cold, jerusalem 12:00, n 5 | - | 610.4 | 572.8 (-6 %) |
| Node cold, tel-aviv 12:00, n 5 | - | 529.5 | 520.3 (-2 %) |
| Node cold, haifa 06:00, n 7 | 298.4 | 403.0 | 394.2 (-2 %, noise) |
| Chromium production build (hinted chunk), x4, 06:00, n 7 | 425 | 751 | 613 |
| Chromium production build, x4, 12:00, n 11 | 1175 | 1925 | 1551 |
The two Chromium build runs were on a heavily loaded machine (worldCold medians 2.9-8.6 s; runs spread 3x): read paired. fix beats head in 13 of 18 paired runs, median ratio 0.82; head vs base paired median
about 1.6x (06:00) and 1.56x (12:00). The regression exists in production too; its size in production is NOT pinned (+29 % to +60 %).

### Not worth its cost
- `neighbourhood` 11-25 ms, `planeGeomOf` 22, `farCities` 13, `canopyTones` 7: each is new geometry, done once per place, and 137k pair tests of it is one pass
  over the buildings. Removing them needs a precomputed per-place bake (or running it in the paint worker): a design decision, not an equal-output tweak.
- The 10 ms `modelCold` gate (scene.perf.mjs:34) already fails at base by far on these places; nothing here reaches it, and no limit was raised.

## Tests (to add with the patch; not written, no suite was run)
1. `wallDistance`: `wallAir` with a sun at 40 deg must not call its ground thunk (fails before: the ground was computed eagerly); at 5 deg it calls it once
   and gives `km + (min(km, ground) - km) * share`.
2. `buildingLight`: for one world and material, faces at 3 distances equal the colours of a fresh world (toEqual); already covered indirectly by the identity above.
3. Optional guard: every file in `src/scene/model/*.ts` that has a runtime export carries the hint as its first line (fails today on 104 files; or state in vite.config that only the chunk counts).

## Risks of the patch
- Cache: `Shape.groundKm` is filled by the first twilight world of that shape, as before it was by the first world (same inputs as `formKey`); the
  fingerprints cover it. `exposedColors` Maps live with the world's receiver set (WeakMap on the world), so no growth across hours.
- `buildingLight.ts` is 165 lines (162 before), over the ~150 guide: `surfaceFaces`/`facesThrough` can move to `buildingFaces.ts` when merged. `outsideShape` edits sit next to lines the town agent may also touch.

## Not proven
- Absolute milliseconds (shared machine); size of the production regression and of the fix in it beyond "about 0.8x, 13 of 18 pairs".
- Real phones: GPU numbers are SwiftShader and desktop D3D11 micro benchmarks, not a handset; the Chromium reason for the wait is inferred from its length and from GPU on/off.
- The original 69 ms / 900 ms record was not re-run with the recorded command; my sums (base 498-523, head ~910-1015 without the preview) reproduce head and not the 69, which likely sampled one strip or one half with no wait.
- No e2e stills, no test suite: the patch touches model code only and is proven equal by fingerprint, not by pixels.
