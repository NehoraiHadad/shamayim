# Track G round 4 report

## CI failures

### Masada sunrise

At 06:20 on 17 November the fixture’s 04:30 observation is 110 minutes old, beyond the 45-minute cutoff. The direct share was 0.10579605 on pre-merge main (`c5b1af8`) and is 0.08222016 both immediately before the merge on Track G (`cf7221e`) and after it (`309f094`).

| Quantity | Pre-merge main | Track G |
| --- | ---: | ---: |
| Weather cover supplied to the scene | 49.8% | 53.73333% |
| Visibility used by the light | 30 km | 25.6 km |
| Atmospheric direct-light factor | 0.16614709 | 0.13299592 |
| Cloud transmission | 0.63676138 | 0.61821568 |
| Direct share | 0.10579605 | 0.08222016 |

The old live path took its visibility from the 06:00 rollover row. Track G samples one third of the way from 06:00 to 07:00, where visibility goes from 30 to 16.8 km and cover goes from 49.8% to 61.6%. The cloud model also interpolates the resolved layers at the two endpoints. Substituting only Track G’s visibility factor into the old light gives 0.08468667. Substituting only its cloud transmission gives 0.10271473. The solar altitude is 1.629888° in both builds, with disc share 0.9999999915 and zero moon share. Both haze values are above the direct-light gate and the dust weight is zero. With these inputs the dimmer direct light is the expected result. The C9 test now checks 0.082220 to six decimal places and retains its glint and matching water-light assertions. The fixture has one glint and its water-light strength is 0.08222016. See `src/scene/model/c9.test.ts`.

### Accessible scene label

- The two live fixtures produced 19° and −4° from the scene timeline. The hero reads `forecast.current.temperature`, which gives 14° and −3° in those fixtures. The label now takes the hero’s temperature in live mode and the same hourly slot used by the visible readout when a slot is selected. At 14:20 and 14:40 the rain fixture speaks 24°, the visible 14:00 slot value. The scene itself still interpolates 22° and 20° at those minutes and the test checks both. The exact-hour fixture still speaks −2°. When there is no matching slot, the hero supplies the temperature. See `src/App.tsx`, `src/scene/react/SceneCanvas.tsx` and `src/scene/react/sceneLabel.test.ts`.
- The failed thunder assertion tested noon against a 09:00 observation. The observation is 180 minutes old and the noon hours are dry, so the world has no rain object there. The test retains noon as a dry case and checks the live timeline at 14:40, where the blend has thunder weight 2/3 and the rendered flash has the same pulse strength. The label speaks thunder when the sky has an in-view lightning layer, including between its scheduled flashes. In scrub mode the renderer suppresses lightning. The two WMO 95 scrub cases at 14:40 have thunder weight zero and speak rain at 1.6 mm/h and drizzle at 0.2 mm/h. See `src/scene/react/sceneLabel.ts`, `src/scene/react/sceneLabel.test.ts` and `src/scene/model/clouds.ts`.

## Final review

The Shadmot Mehola mist test samples 241 minutes from 05:30 through 09:30. The independent scrub baseline’s maximum step across the six mist and band-opacity readings is 0.03215726. Twice that plus 0.01 gives a bound of 0.07431452. The same bound applies to both sweeps, the 06:00 rollover and the 07:10 receipt. Live and scrub still match at every minute, and the first receipt frame still matches the outgoing forecast exactly. See `src/world/world.test.ts`.

| One-minute step | Pre-merge main | Track G |
| --- | ---: | ---: |
| Largest live step | 0.80000000 | 0.03215726 |
| Largest step with refresh | 0.80000000 | 0.06833525 |
| Rollover | 0.79424966 | 0 |
| Receipt | 0.12620027 | 0.01146635 |

The pre-merge readings use the same fixture with the incoming forecast applied at receipt, as that code predates the refresh ramp. The 06:00 floored WMO fog reading drove fog from 0.00575034 to 0.8 on rollover. The incoming observation drove fog from 0 to 0.12620027 at receipt.

- Restored the star halo gate (`r > 0.85 && alpha > 0.5`) and its original center opacity (`0.25 × alpha`). At star alpha 0.5 the ramp used to draw a halo with center opacity 0.063. The restored painter draws none. At alpha 0.55 the center opacity is 0.138 again, up from 0.116 with the ramp. The twilight share still scales each star’s alpha before the painter receives it and saturates at full night for its class. The regression checks the gate and exact gradient stops across the affected alpha range. See `src/scene/paint/bodies.ts`, `src/scene/model/stars.ts` and `src/scene/paint/glyphs/glyphs.test.ts`.
- Planet glow keeps its ramp because it includes the planet’s twilight-dependent visibility. The Milky Way’s luminous blobs keep theirs because their opacity includes the band’s darkness-dependent strength. Its dark rift uses the original opacity and cutoff. The `soft()` ramp applies to mist and sunlit loading caps. Smoke and edge precipitation use the original cutoff and opacity, as their opacities follow air, precipitation and animation. The fixed loading mist base is above the ramp. The water rim keeps its ramp because the rim opacity includes `1 − 0.55 × dark`. See `src/scene/paint/nightSky.ts`, `src/scene/paint/weather.ts`, `src/scene/paint/loading.ts` and `src/scene/model/water.ts`.
- `Shine.aviationStrength` is required on the descriptor. The glyph kit consumes it directly and both marks and outside keep its existing 8-bit alpha key through `facesKey`. The Boolean, fallbacks and duplicate key entries were removed. All painters now take `smoothstep` from `src/domain/smoothstep.ts`. See `src/scene/model/types.ts`, `src/scene/model/marks.ts`, `src/scene/model/outside.ts` and `src/scene/paint/glyphs/kit.ts`.

## Verification

| Check | Result |
| --- | --- |
| `npx tsc -b` | Passed with no diagnostics in a temporary mirror after the worktree denied writes to `node_modules/.tmp/*.tsbuildinfo`. The mirror used the same source and dependencies and redirected only the build-info outputs. |
| `npx oxlint` | Passed with 13 warnings in untouched files. |
| Vitest with `--testTimeout=180000` | 394 tests passed in 14 files. The run included the seven requested files and the affected model suites for sky, marks, outside, outside seats, living light, loading and weather. Focused reruns passed all 85 loading and weather tests and all six label tests after the final edits. |
| Paint worker dependency check | The bundled worker includes `domain/smoothstep.ts`. Neither `sceneLight.ts` nor `ridgeLighting.ts` contributes code to the bundle. |

The Windows `npx` shim could not find its npm module. The checks used the installed `npx-cli.js` with the requested arguments. The Vitest runs used two workers for the larger fixture suites.
