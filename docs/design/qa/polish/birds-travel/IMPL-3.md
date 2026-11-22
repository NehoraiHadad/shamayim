# IMPL-3 — birds travel: Codex review fixes (`REVIEW-codex-1.md`)

Status: **Complete** — all gates green (`npx tsc -b`, `npx oxlint`, `npx vitest run --maxWorkers=4 src/world src/scene/model`: `47 / 47` test files, `674 / 674` tests). Finding 2 (strip yaw held for the minute) was intentionally left unchanged as out of scope.

---

## Finding 1 (P1) — No pop-in for a flock starting inside the minute

### What changed
- `src/world/lifeSchedule.ts`:
  - `lifeAt` now lays a flock whenever its session overlaps `[tt, tt + AHEAD_S]` (`e.t0 <= tt + AHEAD_S && tt <= e.t1`), instead of only `e.t0 <= tt && tt <= e.t1`. Planes (`high`, `low`) are untouched.
  - `flockAt(e, t, sight)` clamps the track position to `t >= e.t0` (`offset + rate * Math.max(0, Math.min(dur, t - e.t0))`) and returns `fade: 0` for `t < e.t0`, so a flock not yet started holds its `e.t0` pose with `fade: 0` at `tt` and at every look-ahead sample `tau < e.t0`, then advances and fades in from `e.t0` onward.
- `src/scene/model/lifeTracks.ts` & `src/scene/model/birds.ts` (verified, unchanged):
  - `birdPoses` maps every sample's `flock.fade` into `pose.alpha`; when `poses[0].alpha === 0`, `trackBaseAlpha(first)` returns `1`, `placed.alpha` is `1`, and `poseTrack` writes absolute per-sample opacity into `track.alpha` (`0` before `e.t0`, ramping afterward). `Surface.composite` multiplies `placed.alpha * flown.alpha`, so the bird layer is invisible until `e.t0` and ramps in with no step while planes remain byte-identical.
- `src/scene/model/continuity.test.ts`:
  - Removed the `fromStart` exemption from `Seen`, `lifeAt`, and the appearance assertion (`expect(unseen(now)).toBe(true)`).
  - Added an explicit opacity continuity gate for every bird layer present across consecutive minutes: `|now.alpha - was.end.alpha| <= 0.05` (old minute at phase 60 vs new minute at phase 0).
- `src/scene/model/c10.test.ts`:
  - Updated the `trackAt(flight, 0)` assertion to allow `alpha === 0` (with a later sample `> 0`) for flocks starting inside `(tt, tt + AHEAD_S]` alongside `alpha === 1` for flocks already under way.

### Numbers — bird opacity step max (`phase 60 → phase 0`, ceiling `0.05`)

| Place (`2026-11-17`, 660 minutes) | Max bird opacity step | Gate (`<= 0.05`) |
| --- | ---: | --- |
| `tel-aviv` | **0.005107** | PASS |
| `haifa` | **0.004421** | PASS |
| `jerusalem` | **0.004894** | PASS |
| **Overall max** | **0.005107** | **PASS** |

(`lifeContinuity.test.ts` late-rebuild handoff across `haifa`, `tel-aviv`, `shadmot-mehola`: max bird position jump `8.04e-14 px`, max scale jump `3.33e-14 %`.)

---

## Finding 3 (P2/P3) — Ground speed stays the drawn speed

### What changed
- `src/world/lifeSchedule.ts`:
  - In `lay()`, clamped `rate = Math.max(0.87 * speedMs, Math.min(1.15 * speedMs, trackLength / dur))` and computed `offset = Math.max(0, (trackLength - rate * dur) / 2)` so tracks longer than `rate * dur` fly their middle (`s(t) = offset + rate * (t - t0)`), and shorter tracks start at `offset = 0` and hold at the track end (where ground distance `>= endM` gives `fade = 0`).
  - Added time-end fade in `flockAt`:
    `fade = Math.min(distanceFade, smoothstep(t0, t0 + 0.08 * dur, t), 1 - smoothstep(t1 - 0.08 * dur, t1, t))`
    so both session ends are invisible (`fade === 0`) regardless of distance fade.
- `src/world/lifeSchedule.test.ts`:
  - Updated the angular-sweep bound at line 58 to use the drawn speed `e.speedMs * 1.15` rather than the reported `mid.speedMs`.
  - Added a fixture-wide test over all 8 baseline panoramas (`SCENE_PLACES`, `2026-11-16` and `2026-11-17`, **1,850** flock events) asserting every `laid.rate / e.speedMs` is within `[0.87, 1.15]` and both endpoints `t0` and `t1` have `fade === 0`.

### Numbers — speed ratio distribution (`laid.rate / e.speedMs`, 8 baseline panoramas × 2 days)

| Metric | Value |
| --- | ---: |
| Events probed (`>= 500` gate) | **1,850** |
| Min | **0.9252** |
| p05 | **1.0096** |
| p50 (median) | **1.0142** |
| p95 | **1.0206** |
| Max | **1.1500** |
| Clamped at lower bound (`0.87`) | **0** |
| Clamped at upper bound (`1.15`) | **5** |
| Endpoints with `fade === 0` at `t0` and `t1` | **1,850 / 1,850** |

---

## Finding 4 (P3/P4) — Laid track is not writable by callers

### What changed
- `src/world/flightPaths.ts`:
  - Marked all `FlockTrack` fields `readonly` (`readonly pts: ArrayLike<number>`, `readonly ds`, `readonly nearIdx`, `readonly nearM`).
- `src/world/lifeSchedule.ts`:
  - Marked all `LaidFlock` fields `readonly` (`track`, `nearM`, `rate`, `offset`).
  - `lay()` returns `Object.freeze({ track: Object.freeze(track), nearM: track.nearM, rate, offset })`.
  - Captured `flight`, a shallow copy of `camera` (`{ ...ctx.camera }`), and a shallow copy of `home` (`home ? { ...home } : undefined`) when constructing each `FlockEvent`, so caller edits to `event.home` or `ctx` before first `lay()` cannot alter steering.
- `src/world/lifeSchedule.test.ts`:
  - Verified `Object.isFrozen(laid)`, `Object.isFrozen(laid.track)`, and that mutating `event.home.e` before `lay()` produces identical track points.

---

## Finding 5 (P3/P5) — Laziness is tested deterministically

### What changed
- `src/world/lifeSchedule.ts`:
  - Added `laid: () => boolean` to `FlockEvent` (returns `true` once `lay()` has run).
- `src/world/lifeSchedule.test.ts`:
  - Added a deterministic laziness gate: builds a full day schedule (`245` flocks), asserts `0` are laid before `lifeAt`, samples `lifeAt` at one moment `tt`, and asserts `laidCount === overlapping.length` and `laidCount < 0.25 * totalDayFlocks`.
- `src/world/flockLazy.test.ts`:
  - Kept the first-build timing log and generous ceiling (`1,400 ms` local, `4,200 ms` in CI) as a smoke test (`haifa`: `643 ms`, `shadmot-mehola`: `474 ms`).

### Numbers — laid count vs overlapping (`lifeSchedule.test.ts`)

| Metric | Value |
| --- | ---: |
| Laid before `lifeAt` | **0** |
| Events overlapping `[tt, tt + AHEAD_S]` | **4** |
| Events laid after single `lifeAt` call | **4** (`=== overlapping`) |
| Total day flock events | **245** |
| Share laid (`< 25 %` gate) | **1.63 %** (`4 / 245`) — **PASS** |

---

## Finding 6 (P3/P6) — Travel checks measure what is seen

### What changed
- `src/scene/model/birdsTravel.test.ts`:
  - Filtered measured bird layers to only those whose laid pose is inside the sky (`0 <= x <= geom.width`, `0 <= y <= geom.horizon`) and whose laid opacity is `>= 0.2` at **both** `phase = 0` and `phase = 10`.
  - Made per-place and aggregate tests independent of test execution order via a memoised `samplesFor(id)` helper.
  - Preserved all existing travel thresholds.
- `e2e/birds.motion.mjs`:
  - Tracked total followed clusters across moments (`measured += tracks.length`) and exited with code `1` (`no flock measured`) if `measured === 0`.

### Numbers — measured 10 s visible travel (`birdsTravel.test.ts`, `haifa`, `tel-aviv`, `shadmot-mehola`, `2026-11-17`, `05:00`–`19:00` every 20 min)

| Kind | Count | Median 10 s travel (CSS px) | Min (CSS px) | Max (CSS px) | Median `distanceM` | Median `nearM` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `bat` | 3 | 13.44 | 9.51 | 18.75 | 203 m | 52 m |
| `gull` | 15 | 4.62 | 1.01 | 29.39 | 833 m | 432 m |
| `pigeon` | 17 | 9.97 | 2.23 | 46.60 | 692 m | 316 m |
| `crane` | 7 | 2.07 | 1.43 | 3.24 | 3830 m | 2255 m |
| `crow` | 13 | 12.09 | 2.17 | 32.96 | 505 m | 300 m |
| **All visible flocks** | **55** | **7.80** | **1.01** | **46.60** | — | — |
| **Mid-range (`distanceM < 1500 m`)** | **45** | **11.66** | **2.10** | **46.60** | — | — |
| **Near (`distanceM < 700 m`)** | **27** | **16.59** | **7.45** | **46.60** | — | — |

Thresholds:
- Visible flock count `>= 20`: **PASS** (`55`)
- Median over `distanceM < 1500 m` `>= 8 px`: **PASS** (`11.66 px`, `45` flocks)
- Every visible flock `>= 0.3 px`: **PASS** (min `1.01 px`)
- Every visible flock with `distanceM < 700 m` `>= 5 px`: **PASS** (`27 / 27`, min `7.45 px`, median `16.59 px`)

---

## Verification gates

- `npx tsc -b`: **PASS** (0 errors)
- `npx oxlint`: **PASS** (0 errors; 0 warnings in touched files)
- `npx vitest run --maxWorkers=4 src/world src/scene/model`: **PASS** (`47 passed (47)`, `674 passed (674)`)
