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

| Place | Shadow ms | Scene model ms | Model without shadow field ms | Panorama reference ms | 13:00 blobs | Before faces | After faces | Sampled grid error |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Jerusalem | 1.55 | 29.96 | 7.58 | 19.24 | 12 | 0/0 | 1585/27 | 0.0092 m |
| Haifa | 1.91 | 11.42 | 9.75 | 15.39 | 44 | 0/23 | 1747/100 | 0.0038 m |
| Tiberias | 1.00 | 6.43 | 5.25 | 12.11 | 23 | 1882/231 | 1107/446 | 0.0060 m |

- The recorded grid probe compares midpoints with the panorama sampler. It measures interpolation disagreement on the stored data. Sub-grid error against the original elevation data is unverified.
- Jerusalem has 12 visible shadow blobs in the broken-showers fixture, including near-slope centres. The original 45% low and 30% mid non-showery fixture yielded six blobs during development. The recorded regression explicitly uses the showery case to exercise the convective lattice as well as low and mid cells.
- The three default runtime ratios passed at 0.080, 0.124 and 0.082 of the panorama reference. Local timing varied between runs. The measured absolute targets were missed in Jerusalem and Haifa. The opt-in assertions remain at 1 ms for shadows and 10 ms for the scene model.
- Changed tests are `cloudShadows.test.ts`, which keeps the four slant geometry cases, `livingLight.test.ts`, which checks shadow movement on recorded land, and `cloudShadowPanorama.test.ts`, which adds the recorded-grid comparison, face and contour regression, near-slope assertion, and timing guards.
- The combined world and scene-model sweep and the opt-in performance run remain for cloud verification under the local testing limit.
- The niced focused runs passed four shadow geometry cases, three recorded-panorama cases, the living-light shadow-motion case, and nine world rain cases. All four unchanged life-continuity cases passed in isolation. Shadmot Mehola finished in 9.48 s against its 30 s timeout.
- TypeScript and whitespace checks passed. Oxlint passed with the existing control-regex warning in `scripts/city/geometry.ts`.
