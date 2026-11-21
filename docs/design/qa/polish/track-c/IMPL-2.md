# Track C implementation 2 — continuous flight review fixes

The measurements use the bundled 2026-11-17 forecast and terrain fixtures for Haifa, Tel Aviv and Shadmot Mehola, sampled every minute from 05:00 to 21:00. The reference scene is 375 × 428 CSS px at DPR 1 and `geom.s = 1`. The baseline was measured on the original code before editing the flight model.

## 1. Edge entrances and fades

Birds, airport movements and airliner heads check all 61 track samples against the viewport using their scaled sprite bounds, heading and opacity. A sample qualifies at alpha ≥ 0.01. Birds and low aircraft also account for the land surface's height. A zero-alpha start uses a base multiplier of 1 and absolute track alphas, so the compositor starts at zero and can fade in. Depth still uses the initial geometric sight line.

| Place | Entrances with an in-view sample before the next rebuild, birds / low / high | Of those, rejected by the old gate | Furthest entering centre inside the edge at the next minute, old gate | Earliest retained sample before rebuild |
| --- | ---: | ---: | ---: | ---: |
| Haifa | 22 / 20 / 6 | 40 | 58.60 px | 54 s |
| Tel Aviv | 17 / 199 / 8 | 220 | 12.53 px | 58 s |
| Shadmot Mehola | 3 / 0 / 13 | 15 | 0 px | 56 s |

The missed counts replay the original gates against the same tracks. The bird replay uses rounded raster bounds and is conservative by under 3 px. All entries in the table are laid in the new model. In the scaled-edge regression, the old zero-alpha product stayed at 0. The new rendered alpha reads 0, 0.2 and 0.4 at 0, 1 and 2 s.

The additional retained tracks exposed a rear azimuth seam crossing in Haifa's airport traffic. A one-minute coordinate subtraction reported a 514.08 px displacement there. The track now interpolates the short arc across the 540 px azimuth span, which puts the reference camera seam 82.5 px outside either edge. In the two-second regression, the old linear interpolation would give x = 321.25 and 53.75 px at 0.5 and 1.5 s. The new values are 456.25 and −81.25 px, both offscreen.

## 2. Life clock on a resting scrub

The old track was clamped after 120 s, giving 0 px/s from then on. The shell now advances the life anchor by whole minutes of monotonic scene time. A late tick keeps its fractional phase relative to the exact boundary. The world applies the offset only to the life schedule, including when it rolls over to a new date. Sky, light and clouds continue to use the shown minute. Reduced motion holds the selected pose.

The Tel Aviv test holds 09:00 selected for 65 real minutes plus 387 ms. Life matches the 10:05 schedule, the displayed environment still matches 09:00, and the fastest tested mover advances 0.291 CSS px in the next second. The anchor key now distinguishes scrub and live mode even when both show the same HH:MM.

## 3. Local contrail scale and the head seam

The registration uses the live head and a point 2 km back along the wind-adjusted emission line. The dome supplies direction, and the angular separation times `tangentScale` supplies length. The reference measurement independently uses a 2 km chord along the aircraft's course. Each range below covers the visible heads in that place.

| Place | Head samples | Old scale (px/km) | Reference (px/km) | New scale (px/km) | Worst new error |
| --- | ---: | ---: | ---: | ---: | ---: |
| Haifa | 21 | 0.245–1.432 | 0.122–3.106 | 0.122–3.106 | 0.108% |
| Tel Aviv | 59 | 0.248–1.334 | 0.126–3.005 | 0.126–3.005 | 0.105% |
| Shadmot Mehola | 34 | 0.309–0.901 | 0.200–1.946 | 0.200–1.946 | 0.090% |

The old scale ranged from 0.328× to 10.097× the paired reference in Haifa, 0.298× to 8.930× in Tel Aviv, and 0.320× to 3.360× in Shadmot Mehola. The new test enforces 5%. The growing trail ends on the same dome path as the aircraft. The off-sample head seam measured 0 px in the fixture sweep, against a 1 px limit.

## 4. Fixed drift reference

The frame origin is the crossing's fixed centre. Changing only the drift reference to that centre, with the new local scale, still left 1.061 px in Haifa. Each dated puff now advances by its own wind displacement in km before projection into that frame. This accounts for perspective across the span of the trail.

| Place | Original rebuild residual | Fixed centre, one drift translation | Fixed centre, per-puff drift | Worst projected drift interpolation error at 30 s |
| --- | ---: | ---: | ---: | ---: |
| Haifa | 1.060 px | 1.061 px | < 0.000001 px | 0.002434 px |
| Tel Aviv | 0.518 px | 0.734 px | < 0.000001 px | 0.001256 px |
| Shadmot Mehola | 0.675 px | 0.697 px | < 0.000001 px | 0.001039 px |

The test enforces ≤ 1 px for visible matched puffs. It compared 11,644 puff pairs at 387 ms into the next minute. The largest measured residual was 5.34 × 10⁻¹³ CSS px. Projected drift is linear between shared minute samples.

## 5. Continuous puff ageing

The old raster held each puff's width and alpha for a minute. The largest old-end alpha step exceeded 0.03 in two places. After correcting the local scale, Tel Aviv's young-end width step also reached 0.632 px. The compositor now draws the timed ribbon directly. Dated emissions age at the current scene phase, and each new tip extends continuously from the last emission to the head. Emissions keep the 20 s grid, retain their seed across windows, and include the actual end of the crossing.

The table reports absolute rebuild steps for matched visible puffs. The young end is up to 180 s old. The old end starts at 55% of the puff lifetime.

| Place | Young width before → after (CSS px) | Young alpha before → after | Old width before → after (CSS px) | Old alpha before → after |
| --- | ---: | ---: | ---: | ---: |
| Haifa | 0.225 → < 0.000001 | 0.00746 → < 0.000001 | 0.160 → < 0.000001 | 0.03983 → < 0.000001 |
| Tel Aviv | 0.292 → < 0.000001 | 0.00932 → 0.000627 | 0.177 → < 0.000001 | 0.04207 → 0.000532 |
| Shadmot Mehola | 0.092 → < 0.000001 | 0.00498 → 0.000430 | 0.076 → < 0.000001 | 0.02093 → 0.000472 |

A normal 30 fps frame changes young width by at most 0.000429 px and alpha by 0.00000519. The old-end maxima are 0.000394 px and 0.0000234. The residual rebuild alpha follows the minute's lighting and haze. Line style averages the two endpoints of each emission interval. Width uses the local apparent span, with the retained 1.4 legibility multiplier and 0.6–10 px clamp.

## 6. Interpolated handoff and terrain depth

The baseline assertion compared at exactly 60 s and logged 0 px for all mover types. A separate baseline probe at 60.387 s found at most 6.36 × 10⁻¹⁴ CSS px for matching aircraft and birds. The replacement test builds the next model with `sinceS = 0.387` and samples the preceding frame 1/30 s earlier. It compares the crossing of the rebuild against that frame's own motion, with 0.00000001 px of numerical tolerance. At the midpoint of the first 2 s interval of each visible cruise track, the worst error against direct projection was 0.01328 CSS px.

| Layer | Matched pairs | Worst handoff displacement (CSS px) | Worst preceding 30 fps motion (CSS px) | Worst handoff scale error |
| --- | ---: | ---: | ---: | ---: |
| Birds | 2,753 | 6.36 × 10⁻¹⁴ | 0.02836 | 4.45 × 10⁻¹⁴% |
| Low aircraft | 3,128 | 5.70 × 10⁻¹⁴ | 0.06266 | 2.23 × 10⁻¹⁴% |
| High aircraft | 506 | 5.69 × 10⁻¹⁴ | 0.04304 | 0% |
| Trail head | 109 | 0 | 0.02409 | — |

Every matched mover ID retained its surface. Front-copy membership and draw depth can still change because terrain occlusion and land order are evaluated each minute. The potential visibility step below uses the rotated sprite bounds and the drawn crest, so its extent is an upper bound. These changes have the same subpixel positional continuity as the base tracks.

| Place | Original front-copy or depth changes / matching base pairs | New changes / matching base pairs | New changes overlapping drawn land at alpha ≥ 0.01 | Largest potential vertical step / peak sprite alpha |
| --- | ---: | ---: | ---: | ---: |
| Haifa | 42 / 984 | 52 / 1,044 | 14 | 27.79 px / 0.343 |
| Tel Aviv | 375 / 2,419 | 455 / 2,784 | 215 | 20.61 px / 0.299 |
| Shadmot Mehola | 8 / 136 | 9 / 141 | 0 | 0 px |

## 7. Meteor pulse

The meteor pulse now carries its one-shot time and look. It used to also carry a nominal billion-second repeat interval and an infinite cycle. The one-shot evaluator keeps the same timing. Opacity is 1 at +0.10 s and 0 at +0.71 s, +900.1 s and +1,000,000,000.1 s.

## Checks

- `npx tsc -b` passed.
- `npx oxlint` passed with 12 existing warnings in the prototypes, city geometry script and land hook.
- All 79 tests in the nine requested Vitest files passed with `--maxWorkers=2 --testTimeout=60000`. The sweep printed the measurements with `--silent=false`.
