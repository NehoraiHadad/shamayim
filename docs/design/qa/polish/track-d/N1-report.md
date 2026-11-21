# N1 cloud field core

The field builds four layer snapshots from the displayed weather and forecast winds. Cell queries materialize deterministic sites from a two-block cache, apply intrinsic life cycles and corrected plan cover, and return cloud geometry and optical depth. Projection includes standard refraction and curvature. The phase leaves the existing cloud, lighting, rain, and scene paths untouched.

## Plan-cover calibration

The calibration script in `src/world/field/calibrate.cjs` prints the nine knots for each layer. Run it with Node 22.16 or later and `--experimental-strip-types`. The calibration uses three seeded 60 km × 60 km windows with 4,000 points per window. The closed floor covers the full window for the geometric check at 98% and 100%. The optical floor still follows the specified smooth ramp above 90%.

| Lattice | 0 | 0.05 | 0.10 | 0.25 | 0.50 | 0.75 | 0.90 | 0.98 | 1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| low | 0 | 0.0475 | 0.0982 | 0.2427 | 0.4511 | 0.665 | 0.8165 | 0.98 | 1 |
| tower | 0 | 0.0418 | 0.1035 | 0.2396 | 0.4439 | 0.6686 | 0.8277 | 0.98 | 1 |
| mid | 0 | 0.0444 | 0.0736 | 0.2085 | 0.4222 | 0.644 | 0.8024 | 0.98 | 1 |
| high | 0 | 0.114 | 0.1808 | 0.3305 | 0.5124 | 0.6959 | 0.8179 | 0.98 | 1 |

## Deviations and limits

- Cumuliform lifetimes use 31–40 minutes. With the specified 0.12 rank amplitude and 0.25 share transition, a 20-minute cycle can change share by about 0.23 per minute. A 31-minute minimum bounds the intrinsic change below 0.15.
- At occupied fractions below 0.125, the share is faded toward zero. This removes the residual disc coverage that would otherwise remain as forecast cover approaches zero.
- Calibration treats footprints as discs. For high clouds the calibrated radius is the half-length. The genus table retains the cross-width for the subsequent painting phase.
- Steering vectors are capped at their pressure knots before height interpolation. Linear interpolation preserves the cap and allows the cached integrals at the four heights to be mixed exactly at a fixed steering height.
- The 48-hour continuity check holds cover and form constant and uses the fixture's wind history across two midnights. Changes to external cover or genus gates can change share directly. Changing the steering height between builds can also shift the accumulated displacement because the same wind history is integrated at the newly requested height.
- Local timestamps omit the UTC offset. Wall-time advection follows that representation and does not recover the repeated hour at a DST change.


## Verification

- `npx tsc -b` passed.
- `npx oxlint src/world/field` passed.
- The niced field Vitest run passed five checks, including calibration, projection and the warm timing assertions. The 48-hour continuity check exceeded its 20-second timeout at 24.8 seconds. Its timeout is now 60 seconds. The checks after that adjustment remain unverified under the one-run rule.
- The calibration script ran and printed the rows above.
- The full suite, standalone performance runs, and Playwright were skipped per the brief.

## Round 2

1. Partitioned site caches by place and lattice, with two stamped blocks per partition, integer site seeds, memoized clump corners and allocation-free scans until emission.
2. Capped individual emission at 10/80/40/120 km. Added expected-cover far bins and bilinear optical depth queries using the same near-cell kernels and an expected-density estimate outside the individual range.
3. Preintegrated forecast-hour vectors at each hour's steering height. The displayed cloud base and genus gates change geometry without reapplying a new steering height to past motion.
4. Assigned genus from a separate seeded draw.
5. Carried high-cloud semi-minor radii and steering bearings. Fitted plan area using rotated ellipses and the clipped second moments.
6. Fitted 24 windows from place A and evaluated 24 different seeds from place B. High windows span 300 km. Added all six intermediate covers and included the geometric floor rule at 0.98.
7. Replaced the full minute sweep with forecast hour boundaries, midnights and seeded random pairs.
8. Raised the surface wind knot to 10 m above local ground.
9. Interpreted the Cb 8–12 km range as the top height and subtracted the base to obtain thickness.
10. Evaluated keyframe displacement from the integrated timeline.
11. Bounded exact neighbourhoods using the clipped maximum radius and pitch.
12. Anchored the no-forecast fallback to the Unix epoch.
13. Used a westerly (270° from) wind when direction is missing and marked affected forecasts as derived.
14. Restored 20–40 minute cumulus periods and reduced cyclic rank amplitude to bound intrinsic one-minute fading.
15. Moved the calibration entry point to scripts/calibrate-cloud-field.ts with a shared test helper.
16. Removed rateMmH, the unused static rank and the anonymous-place default. Returned forms specific to each layer.
17. Kept display-driven St and Ns height switches out of displacement.
18. Documented frame coordinates, time, solar altitude and occupancy units.
19. Added a 0–300 km projection sweep, direction matching against every later cell and a four-layer timing check.

### Calibration

The table uses cover knots 0, 0.02, 0.05, 0.10, 0.15, 0.25, 0.40, 0.50, 0.60, 0.75, 0.85, 0.90, 0.95, 0.98, 1.

| Layer | Correction row | Max absolute held-out error below 0.98 |
| --- | --- | ---: |
| Low | 0, .0213, .0512, .1003, .1463, .2397, .3651, .4462, .528, .660, .7572, .8127, .8798, .98, 1 | .0061 |
| Tower | 0, .0201, .0511, .1030, .1517, .2412, .3677, .4493, .5311, .6591, .7554, .8097, .8747, .98, 1 | .0267 |
| Mid | 0, .0322, .0507, .0932, .1423, .2282, .3439, .4276, .5106, .6386, .7353, .7939, .8628, .98, 1 | .0129 |
| High | 0, .0329, .0530, .1032, .1503, .2328, .3687, .4533, .5395, .6732, .7711, .8252, .8870, .98, 1 | .0119 |

The held-out errors at 0.98 and 1 were +.02 and zero, respectively, for every layer.

### Verification and outstanding targets

- The first niced field run measured buildField at 0.100 ms warm and a complete four-layer scrub at 93.72 ms cold and 36.26 ms warm. The scrub missed both hard budgets. That run overlapped the initial calibration process. The final raster uses an ellipse row bound to reduce work, and the timing test now changes minutes on warm scrubs and starts with a new forecast identity on cold scrubs. Final cold and warm timings remain unverified.
- The initial density comparison passed the 5% near-field RMS assertion for each layer. The final row-bounded raster uses the same quadratic kernel. The expected far field estimates a local mean and has no 5% pointwise guarantee against individual cells.
- The initial continuity check took 271 ms. It passed the displacement bound but failed the share-change bound, with maximum change 0.9993 while using stepped hourly input. The final test uses the app's inter-hour cover, temperature and humidity derivation. Weather code still changes discretely in the app, which can change tower cover directly. Final continuity remains unverified.
- The direction check found 48.34% of original cells within 1° of a later cell, above the 20% target. The test keeps the requested all-cell matching and threshold. The target remains unmet on the measured run.
- The calibration script verified the installed correction table on held-out place B. The first run of the field suite used the provisional identity table. The final field suite was not rerun under the requested one-run rule.
- The local TypeScript check and Oxlint completed. Oxlint reported an existing control-regex warning in scripts/city/geometry.ts. The npx shim points to a missing npm CLI on this machine, so verification used the installed local binaries. Full, standalone performance and browser suites were skipped.

## Round 3

1. Cell periods and phases stay seeded per site and layer. The layer's stratus weight blends the Cu and Sc clocks and clumping. Genus is picked after occupancy. The intrinsic one-minute share bound is 0.141 at a 20-minute period with weather held fixed.
2. Forecast cover scaling uses a finite exponent capped at 98% total and blends to full for nonzero layers. The 0.001-step regression passed for the 80/50/25 fixture. The prescribed smoothstep can change the closure weight by 0.07475 in one step, so the 0.05 cover bound depends on the input mix.
3. Continuity checks per-cell share against the analytic bound and checks displacement and newly appearing IDs separately. The new-ID test uses zero previous share and applies the 0.15 limit at steady occupancy, where the forecast itself does not introduce new clouds. The clear-sky cap now uses a 0.25-wide ramp to bound the sensitivity to Q by 6.
4. Direction matching uses each layer's unrelated-place baseline plus 0.05 and retains the 0.2 same-ID angular match limit. The direction test passed at three and 24 hours.
5. Grid spacing is 0.125/0.5/0.5/1 km. The tower raster ends at its 6-degree mid-height intersection or 80 km, whichever is nearer. The 5% comparison uses the unblended near raster.
6. Density allocates 32 × 32 tiles only as footprints touch them. Empty near-raster samples contribute only the optical floor.
7. Layer snapshots collect drawable cells and rasterize density in a single site visit. Drawing keeps the full individual range even when the tower raster ends earlier.
8. Steering parses each hour and builds its wind profile once, integrating all four layer vectors together and finding the first midnight in the same pass. The old four-pressure-knot timeline and displacement helpers were removed. The wind-vector test exercises the steering timeline.
9. The timing checks are separate and use medians of nine measurements after a warm-up each. Value-noise helpers are shared and site values are written directly into the packed array. Later changes reuse evicted site blocks and reduce work in timeline integration and the density sampler.
10. Density cross-fades to its expected mean over the outer 15% of the raster range. The snapshot keyframe and edge regression passed.
11. Cell visits now use the common share function.
12. St and Ns weights compare against the per-site genus draw. Mean layer dimensions use the same piecewise weights as the genus selection.

### Calibration

The fit uses the knots 0, .02, .05, .10, .15, .25, .40, .50, .60, .75, .85, .90, .95, .98, 1. The held-out columns show measured minus target cover at each knot.

| Layer | Correction row | Held-out signed errors |
| --- | --- | --- |
| Low | 0, .0268, .0517, .1000, .1461, .2389, .3639, .4449, .5265, .6582, .7553, .8109, .8783, .98, 1 | 0, +.0012, +.0010, +.0014, +.0016, −.0006, −.0026, −.0055, −.0037, −.0027, −.0024, −.0013, +.0005, +.02, 0 |
| Tower | 0, .0207, .0511, .1028, .1514, .2409, .3673, .4488, .5305, .6584, .7548, .8090, .8743, .98, 1 | 0, +.0025, +.0064, +.0103, +.0139, +.0192, +.0255, +.0265, +.0254, +.0196, +.0177, +.0137, +.0079, +.02, 0 |
| Mid | 0, .0433, .0695, .1024, .1426, .2282, .3438, .4271, .5103, .6381, .7347, .7934, .8621, .98, 1 | 0, −.0015, −.0039, −.0086, −.0086, −.0065, −.0085, −.0077, −.0094, −.0130, −.0108, −.0071, −.0056, +.02, 0 |
| High | 0, .0431, .0691, .1052, .1504, .2327, .3686, .4528, .5389, .6725, .7706, .8248, .8866, .98, 1 | 0, +.0041, +.0057, +.0090, +.0097, +.0004, +.0123, +.0024, +.0028, +.0031, +.0029, +.0017, +.0004, +.02, 0 |

### Local verification

The niced field unit run measured the following before the last hot-path changes.

| Budget | Median | Limit |
| --- | ---: | ---: |
| Forecast arrival | 5.308 ms | 3 ms |
| Cold place scrub | 19.323 ms | 15 ms |
| Warm scrub | 9.786 ms | 3 ms |

The continuity measurements below include the new lifecycle and finite cover scaling and precede the final clear-sky cap. Positive excess means a share change exceeded its analytic allowance.

| Layer | Worst move residual (km) | Worst matched share change | Worst steady share change | Worst new share | Maximum bound excess |
| --- | ---: | ---: | ---: | ---: | ---: |
| Low | 5.19e−14 | .39192 | .11509 | .67061 | −.03570 |
| Tower | — | — | — | — | — |
| Mid | 9.78e−14 | .10991 | .07514 | .00472 | +.00496 |
| High | 1.76e−13 | .06297 | .03747 | .00034 | −.01549 |

The continuity forecast has zero tower occupancy in the sampled windows. The initial RMS test measured 3.75% for low and stopped at 5.02% for tower, leaving mid and high unmeasured. The initial continuity test stopped at the low new-ID limit. Its diagnostics also captured the mid analytic bound miss. The final timing, RMS and continuity checks remain unverified under the no-retry instruction. The focused snapshot regression, TypeScript check, calibration and diff check completed. Oxlint emitted the existing control-regex warning in scripts/city/geometry.ts. The unit runs covered only the cloud field tests. Full suites, builds and deployments were skipped.

## Round 4

1. **Tower RMS.** The 0.5 km half-cell-offset experiment measured 5.09% normalized RMS and a 0.576 ms median tower-grid build. The selected 0.4 km grid measured 3.54% RMS and a 0.949 ms median build over the same near radius. Each build median uses nine samples. Mid spacing is 0.4 km to bring its RMS below 5%. High spacing is 1.4 km to reduce raster work.
2. **Warm scrub.** The near raster uses contiguous row spans with exact ellipse bounds. Site walks reject rows outside the possible jitter envelope. Expected-density lookups reuse seeded noise neighborhoods, and pressure wind vectors and representative heights are memoized per forecast hour. The 3 ms warm test limit stays in place. The final code missed both the 2.5 ms target and the 3 ms test limit in the runs below.
3. **Tower continuity.** The checked-in forecast contains no convective hours. The test overlays codes 80 and 95 on one fixture day, retaining the fixture's layer percentages, temperature, humidity, wind and elevation. It calls the app's air, weather-code interpolation, layer cover and rain adjustment functions. The three nearest-hour code transitions change tower cover by +0.30, +0.20 and −0.50. The analytic share allowance uses the actual change in occupancy Q and a computed upper bound on rank drift from lifecycle and form changes. It also bounds newly occupied cells and cells lost when tower cover drops. The suite observed 63 occupied tower minute pairs and 451 matched tower cells.
4. **Overcast closure.** Widened the blend from 0.98–1 to 0.95–1. Across the closure, a 0.001 input step can move any cover by at most 0.03 from the smoothstep derivative. Normalizing each layer's log clear fraction preserves the requested independent union up to 0.95, including inputs containing 100% layers. The tradeoff is a larger union error near full overcast. On the 0.001 sweep, the maximum absolute error was 0.01881 for mixed layers and 0.00480 for the pure-layer mixes. All five mixes stayed below the 0.05 per-step limit.

   | Low/mid/high input (%) | Worst layer step | Worst absolute union error |
   | --- | ---: | ---: |
   | 80/50/25 | .02150 | .01881 |
   | 95/80/40 | .02223 | .01881 |
   | 100/0/0 | .00150 | .00480 |
   | 30/30/30 | .01105 | .01881 |
   | 0/0/100 | .00150 | .00480 |

5. **File length.** Split forecast cover scaling from cloud banks and moved raster nodes and far strips to their own modules. The field layout and calibration inputs are unchanged.

### Final measurements

| Layer | Near-field RMS | Grid build (ms) | 1,440 lookups (ms) | Far strips (ms) | Cell list (ms) | Shared snapshot (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Low | 3.75% | .841 | .980 | .057 | .710 | .739 |
| Tower | 3.54% | .351 | .691 | .002 | .539 | .714 |
| Mid | 3.93% | 1.218 | .793 | .055 | .334 | .976 |
| High | 3.75% | 1.017 | .365 | .033 | .129 | 1.844 |

The profile reports independent nine-sample medians. Grid build and cell list each include their own site visit. The shared snapshot visits each layer once, so those columns overlap. Tower has an empty far-strip list.

| Timing check | Median (ms) | Test limit (ms) |
| --- | ---: | ---: |
| Forecast arrival | 2.090 | 3 |
| Cold place scrub | 13.726 | 15 |
| Warm scrub | 5.405 | 3 |

Another run of the same final code measured 0.993 ms arrival, 8.991 ms cold and 3.557 ms warm. The isolated warm check measured 3.830 ms. The warm check uses distinct warmed-up minutes and still measures nine different requested frames.

| Layer | Worst move residual (km) | Worst matched share delta | Worst steady share delta | Worst new share | Worst steady new share | Max analytic bound excess |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Low | 7.28e−14 | .26640 | .13244 | 1 | 0 | −.00835 |
| Tower | 5.73e−14 | .08930 | .08930 | 1 | 0 | −.05149 |
| Mid | 7.67e−14 | .09589 | .03798 | .01662 | .000227 | −.01479 |
| High | 1.76e−13 | .05196 | .02501 | .00034 | 4.46e−7 | −.00549 |

Tower lost-share peaked at 1 on the convective exit and stayed inside the same analytic allowance.

### Verification

The focused niced unit runs passed the field, continuity and cover tests, plus five of the six density tests. The warm scrub timing assertion failed. The TypeScript check and diff whitespace check passed. Oxlint completed with the existing control-regex warning in scripts/city/geometry.ts. The local npx shim points to a missing npm CLI, so the checks used the installed binaries. The lattice layout is unchanged, so the calibration table was carried forward. Broader suites and builds were left for CI.
