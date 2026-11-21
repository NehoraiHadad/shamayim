# Track C implementation 1 — continuous flight

The world samples the existing flock, airport and airliner paths every 2 s through 120 s. The compositor interpolates between those 61 samples and applies position, opacity, scale and heading relative to the shown minute. The shell anchors the track when the shown time string changes. Live time follows the whole minute plus 50 ms, and a scrub starts from the selected minute and advances in real time. Open tracks hold at 120 s if the shown moment stays fixed. Reduced motion holds sample 0.

## Changed files

- **World** — `src/world/life.ts`, `src/world/lifeAhead.ts`, `src/world/lifeSchedule.ts`. Sampled paths, cruise wind in km/s, future puff positions and each meteor's event-time radiant and speed.
- **Shell** — `src/ui/useNow.ts`, `src/scene/react/useLifeClock.ts`, `src/scene/react/CanvasScene.tsx`, `src/scene/react/SceneCanvas.tsx`, `src/scene/react/useSurface.ts`. Minute alignment, the life clock and the current phase on the first composite after a model update.
- **Model** — `src/scene/model/types.ts`, `src/scene/model/anim.ts`, `src/scene/model/index.ts`, `src/scene/model/life.ts`, `src/scene/model/lifeTracks.ts`, `src/scene/model/contrail.ts`, `src/scene/model/contrailFrame.ts`, `src/scene/model/tangent.ts`. Open tracks replace flock sway and move aircraft. Meteor pulses use their absolute phase and fire once.
- **Compositor** — `src/scene/compose/surface.ts`, `src/scene/compose/layerCache.ts`, `src/scene/compose/remoteCache.ts`, `src/scene/compose/schedule.ts`. The compositor applies the full pose and clips the contrail behind its head. A bitmap waiting for replacement keeps the latest layout compatible with its paint key.
- **Tests** — `src/world/lifeSchedule.test.ts`, `src/scene/react/useLifeClock.test.ts`, `src/scene/model/c10.test.ts`, `src/scene/model/c10fixes.test.ts`, `src/scene/model/continuity.test.ts`, `src/scene/model/lifeContinuity.test.ts`, `src/scene/model/lifeTracks.test.ts`, `src/scene/compose/compose.test.ts`.

## Minute handoff

The 2026-11-17 fixture sweep used one app world builder per place from 05:00 through 21:00 at Haifa, Tel Aviv and Shadmot Mehola. Both 0 s and 37 s initial clock offsets were checked. The position limit was 1 CSS px and the scale limit was 2%. The sweep also checked that the jump from the preceding 30 fps frame stayed within that frame's motion plus 1 CSS px. Pair counts include both offsets and any matching foreground copies. The Shadmot Mehola fixture yielded zero matching low-plane pairs.

| Layer | Pairs | Worst position error (CSS px) | Worst relative scale error |
| --- | ---: | ---: | ---: |
| Birds | 5,360 | 0 | 2.23 × 10⁻¹⁴% |
| Low aircraft | 5,402 | 0 | 2.23 × 10⁻¹⁴% |
| High aircraft | 990 | 0 | 0% |
| Contrail head clip | 226 | 0 | 2.23 × 10⁻¹⁴% |

## Contrail frame and residual

The old head-centred projection moved matching visible puffs by up to 140.606 CSS px across a minute, isolating the frame change from physical wind drift. Each crossing now keeps a tangent frame fixed at the schedule's crossing midpoint. The compositor's scale and turn register the ribbon to the dome at the crossing start and the moving head. The head clip follows the airliner's dome position.

| Place | Re-centred frame mismatch (CSS px) | Fixed frame residual (CSS px) |
| --- | ---: | ---: |
| Haifa | 117.188 | 1.060 |
| Tel Aviv | 140.606 | 0.518 |
| Shadmot Mehola | 35.582 | 0.675 |

The fixed-frame residual measures where the same old puffs land on screen before and after the rebuild. One translation uses the projected wind drift at the visible ribbon's midpoint. Perspective makes the projection of that same drift different at its other points. Future puffs use the existing 20 s emission grid, pre-offset against the wind and painted at age zero. Puff aging and the flock and low-plane terrain sight lines update on the shown minute. Aircraft headings use the screen direction of the existing 0.5 km look-ahead for low movements and a one-metre chord for the straight cruise path.

## Paint keys

- Flock strips keep their event identity and repaint when their 1/24 tone or light bucket changes, or when the sprite faces the other way.
- Low aircraft translate, scale and turn their reference sprite in the compositor. Tone and light changes can repaint it, including the switch to or from the night strobe strip.
- High aircraft also turn in the compositor. Their painted tone or short-trail length can change the key, with length quantized in 0.2 px steps. Aircraft heading stays out of the paint key.
- Persistent contrail rasters still repaint as puffs enter, age, drift and leave the raster. Puff geometry, widths and shading determine those repaint keys. The open track, clip and phase are compositor inputs.
- Meteor keys and sprite geometry stay fixed across a minute rebuild for the same event and box. Each model places the event on the same absolute scene phase.

## Checks

- `npx tsc -b` passed.
- `npx oxlint` passed with 11 existing warnings in the prototypes, city geometry script and land hook.
- Targeted Vitest passed all 73 tests across `c10.test.ts`, `c10fixes.test.ts`, `flight.test.ts`, `continuity.test.ts`, `lifeContinuity.test.ts`, `lifeTracks.test.ts`, `useLifeClock.test.ts`, `compose.test.ts` and `lifeSchedule.test.ts`. It used `--maxWorkers=2 --testTimeout=60000 --silent=false` for the fixture load and printed measurements.
