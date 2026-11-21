# Track C brief 1 — continuous flight for the sky's life (for agy Gemini 4 Neon; run by Codex gpt-6.2-sol after Neon hit its quota)

Repo: this worktree (Shamayim, a Hebrew weather PWA with a canvas valley scene). TypeScript, React, vitest. Read
`docs/design/qa/polish/AUDIT.md` finding #3 and section "1. Life motion" first. Do not commit; the manager commits.

## The problem

Birds and planes stand still, then jump once a minute (low planes up to ~30 px, birds ~15 px, high planes ~11 px).
- `src/world/lifeSchedule.ts` `lifeAt` (called from `src/world/lifeDay.ts:89`) evaluates every mover only at
  `secondsOf(at)`, the shown HH:MM.
- `src/ui/useNow.ts` gives a new HH:MM every 60 s, which rebuilds the world.
- `src/scene/model/life.ts` lays each mover at a fixed `placed` (sky px). Flocks get only a closed 24 s sway (`SWAY_S`);
  aircraft get nothing.

## The design (one world state; painters pure; only the compositor knows the phase)

1. **World: look ahead.** In `lifeAt`, for every flock, airport movement (`LowPlane`) and airliner (`HighPlane`), sample the
   same continuous path ahead of the shown moment: `AHEAD_S = 120` s every `AHEAD_STEP_S = 2` s (61 samples, sample 0 is
   the shown moment itself). Use exactly the functions that place them now (`trackPoint` via `flockAt`, `lowAt`'s `along`,
   `highPoint`), never a re-derived approximation. A sample past the event's end holds the end state (a flock at `t1`,
   a movement at its path's end, an airliner's head gone after `t1`). The sight line (`blockedKm`) stays per minute
   (sample 0 only): state this in a comment. Put the sampling in a new module (e.g. `src/world/lifeAhead.ts`); keep the
   types in `src/world/life.ts`. Also expose an airliner's trail drift (`driftE`, `driftN`, km/s) on `HighPlane`.
2. **The life clock (shell).** A new pure type `LifeClock { laidAt: number; sinceS: number }`: `laidAt` is the scene
   phase (s, `scenePhase()` in `src/scene/react/useSurface.ts`) at the instant the shown moment was set; `sinceS` is the
   seconds of real time past the shown minute at that instant. A hook `useLifeClock(at, selected, timezone)` in
   `src/scene/react/` recomputes it **only when the shown moment string changes** (never on other world rebuilds:
   terrain arriving, clouds seen). When showing now (`selected == null`): `sinceS = (Date.now() − utcOf(now, tz)) / 1000`
   (`src/astro/utc.ts`), read at the same instant as `scenePhase()`; when scrubbing: `sinceS = 0` (owner decision: while
   scrubbing, life keeps moving in real wall time and the set of objects follows the shown hour). Put the math in a pure
   exported function and unit-test it. Make `useNow` tick at each whole minute (+50 ms) instead of every 60 s from mount,
   so the shown HH:MM matches the clock.
3. **Model.** `sceneModel(world, box, clock, life?: LifeClock)` (default `{ laidAt: 0, sinceS: 0 }`, so the harness and
   the tests keep phase 0 = the shown minute). Pass it from `SceneCanvas.tsx` / `CanvasScene.tsx`. For each mover the
   model projects its samples through the same `geom` mapping it uses for `placed` (birds and low planes:
   `geom.x(azimuth)`, `geom.y(altitude)`; the airliner head: `geom.x`, `geom.dome`) and emits
   `animated.flight: Track` with the path **relative to `placed`** (sample 0 = [0, 0]), `step = AHEAD_STEP_S`, and
   `at = life.sinceS − life.laidAt`. Also per sample, relative to sample 0: `scale` (birds: `nearM / distanceM`; low
   planes: their drawn size), `alpha` (the same alpha formula as `placed.alpha`, per sample), and `turn` (low and high
   planes: the change of heading angle on screen, rad). Put this in a new module (e.g. `src/scene/model/lifeTracks.ts`);
   `life.ts` must not grow. The flocks' `SWAY_S` sway is replaced by the real flight track (the flock's wheeling is drawn
   in the strip; the manager owns that, see "Not yours").
4. **Track.** Extend `Track` (`src/scene/model/types.ts:121`) with `open?: boolean` (not looping: `t = phase + at`
   clamped to `[0, end]`, never null), `scale?`, `alpha?`, `turn?: number[]` (one per path point, interpolated like the
   path). `trackAt` (`src/scene/model/anim.ts:158`) returns `{ x, y, scale, alpha, turn }` (1, 1, 0 when absent). Under
   reduced motion an open track stands at `t = 0`. Closed tracks (the clothesline's drips in `wear.ts`) behave exactly as now.
5. **Compositor** (`src/scene/compose/surface.ts`): lay a placed layer at `placed.x + x`, `placed.y + y`, scale
   `placed.scale × scale`, alpha `placed.alpha × alpha`, rotated by `turn` about its origin (`setTransform`). Include
   scale, alpha and turn in the frame fingerprint (`:301`). **A stale canvas** (key changed, repaint not yet arrived:
   the worker answers seconds later under load) must be laid by the `placed` and `animated` of the desc it was painted
   for, not the new desc, in both `layerCache.ts` and `remoteCache.ts`; otherwise a repainted mover jumps back for a
   few seconds.
6. **Contrails** (`contrailLayers`): the plane head gets the open track (dome mapping, as `placed`). The persistent trail:
   - its layer gets an open track equal to the upper-wind drift of the trail's middle point, projected through its frame;
   - it also paints the puffs the plane will lay over the next `AHEAD_S` (fresh, age 0), each at
     `highPoint(τ) − drift·(τ − T)`, so that once the layer drifts it stands at `highPoint(τ) + drift·(t − τ)`;
   - it gets a new `animated.grow = { track, angle }`: the head's offset relative to the layer, and its direction on
     screen. The compositor clips the layer to the half-plane behind the head, so the trail grows from the plane.
   Measure and report the contrail's worst mismatch across a minute rebuild: the frame is re-centred on the new head
   each minute. If the far trail is off by more than 1 px, keep the trail's frame fixed for the whole crossing and say so.
7. **Meteors**: anchor each flash at the laid time: `pulse.first = flash.inS − life.sinceS + life.laidAt`, with a
   cycle long enough that it never repeats. Their keys must not change from minute to minute.
8. **Keys by identity.** Layer ids already carry the mover's id. Make sure no part of a mover's key changes with its
   motion within a crossing except a genuine change of its look: tone in 1/24 steps, size in 0.2 px steps, angle in
   0.05 rad steps. Report which keys still change per minute and why.

## Tests (vitest, under `src/`)

- **Continuity (the done criterion).** At haifa, tel-aviv and shadmot-mehola on 2026-11-17 (`src/test/sceneWorld.ts`
  `loadPlaces`, one `makeWorldBuilder` as the app uses), every minute from 05:00 to 21:00 and with `sinceS` 0 and 37:
  for every bird, low plane, high plane and contrail head layer present in both minutes, the laid position (`placed` + `trackAt`)
  of the minute-T model at phase `p = laidAt + 60 − sinceS` equals the minute-(T+1) model's at `p` (its `laidAt = p`,
  `sinceS = 0`) within **1 px**, and the scale within 2 %. Also check that the jump is no larger than the motion of one
  30 fps frame plus 1 px. Print the worst case per kind.
- `trackAt` on open tracks: clamped, interpolated scale, alpha and turn, reduced motion.
- The life-clock math, including a render landing just past a minute boundary.
- Update `c10.test.ts:67` (it reads the old sway) to the new track.
- Run only targeted suites: `npx vitest run <files>`. A full run times out on this loaded machine.

## Precision

Pay attention to subtleties and physical accuracy: real speeds, flight paths and scale, in their units (m/s, km, deg,
sky px at `geom.s`). No unstated approximations: every approximation (a per-minute sight line, a linear
interpolation between 2 s samples, the drift of the trail's middle point standing for the whole trail) is named in a
comment with its size. Sample the same continuous schedule path the world already uses.

## Rules

- Painters stay pure in time and phase: no clock, no `Date`, no `performance` in `src/scene/paint` or `src/scene/model`;
  seeded rng only; no `ctx.filter`. Only the shell (`src/scene/react`, `src/ui`) reads the clock.
- One world state drives everything. No point fixes for particular places.
- Files under ~150 lines (new modules), DRY, no dead code; remove what the change makes unused (`SWAY_S`).
- Never call live services; use the fixtures. Do not touch the cloud motion (`clouds`, `cloudShadows`, another track's
  work) or the bird painter (`src/scene/paint/life.ts` bird code and `LOOKS`/`flockBirds` in `scene/model/life.ts`: the
  manager's).
- Green before you hand back: `npx tsc -b`, `npx oxlint`, and the targeted vitest suites: `src/scene/model/c10*.test.ts`,
  `flight.test.ts`, `continuity.test.ts`, `src/scene/compose/compose.test.ts`, `src/world/lifeSchedule.test.ts`, and your new
  tests.
- When done, write `docs/design/qa/polish/track-c/IMPL-1.md`: what changed (file list), the continuity test's worst
  cases, the contrail mismatch, the keys that still change per minute, and anything you could not do.
