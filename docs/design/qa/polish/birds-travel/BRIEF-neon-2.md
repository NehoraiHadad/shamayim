# Brief 2 — birds travel: lay flock tracks lazily, physical test bounds

Same branch and rules as BRIEF-neon-1.md (commit in English ending with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; no push; files ≲150 lines where they already are).
Round 1 (`4f05e9e`) is right and stays: real flock speeds. Your IMPL-1 findings were good. Claude measured the cost:

- `makeWorldBuilder` first build (node, includes both day schedules): tel-aviv 1391 → 2349 ms, haifa 960 → 1724 ms.
  Per flock laid: `wayOf` ≈ 0.7 ms, `heightsOver` + `unclear` ≈ 0.5 ms; ~10× more flocks per day now. On a phone
  (×4) that is +3 s on first load and on every day/forecast change. Not acceptable.

## 1. Lay each flock's track only when it is first sampled (`src/world/lifeSchedule.ts`)

Only ≤ `MAX_FLOCKS` flocks are under way at any moment, so laying all ~180 tracks a day up front is waste.
- `flockEvents` keeps everything it decides now (kind, t0, count, score, nearM drawn, headingDeg, speedMs drawn, cE/cN,
  home, aglQ, seed, endM, eyeM) but does NOT call `wayOf`/`heightsOver`/`unclear`.
- `t1 = t0 + 2 * Math.sqrt(endM² − nearM²) / speedMs` (the straight pass from `endM` to `endM` over the ground; `nearM`
  here is the drawn closest distance). The MAX_FLOCKS cap uses this t1, as now.
- The event gets a memoised `lay()` (closure, first call lays, later calls return the same object) that runs the current
  height-picking loop and returns `{ track, nearM, rate }`, where `rate = trackLength / (t1 − t0)` m/s
  (`trackLength = (pts.length / 3 − 1) * ds`), so the laid way, however the terrain bent it, is flown exactly in
  [t0, t1] and no flock pops out early or late. `flockAt` uses `lay()`: `trackPoint(track, rate * (t − t0))`, `nearM`
  from the laid track; `speedMs` reported on the Flock stays `rate`.
- Determinism: `lay()` depends only on the event's fields and the context's terrain (no clock, no global state). Two
  schedules of the same inputs must produce equal Flocks (existing tests check this; keep them green).
- Keep `FlockEvent` a plain typed interface plus the `lay` function field; update `lifeSchedule.test.ts` reads of
  `.track`/`.nearM` to go through `lay()`.

## 2. Test bounds from physics, not the old slow speeds

- `src/scene/model/birdsTravel.test.ts`: keep the count (≥ 20) and "every flock nearer than 700 m travels ≥ 5 px in
  10 s". Replace "median of all ≥ 8 px" with: the median over flocks nearer than 1500 m (`distanceM`) ≥ 8 px, and every
  flock travels ≥ 0.3 px (far tails are honestly slow: a pass's angular speed falls as (nearM/distance)²). If either
  fails, stop and report numbers; do not loosen.
- `src/world/lifeSchedule.test.ts:56` (< 25° in 60 s at closest approach): bound by the pass itself:
  `≤ 2·atan(30·speedMs / nearM) in degrees × 1.1 + 2`.
- `src/scene/model/continuity.test.ts:80–81` (< 45 px in 60 s): per flock,
  `≤ min(width, 1.1 × 2·atan(30·speedMs / nearM)/RAD × pxPerDeg × geom.s) + 12` (12 px: the strip's own loops).
  Use the world's camera and `skyGeom` the test already has.
- `src/scene/model/flight.test.ts:111` (`hidden in the open`, crows at shadmot-mehola 16:16 and tiberias 07:04):
  investigate first, after part 1 lands. If it still fails, find why (which check, which sample, the sight line numbers)
  and fix the cause in the flight/sight code if it is a real bug; if it is the test sampling an edge the rule allows,
  explain with numbers in IMPL-2. Do not just skip those cases.

## 3. Measure and report (`docs/design/qa/polish/birds-travel/IMPL-2.md`)

- First-build ms for tel-aviv and haifa at 09:00 (a throwaway vitest in `src/` that times `makeWorldBuilder()(worldInput(...))`
  with fresh builders; delete it before committing) for main `b2e250d` lazily-checked-out files vs this branch. Target:
  within +10 % of main.
- The per-kind travel table again, and every test you changed with the reason.
- Gates: `npx tsc -b`, `npx oxlint`, then `npx vitest run src/world src/scene/model` — run it with
  `--maxWorkers=4` so files don't starve each other; all green.
