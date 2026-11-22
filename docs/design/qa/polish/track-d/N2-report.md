# N2 field integration

## Part A

- A1 uses Boolean-model effective optical depth beyond the raster and blends transmission through the fade. The near test now checks index completeness at 1e-12. The annulus tests compare exact annulus transmission and bound the cached clump interpolation.
- A2 integrates layer column depth over the sunward slant and accepts a ground elevation relative to the eye.
- A3 uses 30–60 minute towers and a 0.4 share ramp. Refit tower knots are [0, 0.0241, 0.0510, 0.1036, 0.1525, 0.2432, 0.3699, 0.4525, 0.5348, 0.6628, 0.7583, 0.8122, 0.8777, 0.98, 1]. Maximum held-out cover error was 0.0273.
- A4 passes the raining level and rate into the field. Ns and Cb have the highest propensity, followed by Cg, then Sc and St drizzle.
- A5–A6 split timing and profiling into their own file, introduced allocation in the reference workload, and added cold timing ratios and seeded slant checks.

## Part B

- B1 marches five curved rays through indexed cloud slabs and applies the unresolved patch gap once per intersected cell.
- B2 computes separate eye and open-deck land light for sun and moon, plus the independent diffuse share.
- B3 sweeps field footprints, locates their intersections with the terrain relative to eye height, and filters projected rim samples through terrain visibility.
- B4 ranks the raining lattice by optical depth times area, towers first, with an area-integrated smoothstep. Shafts carry the trail endpoint, footprint, virga fraction, and eye overlap. Distant Cb candidates come from the tower cell list because cellAt only covers the raster.
- B5 reuses forecast steering and seeded sites and takes a snapshot at the shown minute. No extra clock is introduced.

## Measurements and checks

- The final local ratio-mode run recorded 10.196 ms cold scrub (ratio 1.987), 1.848 ms warm scrub (ratio 0.371), and 0.820 ms forecast arrival. The guard uses the first calibration run margins, with caps of 2.42 cold and 0.59 warm. CI should verify the absolute budgets.
- Tower continuity recorded 0.094305 maximum share change, 0.040972 steady, 0.008564 largest new share, and 5.74e-14 km motion residual. The theoretical fixed-cover transition bound is 0.1213.
- The final density run measured 0.02064 maximum far transmission error and 0.01353 maximum fade error over two low-cover cases. Cached clump error was 0.005775 against a 0.01172 curvature bound. The density check now measures index completeness and uses a 1e-12 bound.
- `continuity.test.ts` and `calibration.test-helper.ts` use the real tower period and share width. `density.test.ts` covers annulus and fade, clump interpolant, index completeness, and slant optical depth. `density.perf.test.ts` preserves the scrub profile and times allocated reference work. `transmit.test.ts`, `rain.test.ts`, and `cloudShadows.test.ts` check seeded disc transmission, shaft area and overlap, and emitted shadow offsets. The tile-only case in `livingLight.test.ts` now asserts per-cell placement and cache reuse. Its cast continuity check accounts for the physical disc attenuation term using the 0.55 coefficient in the opacity formula.
- The first `world.test.ts` and `planes.test.ts` runs passed all 34 and 38 tests, respectively. The first `livingLight.test.ts` run found cast-strength minute changes of 0.267, 0.361 and 0.220 against its 0.05 bound. The field-driven eye can attenuate in one minute as a cloud crosses the disc, and the glyph consumer uses softness to change cast opacity. After updating those expectations, 12 of 13 tests passed. Jerusalem cloth backlight moved 0.058125 at 13:00 against a 0.05 limit. Life continuity was stopped after more than four minutes with no completed result.

- The emitted shadow centre had 0 m error on the seeded constant-height terrain at 5°, 20°, 45° and 70°, at ground heights −0.3 km and +0.25 km relative to the eye. The separate density tests checked low transmission at the midpoint and zero slant depth 3R to the side.
- The isolated low-layer five-ray case averaged 0.111 ms. Single observed shadow-model calls ranged from 0.30 ms to 4.22 ms in the final local run. The shadow budget remains open. Absolute CI guards measure disc transmission and median shadow work.
- The final focused disc, rain, shadow geometry, density, density timing, and optics-rule checks all passed in separate niced runs.

## Open work

- The full world and scene-model regression sweep was not run locally. TypeScript, lint, and whitespace checks passed, with an existing lint warning in scripts/city/geometry.ts.

- The existing sky model reads the cover-only estimate for the disc, glows, and cloud-edge backlight. Wiring these consumers to the eye value requires changes outside the brief's edit list. The rim and shadow softness use the new eye value.
- The existing shadow painter consumes cached ellipses. Their placement and dimensions come from the visible projected polygon's bounds, with the aspect quantized to about 6.1%. Rendering the polygon itself requires a painter change. Individual shadow enumeration is capped to the field far ranges to keep grazing angles bounded.
- The existing precipitation painter still renders its bank-based shaft shape. The adapter uses the field's bank IDs and uses footprint membership for the near-rain gate. Showing continuous parabolic trails and virga requires the renderer to consume the shaft endpoint, base, and virga fields.
- The 97% drawn-coverage agreement and the full-model 10 ms target are unverified. N3's field-cell emission and the CI performance job are needed to validate those across actual drawn cells.

## Round 2

- Shadows read snapshot cells. The model culls them by opacity, range and view before DEM work, ranks them by projected distance, and projects up to 64. Projection subtracts eye elevation and memoizes identical cell geometry against the same DEM and camera.
- Gap light uses the combined cover exponent. Mean cloud transmission is exposed as `light.clear`. Glare, the sun veil and above-cloud light use mean transmission. Glitter and rainbow strength use the source-specific illuminance after mean transmission.
- Eye transmission intersects the tapered cell volume, retaining the five disc rays and unresolved-patch gap rule. The fine-column comparison and continuity checks quantify the result.
- Rain keeps the drawn cloud banks intact. Shaft descriptors use the separate rain adapter, precipitation ranking rejects zero-weight clouds, and shaft depth uses the local DEM at the displaced foot.
- `shadowTau` includes the beam diffraction factor. Its layer-mean height displacement bound is documented alongside the implementation.
- The placed-land comparison excludes cloud shadows. The living-light beam exemption remains in place.

- The moon regression checks both mean moonlight and beam dimming through thin cirrostratus. The disc model also uses the mean cloud transmission for opacity.
- Far-field ensemble checks cover the tower, mid, high and low overcast cases as well as sparse and broken low cloud.
- The raw panorama's `SceneTerrain.groundAt` reports metres relative to the eye. `TerrainPlanes` converts that value to sea-level metres for the shadow model. The rain builder uses the native relative datum or converts the local DEM's absolute heights. Where neither DEM covers the foot, it falls back to forecast elevation.

### Round 2 test changes

- `cloudShadows.test.ts` checks above- and below-eye slopes with a 720 m eye, the previous-frame projection memo, terrain-query reduction and the opt-in 1 ms budget.
- `transmit.test.ts` checks seeded disc extinction, the 20 m reference column march and the six-second beam sweep. Refining the steepest six-second interval checks that the beam change resolves with shorter steps.
- `density.test.ts` checks the expanded far-field ensembles and expects beam optical depth directly from `shadowTau`.
- `light.test.ts` checks moonlight through cirrostratus. `rain.test.ts` checks weighted rank and eligible precipitation area. `world.test.ts` checks shaft IDs and azimuths against the separate adapter and verifies that the original drawn banks remain present.
- `weather.test.ts` checks shaft placement against the adapter, exercises an explicitly out-of-view shaft, and reuses one forecast per place. The model integration in `weather.ts` is necessary because it previously joined precipitation IDs directly to the painted bank list.
- `livingLight.test.ts` checks motion on an open slope and reuses one forecast while scrubbing. `model.test.ts` excludes the separately placed cloud shadows in the land-only comparison. `planes.test.ts` explicitly selects clear skies for the floor-shadow geometry check so a closed deck does not remove its test beam.

### Round 2 measurements

- The brief measured 300–900 ms of old shadow work per scene model and 41,000–108,000 terrain calls. The ranked snapshot pass measured about 998 ground queries in the moving open-slope fixture, or 2.43% of the old minimum. After the allocation and opacity-culling cleanup, the synthetic median was 0.774 ms against a 1.729 ms query reference (0.447×). The warm open-slope scene model measured 13.981 ms and a new-minute shadow call measured 1.661 ms. These timings do not establish the 1 ms real-DEM shadow target. A preliminary recorded-panorama sample measured 59.995 ms for the shadow pass under concurrent suite load.
- The largest error against 20 m columns was 0.015961 (`T_code=0.187676`, `T_fine=0.171715`). Showers measured 0.009263 (0.091246 vs 0.081983), and thunder 0.008260 (0.055863 vs 0.047603). The six-second sweep changed by at most 0.630895, with the steepest interval changing by at most 0.274500 at 0.6 s steps.
- The far-field maximum absolute mean-transmission errors were 0.020638 for broken low cloud, 0.009693 for tower, 0.012813 for mid, 0.007462 for high, and 0.00000687 for low overcast. The sloping shadow centre error was below 10 m in all seeded cases.
- The second full world and model run passed 675 of 681 tests. Three failures were in shadow and plane fixtures that were under revision, and the three life hand-off cases hit their 30 s deadlines. The revised fixtures and unchanged C9 glare tests passed the subsequent focused run. In an isolated life-continuity run, three cases passed and Shadmot Mehola took 30.877 seconds against its 30-second deadline. Unchanged C10 rainbow tests passed. No absolute perf or Playwright job was run locally.

- Final serial sweep (`--maxWorkers=1 --hookTimeout=60000`) passed 680 of 681 tests across 49 files. Shadmot Mehola's life hand-off case took 33.274 seconds against its explicit 30-second limit and reported no assertion failure. That test and its life implementation retain their original code. The moving open-slope ratio guard passed in the same run (1.198 ms vs 2.330 ms reference, 0.514×). The synthetic median varied from 0.774 to 1.198 ms across the two final runs, so the absolute budget is still open.
- TypeScript, oxlint and `git diff --check` passed. The existing control-regex warning in `scripts/city/geometry.ts` remains. The local `npx` shim pointed to a missing npm CLI, so verification used the installed executables directly.

## Round 3

- Restored eye-relative metres at the terrain-plane boundary so the recorded faces and contours use their original datum.
- Shadows project in east/north kilometres over the memoized flight terrain. The centre is checked for foreground occlusion before distance ranking. Visible rim samples use the land's apparent-angle and relief mapping. Removed the frame projection memo and the unused terrain-plane visibility adapter.
- Rain shaft feet use the same height field, converting sea-level metres to eye-relative kilometres and falling back to forecast elevation outside the sampled terrain.
- The synthetic shadow tests retain the slant and datum assertions. The living-light integration case uses the recorded slope. The recorded-panorama test measures new-minute frames, checks the 13:00 Jerusalem shadows and near-slope placement, and guards the shadow cost by default with optional absolute budgets.

The recorded-panorama test used the November 17 fixture at 13:00 with broken showers, 70% low cover, and 50% mid cover. Timings are medians of 16 distinct minutes after eight warm-up minutes. Face counts count near/far points. The before counts replay the reverted datum conversion on the same terrain planes.

| Place | Shadow ms | Scene model ms (measured first) | Model without shadow field ms (measured second) | Panorama reference ms | 13:00 blobs | Before faces | After faces | Sampled grid error |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Jerusalem | 1.55 | 29.96 | 7.58 | 19.24 | 12 | 0/0 | 1585/27 | 0.0092 m |
| Haifa | 1.91 | 11.42 | 9.75 | 15.39 | 44 | 0/23 | 1747/100 | 0.0038 m |
| Tiberias | 1.00 | 6.43 | 5.25 | 12.11 | 23 | 1882/231 | 1107/446 | 0.0060 m |

The model columns have an order bias. The field run paid first-call per-world colour and key work, particularly in Jerusalem. The paired model increments are reported in Round 4.

- The recorded grid probe compares midpoints with the panorama sampler. It measures interpolation disagreement on the stored data. Sub-grid error against the original elevation data is unverified.
- Jerusalem has 12 visible shadow blobs in the broken-showers fixture, including near-slope centres. The original 45% low and 30% mid non-showery fixture yielded six blobs during development. The recorded regression explicitly uses the showery case to exercise the convective lattice as well as low and mid cells.
- The three default runtime ratios passed at 0.080, 0.124 and 0.082 of the panorama reference. Local timing varied between runs. The measured absolute targets were missed in Jerusalem and Haifa. The opt-in assertions remain at 1 ms for shadows and 10 ms for the scene model.
- Changed tests are `cloudShadows.test.ts`, which keeps the four slant geometry cases, `livingLight.test.ts`, which checks shadow movement on recorded land, and `cloudShadowPanorama.test.ts`, which adds the recorded-grid comparison, face and contour regression, near-slope assertion, and timing guards.
- The combined world and scene-model sweep and the opt-in performance run remain for cloud verification under the local testing limit.
- The niced focused runs passed four shadow geometry cases, three recorded-panorama cases, the living-light shadow-motion case, and nine world rain cases. All four unchanged life-continuity cases passed in isolation. Shadmot Mehola finished in 9.48 s against its 30 s timeout.
- TypeScript and whitespace checks passed. Oxlint passed with the existing control-regex warning in `scripts/city/geometry.ts`.

## Round 4

- Shadow candidates are ranked by squared distance after displacement to eye level. The pass solves terrain projection and checks visibility in that order until 64 drawable blobs are accepted, then sorts the accepted blobs by actual distance for drawing. The terrain projection's 10 m residual bounds the error of each proxy distance by `abs(groundM - eyeM) × cot(sun altitude) / 1000 + 0.01 km`. A pair can switch order only when the gap between their proxy distances is within the sum of their bounds.
- The panorama guard shares the allocating CPU reference with the density test. It brackets each shadow sample with reference samples and discards the first eight minutes. For the model increment, each variant has a first call on the same selected-minute frame, then the timed warm calls reverse order. The starting order alternates by minute. The increment is the median of the within-minute differences. The final comparator empties the snapshot and retains the field's optical layers so both variants light the same sky. The absolute shadow and scene-model checks remain opt-in.
- Density keeps its existing budgets. The cold test now brackets each sample with the reference, as the warm test does. Cell visits skip lifecycle evaluation when even its minimum contribution would give zero share. Far strips reuse their fixed seeded-field query centres before applying the current wind offset.

| Recorded place | Shadow ms | Preliminary paired field increment ms | First-call overhead ms | CPU reference ms | Shadow/reference |
|---|---:|---:|---:|---:|---:|
| Jerusalem | 4.698 | 3.150 | 3.787 | 12.424 | 0.340 |
| Haifa | 4.496 | 6.072 | 6.786 | 9.968 | 0.424 |
| Tiberias | 4.434 | 5.515 | 4.668 | 8.989 | 0.372 |

The niced local panorama run measured above 1 ms for shadows and above 2 ms for the preliminary field increment. The preliminary comparator removed the whole field and included differences in sky shading. The shadow-only comparator still needs measurement. Multiplying the largest observed ratio by 1.5 would yield 0.636 and admit several milliseconds at the observed reference speed. The provisional 0.20 limit comes from the roughly 5 ms Round 1 CPU reference and still needs calibration against a run meeting the absolute targets.

| Reported failure | Finding and change |
|---|---|
| Cold density budget | Reproduced in a single-worker run as a ratio assertion, 2.749 against 2.42. The original sampled the work and reference in separate blocks. The final guard pairs their timings and retains the threshold. |
| Warm density budget | Reproduced in the same run as a ratio assertion, 0.692 against 0.59, with an 8.239 ms median scrub. The guard already paired timings. The two field optimizations above reduce work on the scrub path. |
| Planes | The lighting scan rebuilt a forecast at each hour. It now varies the selected hour on one input per place. |
| 22° ring | The halo scan rebuilt a forecast at each moment. It now varies the selected moment on one input per place. |
| Sea glitter | The all-place scan reused its builder while rebuilding the forecast at each hour. The scan now reuses both per place. |
| Trails | The straightness scan rebuilt forecasts for each hour and forced scenario. It now reuses the forecast and groups hours by scenario. |
| Flocks | The front-of-land scan rebuilt forecasts at each hour. It now reuses one input per place and passed in a niced single-thread run. |
| Haifa hand-off | Already reused its forecast. The 960-minute scan now uses the production moving-layer path directly after the initial full-model sample. |
| Tel Aviv hand-off | Same 960-minute full-model cost and change as Haifa. |
| Mist before data | The status and weather combinations rebuilt the same forecasts. They now reuse one forecast and group sample hours by weather and terrain status. |
| Rain from banks | Already reused its forecast. Alternating weather scenarios from one hour to the next invalidated world memoization. The test now groups its hours by stable forced weather inputs. |

The fixture costs above were identified by code inspection. The first local run reported a timeout terminating the Vitest fork for `c10.test.ts` and was stopped. The niced single-thread follow-up passed all 30 selected cases across the nine reported routes, including all eight places each for planes, mist and rain. The longest plane, mist and rain cases took 9.27, 9.54 and 21.83 s respectively. The ring took 6.68 s, sea glitter 12.78 s, trails 23.57 s, and the Haifa and Tel Aviv hand-offs 19.55 s and 18.35 s. These runs found no wrong values in the nine routes. The timing of the original parallel failures was not reproduced. The final density changes and the shadow-only comparator still need timing verification.

All four synthetic slope and datum cases passed with one niced Vitest thread. TypeScript build-mode checking and `git diff --check` passed. Oxlint passed with the existing control-regex warning in `scripts/city/geometry.ts`. The timing budgets and test deadlines were kept. The optional flight-terrain split was skipped. The combined world and scene-model run and opt-in performance run require cloud execution under the local testing limits.

## Round 5

### Sunset glint

At Tel Aviv on 2026-11-17 at 16:30, `light.clear` was 0.09892, `light.eye` was 9.23e-26, `light.direct` was 0.003197, and the old glint input `light.meanBeam.sun` was 0.002789. Main at 7c50d4f gives `cloudTransmit` = 0.13500 when evaluated on the same covers (low 0.474, mid 0.810, high 0.375). Main gives the fixture's sun a nonzero statistical transmission without tracing the disc. The cloud field makes this particular disc effectively invisible. The coastal glint now consumes the dominant source's eye-ray beam. The regression asserts suppression for the recorded cloud and retains the original spark-count requirement for a clear sky at the same minute and place.

### Shadow work and layers

The first new minute in each recorded panorama made the following terrain calls. Each solve iteration calls `heightAt` once. The current ellipse uses four support projections per accepted blob and stores no rim points.

| Panorama | Before height / blocked / rim points per blob | After height / blocked / rim points per blob | Local shadow ratio before → after |
| --- | ---: | ---: | ---: |
| Jerusalem | 1364 / 411 / 5.25 | 848 / 293 / 0 | 0.312 → 0.170 |
| Haifa | 1569 / 670 / 6.02 | 740 / 289 / 0 | 0.441 → 0.199 |
| Tiberias | 1376 / 489 / 6.22 | 874 / 294 / 0 | 0.304 → 0.176 |

The centre solver permits six terrain samples and accepts only a horizontal projection-equation residual of at most 10 m. Nonconvergent centres are discarded. The view rejects candidates conservatively from the polar grid's height bounds beyond local-grid reach. Each centre keeps its terrain visibility check. Its ellipse projects the cloud footprint at the centre elevation, trading terrain-following rims for a receiving-plane footprint. No sun-direction memo is used.

The stable compositor identity is `cloudShadow.<plane>`. Each descriptor carries its own blob array with cell ID, projected centre and radii, and alpha. The canvas content key updates with the ellipses. The interim painter draws the ellipses and the receiving-face clipping remains future work.

### Scrub tail

A local 20-minute-sample diagnostic followed the same day and ranked by scene-model elapsed time. All figures are milliseconds at the median-model sample and at the p95-model sample. Field snapshot, eye transmission and rain construction run in world building. Shadows and weather descriptors run in the scene model.

| Place / sample | Model | Snapshot | Eye ray | Shadows | Rain construction | Model weather |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Haifa p50 | 13.86 | 2.14 | 0.59 | 0.68 | 0.006 | 0.58 |
| Haifa p95 | 23.67 | 3.77 | 1.11 | 1.85 | 0.009 | 0.29 |
| Tel Aviv p50 | 11.45 | 0.53 | 0.17 | 0.49 | 0.005 | 0.20 |
| Tel Aviv p95 | 19.09 | 1.00 | 0.38 | 2.15 | 0.006 | 0.19 |

Shadows accounted for 1.17 ms of Haifa's 9.81 ms model increase and 1.66 ms of Tel Aviv's 7.63 ms increase in this sample. A second, noisier trace measured Tel Aviv's cloud descriptor work at 2.42 → 9.48 ms between its median and tail samples. The model now serializes already-quantized cloud-bank key data without a per-value replacer and caches the exact outside item bounds with the existing outside shape (0 px error at 375 px). The browser perf gate and final CI timing remain to be measured in the cloud.

### Verification

The final local panorama run passed the ratio and model-increment gates. Haifa's ratio was 0.1994 against 0.2, so that run showed little margin. The observed median shadow times were 1.13, 1.32 and 1.17 ms for Jerusalem, Haifa and Tiberias. The opt-in 1 ms gate and 60-scrub browser performance job require cloud verification. The existing oxlint warning in scripts/city/geometry.ts is unrelated.

The targeted Vitest files passed individually at low priority: outside, cloudShadows, cloudShadowPanorama, weather, model, world and scene livingLight, and planes. TypeScript build-mode checking, oxlint and git diff --check passed.

## Round 6

- Shadow descriptors carry the receiving crest and the next ridge in front, in land pixels. Both use the same projected crest as the land outline. This preserves the existing shadow draw order. The exposed far strip lies at or below its own crest and above the near crest, where screen y increases downward. The descriptor test checks both boundaries on an ellipse that crosses them. Pixel verification depends on the clipped painter, which is assigned separately.
- The terrain grid builds an occlusion prefix for every adjacent pair of rays. Each prefix entry uses a shared distance and the lower of the two endpoint slopes, so it certifies a blocker for every interpolated bearing in that interval. The pre-cull includes both height extremes, the projection solver's 10 m residual and each possible ray interval. It rejects only when every interval certifies a blocker before the nearest possible centre with slope greater than the maximum possible centre slope. Projections that could use local terrain and other ambiguous cases fall through to the solver.
- Exact repeat inputs reuse the published snapshot and lattice grids. Unique minutes keep separate published buffers so retained worlds remain valid. Single-entry raster bins avoid per-bin array allocation, and forecast-hour lookup data and seeded offsets are reused. The A/B/A test compares serialized cells and sampled optical depths.
- The browser scrub report pairs signed JS heap deltas with frame timestamps and world/model times. Chromium heap readings can be quantized and are only an indicator of GC. The browser job is required for matched before/after browser timings.
- The Tel Aviv test varies eye transmission at fixed scene geometry and retains the forced-clear spark-count check. Footprint projection bounds are documented and layer assembly is in its own module.

### Measurements

The panorama unit test measured 16 new-minute samples after eight warm-up samples. The historical shadow times are from Round 5 and the historical ratios are from CI run 44995756933. Times are in ms.

| Panorama | Shadow p50 before → after | Shadow ratio CI before → local after | World build local p50 / p95 | Model local p50 / p95 |
| --- | ---: | ---: | ---: | ---: |
| Jerusalem | 1.13 → 0.95 | 0.261 → 0.148 | 7.28 / 13.59 | 6.60 / 8.75 |
| Haifa | 1.32 → 0.98 | 0.280 → 0.169 | 6.74 / 14.97 | 6.19 / 8.39 |
| Tiberias | 1.17 → 0.84 | 0.254 → 0.141 | 6.19 / 9.49 | 5.60 / 8.40 |

The shadow ratio passed the existing 0.20 gate in all three locations. Haifa exceeded the requested 0.15 local target, and all three exceeded 0.6 ms. Shadow output matched the same projection with both horizon fast paths disabled on all 72 recorded frames. On the first frame in Jerusalem, Haifa and Tiberias, the full blocker walk fell to 21, 34 and 23 calls respectively.

The warm density scrub measured 1.91 ms and ratio 0.395 against the unchanged 0.59 limit. The prior CI ratio was 0.621. The allocation changes do not yet have measured heap deltas. The brief's Haifa world-build p50 baseline was 5.8–7.9 ms, compared with 2.4–2.7 ms on main. Prior CI model p95 was 20.3 ms in Haifa and 18.6 ms in Tel Aviv. The local unit-test timings above are a different workload. Matched world and model p50/p95 and heap readings still require the CI browser perf job.

All eight requested Vitest files passed individually at low priority. TypeScript build-mode checking, e2e script syntax and the diff whitespace check passed. Oxlint passed with the existing warning in `scripts/city/geometry.ts`.

## Round 7

- The panorama test divides the median shadow time by the median model time with shadow candidates removed. The model variants still alternate measurement order. The shadow ratio limit is 0.30, the model increment limit is 2.5 ms, and the opt-in `FIELD_PERF=1` absolute checks remain in place.
- Density timing gates use 21-sample medians with limits of 15 ms cold, 2.5 ms warm and 3 ms on forecast arrival. The reference ratios are logged for information. The budgets use CI runs 44993185800, 44995756933 and 44997772484.
- The browser harness runs ten unsampled scrub frames before the original 60 measured frames and removes the quantized JavaScript heap-delta report. Browser budgets are unchanged.

Both targeted Vitest files passed individually at low priority (seven tests total). TypeScript build-mode checking, targeted oxlint and the browser harness syntax check passed. The opt-in absolute panorama gates and browser performance run still need cloud verification.

## Round 8 (N3a)

- The sky model emits `cloudSheet.<lattice>` immediately below the corresponding cloud level. Each node inverts the camera and apparent dome projection, intersects the curved-Earth layer at mid-height and reads the existing snapshot’s optical depth. Distant rays use the snapshot’s expected density and fall back to the layer mean beyond its query extent.
- The texture combines seeded, advected world-space scales with an analytical noise quantile. Fine detail loses weight as its footprint grows. Optical depth and the light transmitted from above set the underside tone. The layer’s finite far edge determines the horizon fade. The old deck and wash fade out as sheet weight rises, and the banks still render.
- The model reuses per-place and per-lattice scratch buffers and copies the populated arrays into each descriptor so that later frames cannot change older arrays.

The coverage test sampled 72 time/place combinations in world area using fixed synthetic covers. The continuity and grid checks compare Haifa at 12:00 and 12:01 with 10 km/h surface wind.

| Lattice | Target cover | World-area alpha > 0.5 | Max minute-to-minute alpha change | Minimum alpha for raster τ > 2 | Grid at 375 px |
| --- | ---: | ---: | ---: | ---: | ---: |
| Low | 0.7400 | 0.7660 | 0.07792 | 0.26090 | 48 × 30 |
| Mid | 0.6300 | 0.6491 | 0.05548 | 0.21905 | 48 × 33 |
| High | 0.8100 | 0.8228 | 0.00251 | 0.49281 | 48 × 36 |

The coverage and continuity readings meet the fixture tolerances. Projection round trips, decreasing row gaps and descriptor purity passed. The dense-ray assertion failed on all three lattices. The analytical quantile applies to the noise component. The additive optical-depth term introduces the coverage offsets above, so exact coverage for the combined density remains unverified.

The measured Sc grid has 7.98 px horizontal spacing and a maximum vertical gap of 40.06 px. The nearest grid centre is within 20.43 px, using half the cell diagonal. This bounds the sampling distance. A 1 km lump can disappear where its projection is smaller than a texel, so the sampled grid cannot guarantee a displacement bound for every lump. Rows start from a ground-range step and merge or subdivide intervals to keep the screen spacing monotone. This produces unequal final ground-range intervals. The field has no Cc genus, so only Ac uses the fine-cell profile.

TypeScript build-mode checking, targeted oxlint and the tracked diff whitespace check passed. The new panorama performance test is ready for cloud execution. Scene-model increment in ms and the baseline ratio are unmeasured. The existing targeted suites and the panorama benchmark were deferred under the local unit-test-only rule.

## Round 9 (N3b)

The sheet reads vertical optical depth from the snapshot's density grid within its query radius and uses the same snapshot's expected clump density outside it. The curved-Earth path factor divides the in-layer chord by `meanVKm`, the field's layer thickness, and caps the chord at the deck edge. Opacity uses the layer's `kappa` and retains N3a's sheet blend, far-edge fade and sun-facing tone. Smooth seeded value noise follows the wind. Each octave fades with its texel footprint, and a correction over the sampled world area preserves both the mean texture and the integral of vertical optical depth.

N1 calibrates geometric occupancy. The fraction of rays above an opacity threshold also depends on the optical depth inside each footprint, the path angle and the layer extinction. The requested sheet equation applies `kappa` to `tauAt`, which already sums optical depths derived from `kappa × thickness`. The light path integrates each cell's slant intersection with a half-depth convention, includes subcell gaps in Ac and Ci, and samples five rays across the solar disc. These differences leave the sheet and direct light without a universal 0.15 per-node bound. Equal area-integrated optical depth alone does not preserve area-integrated transmission because the exponential is nonlinear.

The 72 fixtures used equal-area world samples at normal incidence for the coverage check. The texture and textured-to-original optical-depth means were 1 to floating-point precision on all lattices, and all sampled texture values were nonnegative.

| Lattice | Target cover | World-area alpha > 0.5 | Rows × cols at 375 px | Max row gap (px) | Max alpha change in one minute | Min alpha for τ > 2 above 20° |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Low | 0.7400 | 0.7436 | 44 × 48 | 11.94 | 1.0000 | 1.0000 |
| Mid | 0.6300 | 0.6059 | 46 × 48 | 11.92 | 1.0000 | 0.9501 |
| High | 0.8100 | 0.1134 | 49 × 48 | 11.75 | 0.3416 | No qualifying rays |

The low-cover floor and lit-gap versus shaded-core checks passed. Projection, row compression and descriptor reuse passed. The high lattice failed the coverage tolerance, and all three lattices exceeded the one-minute continuity limit of 0.08. Dense rays passed on the two lattices with qualifying samples. For the same-layer transmission comparison, the test used the normalized cloud term from `light.eye` at a grid-aligned synthetic sun direction near 38°. The maximum observed per-node errors were 0.037 in Jerusalem, 0.148 in Haifa and 0.360 in Tiberias. The Tiberias mid layer exceeded 0.15. Genus-specific texture standard deviations and visual tiling were not measured.

The single targeted panorama timing run exceeded both budgets in all three places.

| Panorama | Baseline ms | Increment ms | Increment / baseline |
| --- | ---: | ---: | ---: |
| Jerusalem | 4.16 | 4.32 | 1.037 |
| Haifa | 4.03 | 4.00 | 0.993 |
| Tiberias | 4.03 | 4.86 | 1.208 |

TypeScript build-mode checking, targeted Oxlint and the tracked diff whitespace check passed. The sheet painter, cloud cover, sky and scene-model files passed. The sheet model had three failed tests out of six. An initial Vitest substring filter also selected unrelated scene-model files and was stopped. The reported unit run used explicit file paths and one low-priority worker. Full suites and browser verification were deferred.

## Round 10 (N3c)

The sheet reads vertical optical depth from the snapshot's `tauAt` and uses `expectedTauAt` from that same snapshot for the footprint average. The extra κ factor is gone. The ray path uses the snapshot layer's `meanVKm` for thickness. The footprint is the larger of the neighbouring radial gaps and the azimuthal column spacing in km. The blend runs from half to twice the lattice's mean radius. This uses the mean of the clipped site-radius distribution times the layer's occupancy radius multiplier `g`, with the major semi-axis for the elliptical high lattice. Individual cells also shrink with their lifecycle share.

The model blends τ for tone and blends transmission for opacity. The snapshot's expected τ is the Boolean model's negative log mean vertical transmission. At unit path and texture multipliers its exponential gives that mean directly. For multiplier `s = slant × texture > 1`, raising the mean transmission to `s` underestimates the mean of transmission to the power `s` by Jensen's inequality, so the expected branch can be too opaque. For `0 < s < 1`, the bias reverses. The raster interpolation between point and expected transmission also avoids the extra opacity of exponentiating the interpolated τ.

| Lattice | Target cover | World-area textured τ > floor + 0.05 | Mean radius (km) | Max Δα below radius | p99 / max Δα at or above radius | Min dense α |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Low | 0.7400 | 0.7427 | 0.7876 | 1.0000 | 0.01729 / 0.02121 | 0.7246 |
| Mid | 0.6300 | 0.6086 | 2.7604 | 0.9835 | 0.00204 / 0.44414 | 0.2436 |
| High | 0.8100 | 0.8125 | 26.0685 | 0.5058 | 0.00000149 / 0.00000183 | No qualifying rays |

Coverage used 72 equal-area fixtures and passed ±0.05 on every lattice. The texture and textured-to-original area-integrated depth ratios were 1 to floating-point precision. The clear ray and lit-gap checks passed. The Haifa 12:00–12:01 comparison passed the 0.15 p99 gate at or above the mean radius. All three lattices failed the 0.08 maximum gate below it, and the mid dense-ray minimum failed 0.70.

For a cell with peak depth τ₀ and radius R along the motion axis, the radial kernel slopes are bounded by 2τ₀/R for cumuliform cells and 4τ₀/R for stratiform cells. With fixed texture, path and fade, the stratiform translation bound on Δα is at most `mix × path × (1 − exp(−4 m texture τ₀ Δx/R))`, with the exponent capped at the peak slant depth. At 10 km/h, Δx = 1/6 km per minute. At full mix and path, the slope bound can certify 0.08 only if `m × texture × τ₀ ≤ 0.1251 R` for stratiform cells. For the mean low radius this requires peak textured slant depth ≤ 0.099. As a concrete check, a stratiform cell of that radius and unit peak slant depth yields Δα ≈ 0.459 when its edge moves 1/6 km directly across a point sampled at the edge. The footprint blend is zero below half a mean radius, so the requested formula permits that change in the fine rows. This translation calculation also excludes lifecycle changes and changes in texture. A universal 0.08 pointwise gate is incompatible with those allowed edge crossings.

The same-layer light comparison uses the snapshot ray integrator that supplies the cloud term in `light.eye`. It samples one aligned node per lattice, so the nearest-rank p95 equals the maximum. The per-node limit is 0.20. The light integrator intersects individual cells with its half-depth convention and accounts for Ac/Ci subcell gaps. For instance, Tiberias mid yields sheet transmission near zero and integrated beam transmission near 0.360 with the prescribed full-depth sheet formula.

| Panorama | Light error max / p95 | Scene-model increment (ms) | Increment / baseline |
| --- | ---: | ---: | ---: |
| Jerusalem | 0.24487 / 0.24487 | Cloud run pending | Cloud run pending |
| Haifa | 0.11967 / 0.11967 | Cloud run pending | Cloud run pending |
| Tiberias | 0.36004 / 0.36004 | Cloud run pending | Cloud run pending |

The sheet skips zero-blend lattices, samples texture only where depth is above the floor or footprint blending is active, drops texture octaves finer than the footprint, reuses seeded noise caches across frames, and hoists direction, lighting, and snapshot sampler work out of the node loops. No local profiling or panorama performance run was performed under the cloud-only benchmark rule. The grid retains the 12 px row cap and 48 columns in the 375 px fixture pending a measured comparison to the 1.5 ms and 0.25 budgets.

TypeScript build-mode checking (no emit), targeted Oxlint and the tracked diff whitespace check passed. The sky and scene-model files passed all 72 tests. They started in separate one-worker, low-priority invocations, but overlapped when the sky command returned a running session. The sheet model passed three of six tests. There is no `clouds.test.ts` in this tree. The panorama benchmark and visual review remain pending.

## Round 11 (N3d)

The original Jerusalem 11:30 broken fixture inherited the recorded layer proportions. Its low and tower cover were zero, mid Ac was 0.350, and high Ci was 0.308. Every lattice had zero sheet weight, blend and alpha. The mid diagnostics sampled a clear column and high vertical optical depth ranged from 0 to 0.140 on the diagnostic rays. The harness now pins the broken fixture to 0.60 low cover. The low sheet uses the stratiform weight and the 0.60 fixture selects Sc at full blend. Equal-area sampling across a 40 km square measured 0.580 world-area coverage.

The sheet shades from two-stream diffuse transmission with transport coefficient `0.75 × (1 − 0.85) = 0.1125`. Above-layer attenuation uses the clear-column reference for the place and hour and averages cloudy and clear paths. The forward component decays by `exp(−τs)`. At full blend, the deck, wash and ordinary banks step aside. Observed cells, convective banks and low horizon heaps are retained.

The eye ray crosses the whole cell. With vertical depth `τ₀ = κv`, integrating through a chord of length `ℓ` yields `∫κ ds = τ₀ℓ/v`. For a vertical centre ray `ℓ = v`, giving `τ₀`. Both exact chord intersections and the reference column quadrature use full depth, including the ensemble and floor terms. The sheet blends the resolved solar chord into the nearest solar texel and retains the projected kernel over the rest of the dome.

The pointwise continuity bound applies the Beer–Lambert slope `exp(−min(τs₁, τs₂))` to each optical-depth difference, averages the bounds for the advected taps and adds changes in the path and footprint weights. The excess allowance is 0.02. The sweep averages transmissions along the wind trajectory. Separate finer texture still controls the diffuse tone. Dense-ray checks now require full path, a resolved footprint and slant depth above 2 across the contributing rays.

Replaying the previous mid-lattice ray at 66.05° reproduced α 0.2436. It had vertical depth 2.2756, full path, zero footprint blend, slant multiplier 1.0941 and texture 0.1121. The thin texture reduced the effective depth to 0.279, which gives α 0.2436 by Beer–Lambert.

At each tested node the continuity change stayed within the bound. The one-minute Δα p99 was 0.1021 low, 0.0909 mid and 0.0452 high. Minimum qualifying dense α was 0.9821, 0.9361 and 0.8683, respectively. The solar-node error against independent 20 m column quadrature was at most 0.000066 in Jerusalem, 0.000208 in Haifa and 0.000041 in Tiberias.

St and Cs use 24 columns and 13 rows, and cellular sheets use 48 columns and 25 rows. Row spacing is compressed toward the horizon. The geometry inverts each row once, identical zenith coordinates are sampled once, and transparent rows skip density and texture work. The model reuses cloud descriptors for the same immutable world and viewport. It rebuilds for a new minute. A five-minute high-sheet hold was omitted because the zenith rays share a point and adjacent near-zenith world texels can be smaller than five minutes of advection.

The shadow baseline retains each lattice and density grid and removes only shadow candidates. The table records local, one-worker low-priority Vitest measurements. The existing warm sheet and shadow gates passed. All three cold sheet increments in the final sheet run were above 1.5 ms.

| Panorama | Sheet warm increment (ms) | Sheet cold increment (ms) | Shadow increment (ms) |
| --- | ---: | ---: | ---: |
| Jerusalem | 0.186 | 2.116 | 1.059 |
| Haifa | 0.068 | 3.223 | 2.240 |
| Tiberias | 0.956 | 2.390 | 0.992 |

Jerusalem Sc had mean α 0.7554, p90 0.999998 and max 1. Its vertical depth min/p10/p50/p90/max was 0 / 0 / 2.401 / 13.675 / 27.391. The remaining Jerusalem lattices had zero cover, blend, α and vertical depth after the fixture change. Haifa retained As at cover 0.999 and Cs at cover 0.992, both at full blend. The As upper-half tone p10–p90 spread was 0.1228, clearing 0.12. The model produced no mid or high legacy bank layer on that overcast fixture.

The visibility, sheet model, field-transmission and both targeted timing files passed locally. The field-transmission check refined disputed ray columns from 5 m to 1 m and its maximum error was below 0.001 for each weather fixture. TypeScript build-mode checking used `--noEmit`. Oxlint reported the existing `sceneHarness.tsx` hook-dependency warning. No local canvas renderer is installed. Browser stills and CI timings remain pending.

## Round 12 (N3e)

Each field uses its local calendar day for the place/day/lattice seed and the zero of its trapezoidal wind integral. If the forecast lacks that midnight, the first forecast sample is the origin. Cumulative wind uses integer nanokilometres so common forecast prefixes subtract exactly. At Shadmot Mehola, forecasts starting November 17 and November 18 produced byte-identical cells in all four lattices at 08:00 and 23:50 on November 18 and 00:10 on November 19. The observed maximum displacement and the bound for these identical winds are both **0 km**.

At midnight, the greedy match orders eligible same-genus pairs by footprint intersection area and breaks ties by cell ID. A pair carries its outgoing ID through the handover and interpolates its footprint, extinction, thickness and rain weight as one cell. For independent Boolean fields with intensities Λ₁ and Λ₂, the union's clear fraction is exp(−Λ₁) exp(−Λ₂). Splitting intensity as (1−w)Λ and wΛ therefore preserves expected cover. The unpaired lifecycle converts each intensity share to a covered-fraction share, `[1 − (1 − cover)^weight] / cover`, for the rank cutoff. Paired cells carry one interpolated footprint, so geometric coverage with pairing was checked directly.

Mean absolute change in vertical τ over the fixed 41 × 41 world grid was **35.79446** over midnight versus **40.88220** over 21:50–22:10 for overcast, and **25.12820** versus **33.59838** for broken cloud. Both figures sum vertical τ across all four lattices before taking the difference.

The paired fraction is the number of incoming sites matched at midnight divided by the incoming occupied sites in the sample square. World-area coverage is measured over a square spanning 48 lattice pitches per side. The three measured columns are in time order.

| Fixture | Lattice | Paired | Target cover | 23:45 | 00:00 | 00:15 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Overcast | Low | 1713/2302 (74.41%) | 0.92857 | 0.93799 | 0.94750 | 0.94127 |
| Overcast | Tower | 1418/2304 (61.55%) | 0.30000 | 0.30516 | 0.31319 | 0.30639 |
| Overcast | Mid | 2039/2305 (88.46%) | 0.95000 | 0.95360 | 0.96698 | 0.95934 |
| Overcast | High | 2041/2299 (88.78%) | 0.95000 | 0.96009 | 0.96684 | 0.95377 |
| Broken | Low | 1067/2302 (46.35%) | 0.35714 | 0.35209 | 0.35836 | 0.35941 |
| Broken | Tower | 1418/2304 (61.55%) | 0.30000 | 0.30516 | 0.31319 | 0.30639 |
| Broken | Mid | 1764/2305 (76.53%) | 0.50000 | 0.48897 | 0.49432 | 0.49638 |
| Broken | High | 1721/2299 (74.86%) | 0.45000 | 0.45261 | 0.45963 | 0.45239 |

The minute-by-minute scrub checks wind-relative displacement and lifecycle share through two midnights. The largest cover error in the table was 0.01893. The four targeted Vitest files passed individually at low priority. The density ensemble samples four local days and retains its original 0.03 tolerance. TypeScript build-mode checking with `--noEmit`, Oxlint on the touched source files and `git diff --check` passed. The CI still strips are pending.

## Round 13 (N3f)

### Jerusalem broken, 11:30, baseline at 884b2af

The three 25 × 48 maps below are the low lattice in screen order. The alphabet `0.:-=+*#%@` runs from low to high. For vertical optical depth each bin is one τ unit. For raw texture each bin is 0.25 and `=` is the neutral multiplier 1. For alpha each bin is 0.1. The final two rows of depth and texture were skipped by the old path cutoff and are marked with question marks.

tau

~~~text
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
##%%%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
-=+*##%%%%%%%##%%%%%%@@@@@@@@@@@@@@@@@@@@@@@@@@@
+#%@@@@@@@@@@@@@%#+--=*%@@@@@@@@@@@@@@@@@@@@@@@@
*%@@@@@@@@@@@@@@@%*=.00:+%@@@@@@@@@@@@@@@@@@@@@@
*%@@@@@@@@@@@@@@@%*-00000:+%@@@@@@@@@@@@@@@@@@@@
+%@@@@@@@@@@@@@@@%@@*000000:*@@@@@@@@@@@@@@@@@@@
-@@@@@@@@@@@@@@@@@@@@@0000000:*@@@@@@@@@@@@@@@@@
%@@@@@@@@@@@@@@@*-@@@.0000000000=@@@@@@@@@@@@@@%
@@@@@@@@@@@@@@%*.000000000000+#%#%@@@@@@@@@%*=00
@@@@@@@@@@@@@*-000000000000+@@@@@@@@@@@@@@-00000
@@@@@@@@@@@@%@@@+000000000:@@@@@@@%.@@@@%00000@@
#@@@@@:#@@@@@@@@@:000000000#@@@@@@%00000000000@@
0:**=000*%@@@@@@@+0000000000%@@@@@=00000%@+00000
.0000.@@.:@@@@@@@000000000=:@@@@@:0000.@@@@@@@00
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
????????????????????????????????????????????????
????????????????????????????????????????????????
~~~

texture

~~~text
::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::--------------
................:::::::::::::::-----------------
000000000000.....::::----::::::::-----==========
000000000000.......::::---:::::---==============
000000.....000......:==---------===+++====----==
0000......000000...::====--------===++====--:---
000.....00000000..:--======-===---=========-----
0000...0000000..::----========-:::-===-=+++=====
0000000000000..:------=========..:--======+***##
000000000000.::--===========..0.::--======+*#%@=
000000000000.:-============..00.:--------++=====
00000000000.:-=+==========--:..:---:::---=====@@
000000.......-+##*=========+====---===========%@
=0000===:::::-+###==========***+========+#@=====
00...::------==+#%@@%#**#%@@@%#+=---=+*#%@@@@@@@
-===========----================================
================================================
================================================
================================================
================================================
================================================
================================================
????????????????????????????????????????????????
????????????????????????????????????????????????
~~~

alpha

~~~text
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@%@@%@@@@@@@@@@@@@@@@@@@@@@
%%@@@@@@@@@@@@@@@@@%%%######%%%@@@@@@@@@@@@@@@@@
*#%@@@@@@@@@@@@@%####******###%%@@@@@@@@@@@@@@@@
*#%@@@@@@@@@@@@%###**+=:---:=+#%@@@@@@@@@@@%%%%%
%#@@@@@@@@@@@@@@@%*-::000.---==+%@@@@@@@@@%###**
@%%@@@@@@@@@@@@@%==00000.:-=++**##@@@@@%%#**+++*
@@@@@@%@@@@@@@@*+-:.000.:-=+*##%%%*####%%#*==-==
%%@@%%#@@@@@@@**+=-.000.:-+*#%@@@%#++*##%#*=-:=-
+###%%%@@%@@@%%#*+-.0000.:=*#@@@@#*=-+#%#%+--=+-
:#++#%%@@#@@@@@%#+-000000.:=+%@%#*+=:-*%%#+==**:
++*-*%%@@#@@@@@@#-.000::-=+**%@%**+-:-*#%##**%*.
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
~~~

Column 24 (zero-based), all rows. Columns are screen y, elevation in degrees, east and north in km, texture detail and sheet path weight.

~~~text
0.000 90.000 0.000 0.000 1.000 1.000
29.281 86.911 -0.004 -0.076 1.000 1.000
56.920 79.437 -0.012 -0.261 1.000 1.000
83.006 72.514 -0.021 -0.442 1.000 1.000
107.629 66.108 -0.029 -0.621 1.000 1.000
130.870 60.187 -0.037 -0.803 1.000 1.000
152.806 54.721 -0.046 -0.992 0.000 1.000
173.511 49.685 -0.055 -1.189 0.000 1.000
193.054 45.055 -0.065 -1.399 0.000 1.000
211.500 40.808 -0.075 -1.623 0.000 1.000
228.911 36.929 -0.087 -1.864 0.000 1.000
245.345 33.401 -0.099 -2.125 0.000 1.000
260.856 30.216 -0.112 -2.406 0.000 1.000
275.497 27.372 -0.126 -2.706 0.000 1.000
289.316 24.884 -0.140 -3.020 0.000 1.000
302.359 22.818 -0.155 -3.330 1.000 1.000
314.671 18.201 -0.198 -4.259 0.157 1.000
326.291 11.489 -0.320 -6.880 0.000 1.000
337.259 7.604 -0.485 -10.444 0.000 1.000
347.612 5.359 -0.687 -14.785 0.000 1.000
357.383 3.826 -0.954 -20.533 0.000 1.000
366.607 2.644 -1.352 -29.111 0.000 1.000
375.312 1.659 -2.040 -43.906 0.000 1.000
383.529 0.793 -3.455 -74.382  0.000
391.284 0.000 -6.702 -144.269  0.000
~~~

### Findings and gates

- **Streaks.** The coordinates are ground-plane intersections (`range × sin/cos(azimuth)`). Between 22.8° and 11.5° the radial step grows from about 0.9 to 2.6 km. The old isotropic footprint treats that radial step as blur across the row, erasing the Sc texture below 18.2°. The swept alpha also omitted the texture and followed only the field’s radially coherent τ structure. Both effects are visible in the grid before the painter receives it. Sc/Ac now have 37 elevation rows, filter the texture at the cross-ray spacing and reserve radial filtering for the resolved-to-ensemble opacity transition. The texture's pooled autocorrelation first reaches 1/e at **34 px horizontally** and **19 px vertically** on the 375 px-wide projected grid below 30°.
- **Edges and continuity.** The Sc/Ac alpha transfer sharpens the texture around its neutral value with the cubic clump kernel’s maximum slope of 3/2 per texel. The gain is bounded to one tap’s weight, and the existing Beer–Lambert continuity check includes the textured slant depth of each tap. The 1-minute p99 alpha deltas for low, mid and high were **0.09103 / 0.09390 / 0.04621**, below 0.15.
- **Overcast.** The Haifa mid deck had 924 nodes with vertical τ ≥ 10. Its minimum alpha over those nodes was **0.9999999999997915**. The thick branch stays on the body-to-shade portion of the ramp. The diffuse slab’s zenith-to-limb endpoints use the two-stream source function proportional to μ + 2/3. The pure-JS paint rounds the texels to 8-bit sRGB, bilinearly interpolates premultiplied values and composites the sheet layers in model order over the sky gradient. The upper-half luminance spread was **0.13756**, clearing 0.06. The existing upper-half mid tone spread was **0.13960**, clearing 0.12.
- **Horizon.** The feature near CSS y ≈ 314 (628 px at 2×) is where resolved variation gives way to a nearly uniform ensemble in the old map. The actual zero-alpha cutoff is farther down, between CSS y = 375.3 and 383.5 (1.66°–0.79°). It came from truncating the slab chord at the low lattice's 50 km panorama range and fading visibility from its upper face to its base there. The sheet now uses the curved chord to eye level, with a six-degree minimum transition to the field's expected depth before entering the lowest 10°. The panorama limit still bounds where that mean is sampled. Maximum adjacent screen-row luminance jumps in the lowest 10° were **0.02074** (Jerusalem broken), **0.01833** (Shadmot Mehola broken), **0.00417** (Haifa overcast) and **0.01182** (Haifa showers).
- **Showers.** Haifa has 0.6 mm/h, six rain cells and six projected banks on the mid layer. Five are in view, at azimuths 132°–283°, elevations 1.8°–5.1° and distances 14.5–39.1 km. The edge mark is reserved for the case where every bank is out of view. The model already emitted shafts and far streaks, but placed them behind the cloud sheet. Both now composite at or above the overlapping sheet as required for rain below its base.
- **Night light.** `placeEnv.glow` estimates artificial light and feeds star visibility. The light model supplies twilight, moonlight and the night palette, and has no source with an artificial-light RGB or direction for illuminating a cloud underside. No orange-grey glow was added.
- **Zero tone.** In the failing direct test, `above` was omitted and defaulted to 1. The contribution that made the ratio effectively exceed the clear reference was the additive forward term: at the sun-facing zenith the old expression subtracts both diffuse transmission and forward light from 1, even as the depth-dependent diffuse loss approaches zero. The new normalisation uses the same incident diffuse flux in the shaded and clear references, so upper-layer transmission cancels. Forward light only reduces the diffuse contrast the column actually creates. At τ = 3 the tone is positive and the clear-floor assertion stays intact. The zero floor comes from `0.5 × smoothstep(0.9, 1, cover)` in occupancy, evaluated at the field's actual low cover of 0.74 before the test copies the layer with cover 0.30. It is independent of the day seed and upper-layer light.

### Verification

The look test uses the still harness’s date, weather overrides, DPR and recorded panorama ground elevations. The three sheet unit files, `sky.test.ts` and `weather.test.ts` passed individually with `nice -n 19`. In `model.test.ts`, 27 of 28 passed. The skyless-land assertion differs on `cloudShadow.far` and reproduced at HEAD 884b2af. TypeScript build-mode checking with `--noEmit`, Oxlint on the touched TypeScript files and `git diff --check` passed. Browser stills and the timing benchmark are left for CI. No painter or field files changed.

## Round 14 (N3g)

### CI regressions

1. **Halo clip.** The day anchor changed the sampled Cs column, but the original 0.75 high-cover input still draws Cs over the Jerusalem sun at 07:15. The sheet opacity there was 0.707 and the direct eye beam was 0.00658. The old `world/optics.ts:116` used the direct eye beam to scale the halo below its 0.05 cutoff. That beam already includes the cloud's extinction (`world/light.ts:125`), so the veil itself could suppress the halo. The scene now gates and scales the halo with the drawn Cs sheet's interpolated opacity at the sun (`scene/model/index.ts:94`, `scene/model/optics.ts:105`). The geometry fixture retains the original forced weather.
2. **Sun dogs.** The same 07:15 gate removed the halo descriptor and its dogs. At 09:30 the original fixture still draws Cs with solar-ray opacity 0.859 and an eye beam of 0.14003. The dogs now share the halo's Cs opacity. The clip, dog level, offset and circle assertions stay intact. A separate case checks a transparent Cs sheet and a high Ci sheet.
3. **Low-cover floor.** The assertion exercises a synthetic column without a day seed. N3f restored the positive contrast at τ = 3 by applying forward scattering to the diffuse contrast generated by the column (`scene/model/cloudSheet.ts:142–148`). The floor alpha and its tone-ordering assertions stay intact.
4. **Haifa overcast.** This recorded fixture exercises a rendered field, so changing the seed changes individual columns. N3f restored the deck contrast with a diffuse slab tone ramp (`scene/model/cloudSheet.ts:149–153`). The upper-sheet p90–p10 contract stays at 0.12.
5. **Skyless land.** Reproduced the fifth CI failure as the `cloudShadow.far` mismatch named by N3f. The renderer generates land shadows independently of the sky box (`scene/model/index.ts:58–65`). The old assertion removed shadows only from the skyless side. The two models now compare all ground layers, with airborne overlays excluded from the full view.

### Midnight strip

Jerusalem broken weather, forced low/mid/high cover 0.6/0/0, 375 CSS px at DPR 2, and the panorama's recorded ground elevation. These are means of the low-sheet grid's normalized tone and alpha. Brightness is the mean sRGB luma obtained by evaluating the painter's tone ramp, before alpha compositing.

| Local time | 884b2af tone / alpha | N3f and N3g tone / alpha | 884b2af luma | N3f luma | N3g luma | Moon altitude | Mean moon beam | 884b2af above / aboveMax |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 23:20 | 0.30470 / 0.53723 | 0.38633 / 0.61548 | 0.35556 | 0.31343 | 0.12872 | +1.807° | 0.000460 | 1 / 1 |
| 23:30 | 0.36176 / 0.64033 | 0.42948 / 0.71690 | 0.31933 | 0.27804 | 0.12544 | −0.175° | 0 | 1 / 1 |
| 23:40 | 0.46031 / 0.74469 | 0.50044 / 0.81726 | 0.12533 | 0.12516 | 0.12516 | −2.167° | 0 | 1 / 1 |
| 23:50 | 0.41685 / 0.72970 | 0.48268 / 0.80225 | 0.12664 | 0.12540 | 0.12540 | −4.169° | 0 | 1 / 1 |

The historical code uses a unit clear-column reference (`884b2af:cloudSheet.ts:155`). With mid and high cover forced to zero, the upper-layer product stays 1 (`884b2af:clouds.ts:298`), and the night forward term is zero. N3f cancels the incident diffuse term against the same column's clear reference. There was no small denominator in this strip.

N3f still dropped 0.12289 luma from 23:32 to 23:33, with tone changing by 0.00823 and alpha by 0.01235. The moon crossed geometric zero around 23:29 and the `moon.up` branch changed at 23:33. The moonlight strength already faded with altitude (`scene/model/clouds.ts:60–62`), but the sheet assigned the full moonlit RGB endpoint whenever that branch existed. The endpoint now blends from ambient cloud body using the moonlight strength times upper-layer transmission (`scene/model/clouds.ts:304–308`). The luma step at 23:33 is 0.00006 after the change. The supplied overcast strip showed continuity, and no overcast-specific adjustment was needed.

The new unit regression checks every adjacent minute from 23:00 through 01:00, including both sides of midnight. Mean tone and mean alpha each use the existing 0.15 per-minute bound. Mean sheet luma also has a 0.03 bound, which catches the original endpoint switch.

### Verification

All 105 tests passed across 11 explicit Vitest file runs, one file at a time at `nice -n 19`. This includes both cloud sheet unit files, the recorded-sheet test (Haifa p90–p10 was 0.13960), the halo and skyless tests, both continuity files, the field tests and the new midnight regression. TypeScript build-mode checking with `--noEmit`, Oxlint on the touched TypeScript files and `git diff --check` passed. The strip was checked with model and tone-ramp measurements. Browser stills and the full CI suite were left for the cloud.

## Round 15 (N3h)

### Diagnosis

The 375 px camera spans 250° and stays at 1.5 px/°. The former 48 columns have 47 intervals of 5.32°. The old 11 samples span ten one-minute intervals, so the swept distance is ten times the snapshot wind speed. The former fixed hand-off starts at 16° and completes at 10°. The historical Sc texture uses 3 and 0.75 km periods. The low lattice pitch is 1.5 km and its clump wavelength is 12 km.

The shared low density raster resolves individual cells to 8.5 km and fades to the ensemble at 10 km. Jerusalem reaches 15.84 km at 5°, so several rows in the requested band already receive ensemble depth from `tauAt` itself. Increasing sheet resolution and removing the fixed elevation fade cannot restore cell variation there. Extending the shared raster is a prerequisite for resolving those rows with the same field as shadows and eye light.

### Ranked changes and gates

1. One centred sample per texel gives zero advection sweep. The test compares stored depth against the same-minute `tauAt` to 1e-9 and applies the single-sample Beer–Lambert continuity bound. Raw one-minute alpha p99 is 1.000 low, 0.979 mid and 0.046 high. Low and mid still exceed the existing 0.15 gate.
2. Sc and Ac use 144 columns and 73 rows, with 49 rows from 5° through 30°. The blend starts once a mean diameter spans fewer than two texels. The sheet retains instantaneous depth and blends transmission toward the ensemble separately. An Sc or Ac grid has at most 10,512 depth queries. The CI-equivalent timing benchmark was reserved for the cloud under the local testing rule.
3. Sc uses 0.4 and 0.2 km tone periods. Ac uses 0.2 and 0.1 km. The mean correction stays in tone and opacity comes from depth. The special azimuth-only edge-texture path was removed.
4. The audited black-to-base shade call was the deck endpoint. Oklab scales its linear RGB by 0.4³ = 0.064. The CIE ramp uses a one-third horizon endpoint and compensates for the painter's sRGB interpolation. Its predicted zenith-to-5° ratio is 2.55, while the Eddington source gives 2.21 at 5°. The closed uniform depth-10 fixture measured 2.553 after painter interpolation and quantization.
5. A refreshed still is needed to judge rims above 30°. The renderer is untouched.
6. The optional wavelength change was skipped. The existing 12 km field wavelength is retained.

### Review cross-checks

The recorded Jerusalem broken fixture gives g = 2.055, base = 1.203 km, depth = 0.400 km and median Sc τ₀ = 15.75. The sampled Sc cell radii are 0.360 / 0.665 / 1.201 km at p10 / p50 / p90. These are fixture sample quantiles and differ from the review's 0.26 / 0.56 / 0.99 km. A 0.665 km radius at the roughly 8 km ray intersection for 10° gives about 9.5° across azimuth and about 1.7° vertically. The old grid has fewer than two columns across that footprint. The broken fixture wind vector is 0.1725 km/min east and −0.0116 km/min north, equivalent to 1.73 km over ten one-minute intervals and a 94°/274° axis. The review's 1.33 km and 106°/286° were not reproduced on this fixture.

On that panorama the dome derivative is 1.45 px/° at 20°, 4.28 at 45°, 4.16 at 50° and 3.65 at 89°. The mid-dome magnification supports the anisotropy diagnosis. The 8–10 px/° near-zenith estimate was not reproduced. The historical still archive was identified in GitHub Actions, but the review's exact 0.50 and 0.037 pixel luminances were not remeasured.

### Verification

Jerusalem's four alpha components have a 4.55 median aspect ratio, above 1.5. Minimum row alpha deviation is zero in both broken fixtures, below 0.08. Their largest adjacent-row sRGB luma jumps in the lowest 10° are 0.088 and 0.105, above 0.03. The recorded Haifa upper-grid tone spread is 0.116, below the 0.12 gate. The synthetic opaque deck passes the painted luminance ratio gate. The exact-depth test passed its 1e-9 assertion and its per-texel Beer–Lambert bound. The midnight mean tone, alpha and luma test passed.

TypeScript build-mode checking with no emit, Oxlint and git diff whitespace checks passed. No commit or deployment was made.

Vitest ran nine explicit files one at a time at nice -n 19. Of 142 tests, 139 passed and three failed on the visual and continuity gates above. The painter, sky, weather, model and c10fixes files passed in full. The performance benchmark and refreshed stills remain for CI.
