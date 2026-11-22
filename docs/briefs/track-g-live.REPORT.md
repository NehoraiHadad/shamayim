# Track G live weather continuity

## What changed

- Live and scrub both evaluate the forecast at `selected ?? now`. They interpolate between the hourly rows around that minute, through gaps in the hourly series, and hold the nearest row beyond the series. Cloud layers are resolved against total cover at each row, then interpolated. Surface and aloft wind directions use the shortest arc. The same weather feeds the canvas and the CSS sky. See `src/atmo/airInput.ts:43`, `src/atmo/airInput.ts:77`, `src/atmo/airInput.ts:136`, `src/App.tsx:72`, and `src/world/world.ts:176`.
- `rollForward` still updates the current card. Before replacing its values, it preserves the original reading and timestamp for the world. Visibility uses the hourly measurement when available, otherwise the existing humidity estimate or 40 km. A missing hourly wind direction uses the source snapshot's observed direction. The provider supplies 15-minute current rain and snow totals, which the scene converts to hourly rates. Hourly rows supply snow depth and a weather code but no numeric snowfall rate, so the numeric observation eases toward zero while the code still describes the forecast phase. Where the current cloud reading lacks a full layer profile, the existing thick-cover split estimates it. See `src/domain/now.ts:18` and `src/atmo/airInput.ts:85`.
- Weather entering light is blended before light is calculated. This includes visibility, cloud fractions, effective rain and airborne snow. The extra cloud shown for otherwise unsupported rain grows with the rate and tapers as a forecast layer becomes thick enough to rain. Rain haze and the dust contribution to optical depth and sky tint also vary continuously. See `src/world/world.ts:176`, `src/world/rain.ts:22`, `src/world/airParts.ts:82`, `src/world/sceneLight.ts:27`, and `src/theme/skyAir.ts:16`.

## Easing

Let `s(x) = u²(3 − 2u)`, where `u = clamp(x, 0, 1)`. For an observation whose timestamp is `age` minutes from the sampled instant, its weight over the hourly background is `(1 − s((abs(age) − 15) / 30)) × s((at − fetchedAt) / 10 min)`. The age term gives full trust within 15 minutes of the observation and reaches zero at 45 minutes. The fetch term opens over 10 minutes. Recorded forecasts with `fetchedAt = 0` use the age term alone. This preserves nearby observations through an hour rollover and returns to the hourly background as they age. See `src/atmo/airInput.ts:129`.

At a refresh, the app stamps the instant it receives the replacement and supplies the outgoing forecast as input. Both snapshots are evaluated at the same scene minute. The incoming snapshot gets weight `s((at − receivedAt) / 10 min)`; the outgoing snapshot gets the complement. The world therefore has the exact outgoing values at arrival even when the server's fetch timestamp is older, the hourly rows changed, or a manual refresh interrupted a transition. The zero slope at both ends keeps either snapshot from entering or leaving abruptly. Overlapping source snapshots stay available for that calculation, and only the raw forecast goes into the persistent cache. The world reads the data and scene time without a clock or stored transition progress. Satellite cloud-cover corrections use the same receipt-time ramp. See `src/domain/forecastRefresh.ts:4`, `src/domain/forecastRefresh.ts:23`, `src/data/useForecast.ts:49`, `src/domain/observedCloud.ts:45`, and `src/data/overhead/useObservedCloud.ts:100`.

## Measurements

`src/world/liveLight.test.ts:30` used `worldInput` and `makeWorldBuilder` to sample Karmei Tzur every minute from 12:30 to 14:30 local time on 2026-11-17. Each step compares `light.direct` and all six values from `faceLight`. The refetch at 13:10 used the same hourly rows with a different current reading and a newer `fetchedAt`. The test uses the Karmei Tzur panorama already present in the worktree at `src/test/fixtures/scene/karmei-tzur.panorama.json`.

| Measurement | Maximum absolute change |
| --- | ---: |
| Scrub baseline | 0.01610834 |
| Live, including 13:00 and 14:00 | 0.01610834 |
| Bound, 2 × scrub maximum + 0.01 | 0.04221669 |
| Live with refetch | 0.02890749 |
| From 13:09 to 13:11 across the refetch | 0.00654653 |

The first test also checks that the refetch leaves light identical at 13:10 itself and has a measurable effect by 13:20. The second test at `src/world/liveLight.test.ts:63` replaces both the current reading and the hourly rows during an active transition, and verifies that light, visibility, wind and cloud layers match at the instant of the second arrival. `src/atmo/airInput.test.ts:30` checks observation preservation, wind through north, visibility and snowfall through expiry. `src/domain/observedCloud.test.ts:38` checks the satellite correction at arrival, halfway through, and once the transition ends. The existing visibility test now uses readings marked at the minute under test. See `src/world/world.test.ts:151`.

## Test output

- `npx tsc -b` reported `TS5033` because the sandbox denied writes to the two existing files under `node_modules/.tmp`. Build mode passed with exit 0 and no diagnostics using temporary configs extending the app and node configs. The wrappers redirected build metadata to a writable temporary directory and pointed type resolution at the workspace's dependencies.
- `npx oxlint` exited 0 with 12 existing warnings in land data, city geometry and design prototypes.
- `npx vitest run src/atmo/airInput.test.ts src/domain/observedCloud.test.ts src/world/liveLight.test.ts src/world/world.test.ts --testTimeout=180000 --silent=false --reporter=default` reported `Test Files 4 passed (4)` and `Tests 47 passed (47)`.
- The Windows `npx` shim pointed at a missing user-level npm install. All three checks used the `npx-cli.js` bundled with the installed Node runtime.

## Round 2

- The canvas and CSS sky sample weather at `selected ?? now`. Forecast replacement, current observation fetches, satellite correction, and satellite sightings use the app’s current minute to evaluate the same 10-minute smoothstep. The hooks stamp accepted data with that clock at receipt. The provider’s `fetchedAt` still governs cache freshness. For `?at=`, the sampled weather minute stays pinned while the receipt clock advances in elapsed whole minutes from the pin. `src/ui/useNow.ts:10`, `src/data/useForecast.ts:54`, `src/data/overhead/useObservedCloud.ts:100`, `src/atmo/airInput.ts:42`, `src/world/world.ts:163`.
- The weather observation keeps its original time through rollover. Its age factor uses the absolute distance from the viewed minute, stays at full weight through 15 minutes, and falls to zero at 45 minutes. For an observation received during the session, the age factor is multiplied by the receipt smoothstep. A refresh also crossfades the incoming weather snapshot against the outgoing snapshot, retaining overlapping transitions. Cache and fixture forecasts without a receipt stamp use the age factor alone. `src/domain/now.ts:18`, `src/atmo/weatherAt.ts:82`, `src/domain/forecastRefresh.ts:8`.
- Hourly snow codes (71, 73, 75, 77, 85, 86) and temperatures at or below 2 °C assign precipitation to snow and set liquid rain to zero. Warm rain shower codes still describe liquid rain. Hourly snow uses 0.7 cm of fresh snow per mm of water equivalent, with the existing request. The sky and the daily life schedule both blend the snow-cloud contribution from each source, using `max(0.1, snowfall)` for an endpoint with falling snow. Code-only snow can still raise a cloud. `src/world/snowLine.ts`, `src/atmo/weatherAt.ts:37`, `src/world/world.ts:190`, `src/world/lifeDay.ts:48`. [Open-Meteo snowfall conversion](https://open-meteo.com/en/docs/dwd-api).
- Satellite cover correction applies only at or after each sighting’s observation minute, including when scrubbing between hourly rows. The correction fades toward the model over the next 150 forecast minutes. The old and new sightings crossfade with stable identities. A separate smoothstep brings sighting opacity to zero as blended live cover rises from 40% to 50%. `src/domain/observedCloud.ts:49`, `src/domain/cloudSightings.ts:84`, `src/App.tsx:93`, `src/world/clouds.ts:121`. `pickTheme` still colours the page chrome at `src/App.tsx:76`.
- Surface and aloft wind use linear speed and the shortest angular arc in degrees. The life schedule uses the blended high wind. Each weather endpoint supplies its drizzle rate, snow amount and thunder strength before interpolation. The renderer can fade rain and snow independently, and thunder strength scales flash opacity. The spoken day/night label uses the sun. Humidity and PM10 use the available value when one side is missing. `src/atmo/weatherMix.ts:22`, `src/world/lifeDay.ts:50`, `src/scene/model/weather.ts:118`, `src/scene/model/clouds.ts:281`, `src/scene/react/sceneLabel.ts:47`.
- `airInput.ts` is now 67 lines. Sampling and interpolation live in `weatherAt.ts` and `weatherMix.ts`. Both original air files are back to CRLF. The ridge-lighting `smoothstep` implementation now lives in `src/domain/smoothstep.ts`. `Air.dustWeight` is required. Haze colour blends into rain grey over 0.3–0.7 mm/h and into dust tan over 40–60 µg/m³. `src/world/types.ts:173`, `src/world/airParts.ts:82`.

### Jerusalem measurements

`src/world/liveLight.test.ts:53` uses the Jerusalem panorama with `worldInput` and `makeWorldBuilder`. The sweep samples `light.direct` and all six `faceLight` components every minute from 12:30 to 14:30 on 2026-11-17. The 12:50 test reading has 88% total cover, 85% thick cover and 15 km visibility. The refresh arrives at 13:10 with a provider timestamp of 12:58. The held scrubs use today and tomorrow at 10:00 with changed hourly visibility.

| Measurement | Maximum absolute change |
| --- | ---: |
| Scrub baseline | 0.01607262 |
| Bound, 2 × scrub maximum + 0.01 | 0.04214523 |
| HEAD, 12:59 → 13:00 | 0.10574905 |
| Round 2, 12:59 → 13:00 | 0.00058066 |
| Live across the full sweep | 0.00892840 |
| Live with refresh across the full sweep | 0.01211420 |
| Live from 13:09 to 13:11 across the refresh | 0.00666303 |
| Held scrub at today 10:00 | 0.02477632 |
| Held scrub at tomorrow 10:00 | 0.03216193 |

The same tests check exact light continuity at receipt, observation weight halfway through the ramp, a second refresh that interrupts an active transition, and a pinned view that accepts data after the ramp. The air and world tests exercise snow after observation expiry, code-only snow raising a cloud, and the interpolated effects of weather codes. The satellite tests exercise the cutoff before observation, the cover gate and the crossfade.

### Test output

- `npx tsc -b` reported `TS5033` because the sandbox denied writes to the existing `node_modules/.tmp` build-info files. Build mode exited 0 without diagnostics using temporary configs extending the two repo configs and redirecting build metadata.
- `npx oxlint` exited 0 with 12 existing warnings.
- `npx vitest run src/atmo/airInput.test.ts src/domain/cloudSightings.test.ts src/domain/observedCloud.test.ts src/world/liveLight.test.ts src/world/sceneLight.test.ts src/world/world.test.ts --testTimeout=180000 --silent=false --reporter=default` reported `Test Files 6 passed (6)` and `Tests 71 passed (71)`.
- The commands used the Node installation’s bundled `npx-cli.js`, as in Round 1.

## Round 3

- The scene uses the required `Air.dustWeight` for coarse dust. The weight is the existing smoothstep from 40 to 60 µg/m³, using measured dust when available and PM10 otherwise. The 50 µg/m³ boolean was removed from world air. `src/world/airParts.ts:64`, `src/world/air.ts:52`, `src/world/types.ts:178`.
- Mistiness and both mist-band opacities scale with `1 − dustWeight`. The valley fades in over moisture mistiness 0.08–0.20, and ground fog fades in as its strength rises from 0.30 to 0.475. Wear dust keeps its existing short-visibility factor and scales it by `dustWeight`. `src/scene/model/weather.ts:258`, `src/scene/model/weather.ts:312`, `src/scene/model/weather.ts:321`, `src/scene/model/wear.ts:158`.
- Dust grain opacity scales with `dustWeight`. In a gale, the sky's long wind streaks fade with `1 − dustWeight` on a separate tile. Each tile keeps its seeded positions, counts, sizes, bounds, and drift as the dust weight changes. The grain cache key includes opacity. `src/scene/model/weather.ts:332`.
- The sky and world optics share `coinOf(air)`, which computes `dustWeight × farFade`. `src/world/air.ts:8`, `src/scene/model/sky.ts:133`, `src/world/world.ts:234`.

### PM10 sweep

The Jerusalem fixture at noon on 2026-11-17 holds humidity at 99%, visibility at 4 km, and wind at 45 km/h. The test sweeps PM10 from 30 to 70 µg/m³ in 1 µg/m³ steps. It compares mistiness and both band opacities, peak mark alpha on each of the three grain tiles, wear dust, and each normalized RGB channel of the sun disc, core, and limb. It also checks that the grain tiles retain the same geometry and drift throughout the sweep. `src/scene/model/dust.test.ts:22`.

| Measurement | Maximum absolute change per step | Bound |
| --- | ---: | ---: |
| Mist | 0.07475000 | 0.102 |
| Grain alpha | 0.02233685 | 0.023 |
| Wear dust | 0.06644444 | 0.067 |
| Sun colour | 0.02593236 | 0.030 |

### Test output

- `npx tsc -b` reported `TS5033` on both existing `node_modules/.tmp` build-info files because the sandbox denied writes. Build mode passed with exit 0 and no diagnostics using temporary configs that extend the repo configs and redirect build metadata.
- `npx oxlint` exited 0 with 12 existing warnings.
- `npx vitest run src/scene/model/dust.test.ts --testTimeout=180000 --silent=false --reporter=default` reported `Test Files 1 passed (1)` and `Tests 1 passed (1)`.
- The commands used the Node installation's bundled `npx-cli.js`.
