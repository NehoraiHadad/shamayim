# Track G round 5 report

## Scene mode

- `src/atmo/airInput.ts:44` derives `live` from `selected === null` and derives `preview` from that flag. Weather still samples `selected ?? now`, while arrivals use the current minute or the supplied receipt clock. `sampleAtNow` only reuses the UTC conversion and weather sample when both calculations refer to the same minute.
- `src/App.tsx:89` passes the sampled mode to `useSceneSightings`. The hook returns the live sightings and their count together, including sightings pinned by the dev query parameter. A preview always produces `[]` and `0`.
- `src/world/world.ts:46` applies the same flag to sightings supplied to the builder and uses the filtered list for both `cloudsSeen` and the drawn banks. `src/world/world.ts:203` gates drawn thunder with that flag. The interpolated storm inputs still feed weather, rain geometry and light. The scene label follows the rendered flashes.

## Returning to now

The canvas Now chip and Escape already used `toNow`, which clears the selection (`src/scene/react/SceneCanvas.tsx:77`, `src/scene/react/SceneScrubber.tsx:55`, `src/ui/scrub/useSceneTime.ts:41`). Pointer up or cancel on either scrub surface calls `release`, which starts the existing six-second hold. On return, rewind clears the selection as soon as its rounded offset reaches the target. Zero-distance and reduced-motion returns clear it directly after the hold (`src/ui/scrub/useSceneTime.ts:45`). The hourly strip's Now tile previously passed its hour to `pick`. It now passes `null` on click and on keyboard navigation to that tile (`src/ui/hourly/HourlyStrip.tsx:50`, `:123`).

## Regression checks

- `src/world/liveLight.test.ts:55` holds a Jerusalem WMO 95 hour at 14:00 with a fresh satellite sighting. Across now = 13:59, 14:00 and 14:01, the test checks exact equality of the preview's empty sightings and banks, zero count, zero drawn thunder weight and full light state. The fixture uses 25% model and observed cover to isolate the mode transition from satellite cover correction. Clearing the selection at 14:00 with the same inputs gives one visible sighting, a count of one and thunder weight of one.
- `src/ui/scrub/useSceneSightings.test.ts:29` renders the hook used by App and checks both sighting outputs as the clock crosses the held minute, then clears the selection. It also exercises the dev pin.
- `src/scene/react/sceneLabel.test.ts:167` checks that live and preview rain agree at the same minute apart from the drawn thunder fields. The preview has zero flash layers and is spoken as rain. The live scene has a flash layer and is spoken as thunder.

## Verification

- `npx tsc -b` reported `TS5033` for the existing build-info files in `node_modules/.tmp`. Build mode passed with exit 0 using temporary configs that extend the repository configs and redirect those files. The temporary files were removed.
- `npx oxlint` exited 0 with 12 warnings in unchanged files.
- `npx vitest run src/atmo/airInput.test.ts src/scene/model/c10fixes.test.ts src/scene/react/sceneLabel.test.ts src/ui/scrub/useSceneSightings.test.ts src/world/liveLight.test.ts src/world/world.test.ts --testTimeout=180000` passed all 69 tests across 6 files.
- The checks used the Node installation's bundled `npx-cli.js` because the PowerShell `npx` shim pointed to a missing user-level npm CLI.
