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
