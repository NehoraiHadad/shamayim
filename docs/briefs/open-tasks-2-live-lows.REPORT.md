# Open tasks 2 report

## Changes

- In `src/ui/scrub/sceneTimeController.ts`, a user landing on the current minute selects live (`at = null`). A drag keeps
  `scrubbing` true there, and releasing live starts no hold. A pick at now returns to live immediately. The hook updates the
  controller's clock in a layout effect so input after a minute commit sees the latest value. A clock tick alone leaves the
  selection in place. A released preview holds for 6 seconds, then rewinds over up to 900 ms or cuts under reduced motion.
- `SceneCanvas` passes the nullable selection through to `SceneScrubber`. After horizontal movement, returning to the starting x
  restores the preview minute or follows the current clock if the drag started live. The initial stationary move emits no time.
- In `src/domain/observedCloud.ts`, each satellite frame contributes its own error against the model at the observation minute.
  The error is capped at ±40 percentage points, trusted fully through age 40 minutes, and faded linearly to zero by age 150.
  Minutes before the observation get zero correction. The 10-minute receipt ease blends the outgoing and incoming corrections.
  Individual live sightings still use their 40-to-100-minute age window.
- `src/atmo/airInput.ts` samples the uncorrected scene timeline lazily, once per eligible observation minute per call, and reuses
  the viewed sample if it is at that minute. The card and hourly strip use the same correction formula with a straight-line
  hourly baseline, clamped at the first and last rows. The card uses this baseline before the first satellite receipt as well,
  so the receipt ramp and `rollForward` share a continuous starting value.

## Jerusalem fixture measurements

All times are local on 17 November 2026. The satellite reading was taken at 13:45. The restored world equality check compares
cover, rendered clouds, the cloud field and the full light object for each minute while applying `rollForward` as the app does.
Cover is shown in percent and direct light is dimensionless.

| Held at | Model and satellite cover | Clock sweep | Before cover | After cover | Before direct light | After direct light |
| --- | --- | --- | --- | --- | --- | --- |
| 14:00 | Fixture, 80 | 13:45 → 14:00 → 14:20 | 83.275 → 80.000 → 80.533 | 81.550 throughout | 0.265603 → 0.398275 → 0.376859 | 0.335264 throughout |
| 16:00 | Fixture, 80 | 13:45 → 14:00 → 14:25 | 89.875 → 87.840 → 84.951 | 89.248 throughout | 0.042198 → 0.058554 → 0.091389 | 0.046726 throughout |
| 14:00 | Flat 25, 80 | 13:45 → 14:20 | 61.000 → 65.000 | 65.000 throughout | 0.592312 throughout | 0.592312 throughout |
| 14:00 | Flat 97, 5 | 13:45 → 14:20 | 61.000 → 57.000 | 57.000 throughout | 0.592312 throughout | 0.592312 throughout |

The largest direct-light step in the fixture's 14:00 preview fell from 0.009128 to zero. With a flat 97% model and an 80%
satellite observation, scrubbing to 14:00 from 13:45 previously gave 81.7% cover and 0.406576 direct light. Live at 14:00 gave
80% and 0.479431. Both now give 80% and 0.479431, with identical light objects.

| Observation age boundary | Largest cover step | Cover step on a 0–1 scale | Largest direct-light step | Existing bound |
| --- | --- | --- | --- | --- |
| 40 min | 0.363636 percentage points | 0.003636 | 0.001812 | 0.098381 |
| 150 min | 0.363636 percentage points | 0.003636 | 0.002063 | 0.098381 |

## Failing-before proof

I first extracted the time controller and drag arithmetic with their old behavior and ran the targeted suite before changing
either rule. All four controller cases failed. A landing retained the picked minute or scheduled a hold. Both drag cases
returned `undefined` at the starting x. I reran the drag cases against that same baseline after correcting a fixture
coordinate so both failures reached the return-to-origin assertion.

- All four held-preview cases failed the cover equality sweep. The scrub/live case failed with 81.7% versus 80%.
- The age-boundary tests failed on the fade endpoints. At age 41 the old cover was still 57% instead of 57.363636%.
  At age 149 it was already 97% instead of 96.636364%. The broad step bound alone passed both old cases.
- The old 10:00 domain expectation measured 18 points. The new rule gives `30 × (150 − 85) / (150 − 40)` = 17.727273 points.
  I also reran the two card regressions against the original `observedCloud.ts` with the corrected fixture. The old card
  gave 40% at 09:59 where 89.333333% was expected, and 80% at the halfway receipt point where 75% was expected.
- All three air-input regressions failed. The old chain gave 60.096528% where per-observation calibration gives
  55.284091%, used the app minute in place of the repeated sample minute, and sampled extra weather for inactive frames.

## Verification

- `npx vitest run src/domain src/atmo src/ui src/world/liveLight.test.ts` with console output enabled passed all 242 tests
  across 35 files.
- `npx tsc -b` passed.
- `npx oxlint` passed with 11 warnings in unrelated files.

## Open doubts

The Node tests cover controller timing and drag arithmetic. The same-commit handoff to browser pointer events was checked
through the React wiring. The world equality sweeps use a settled observation and fixed forecast data. A data arrival can
still change a held preview through its receipt ramp.
