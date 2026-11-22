# IMPL-1 — birds travel across the sky (stopped on threshold failure per brief)

Status: **Stopped** as instructed by `BRIEF-neon-1.md` ("If a threshold fails with the numbers above, do NOT loosen it: stop and report the measured numbers in IMPL-1.md").

## What changed

1. `src/world/lifeSchedule.ts`:
   - Updated `GROUP` ground speeds (`reach` unchanged):
     `stork: 10`, `crane: 15`, `swift: 10`, `gull: 9`, `raptor: 2` (actual speed set in `flockEvents`), `crow: 11`, `pigeon: 14`, `bat: 6`.
   - Rewrote the doc comment above `GROUP` to explain that `speedMs` is each flock's real ground speed across the sky while the composite loop adds each bird's wing beats and wheeling round its place (removed "wanders slowly").
   - Updated raptor `speedMs` in `flockEvents` from `1 + 0.35 * Math.min(8, input.wind.ms)` to `2 + 0.6 * Math.min(8, input.wind.ms)`, keeping the `(0.85 + 0.3 * q())` spread.
   - Left `arrivals`, `MAX_FLOCKS`, and `PREVALENCE` untouched.
2. `src/world/life.ts`:
   - Updated `SHAPES` closer passage distances: `stork.distanceM` `[1400, 3000]` → `[800, 2200]`, `crane.distanceM` `[1800, 4000]` → `[1200, 3000]`. Nothing else in `SHAPES` changed.
3. `src/scene/model/birdsTravel.test.ts` (new, 66 lines):
   - Measures 10 s travel (`distance(pose(layer, 0).point, pose(layer, 10).point)` via `sceneModel(world, BOX, null, LIFE_START)`) for every non-`.front` `birds.*` layer across `haifa`, `tel-aviv`, `shadmot-mehola` every 20 minutes from `05:00` to `19:00` on `2026-11-17`, with a 60 s per-place timeout and the exact thresholds from `BRIEF-neon-1.md`.

## Measured 10 s travel (`birdsTravel.test.ts`)

Logged across `haifa`, `tel-aviv`, `shadmot-mehola` (`2026-11-17`, `05:00`–`19:00` every 20 min, 87 flocks total; no storks, swifts, or raptors fly on this November fixture):

| Kind | Count | Median 10 s travel (CSS px) | Min (CSS px) | Max (CSS px) | Median `distanceM` | Median `nearM` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `bat` | 6 | 8.01 | 5.50 | 17.80 | 250 m | 66 m |
| `gull` | 24 | 3.01 | 0.61 | 28.10 | 1073 m | 457 m |
| `pigeon` | 30 | 6.48 | 1.16 | 48.21 | 981 m | 293 m |
| `crane` | 8 | 2.24 | 1.14 | 3.34 | 4020 m | 2237 m |
| `crow` | 19 | 4.77 | 1.62 | 31.42 | 820 m | 300 m |
| **All flocks** | **87** | **4.77** | **0.61** | **48.21** | — | — |
| **Near (`distanceM < 700 m`)** | **36** | **14.53** | **5.50** | **48.21** | — | — |

### Threshold check

- **Count ≥ 20**: PASS (`87 >= 20`).
- **Every flock with `distanceM < 700 m` travels ≥ 5 px in 10 s**: PASS (`36 / 36`, min `5.50 px`, median `14.53 px`).
- **Median 10 s travel of all flocks ≥ 8 px**: **FAIL (`4.77 px < 8 px`)**. Threshold was not loosened.

### Why the overall median is 4.77 px despite near flocks moving at 14.53 px

With `GROUP.reach` kept at `6` for residents (`gull`, `pigeon`, `crow`, `swift`), `5` for `bat`/`raptor`, and `4` for `crane`/`stork`, a straight pass from `−√(reach² − 1) · nearM` to `+√(reach² − 1) · nearM` spends over half its session at `distanceM ≈ 2.3–3.8 × nearM` (well beyond 700 m, and still visible because `fade` only starts at `0.55 × endM = 3.3 × nearM`). Because transverse angular velocity on a straight pass drops as `(nearM / distanceM)²`, flocks in those long distant approach/departure tails (51 of 87 samples are at `distanceM ≥ 700 m`, including 8 cranes at median 4020 m) travel 1–4 px in 10 s and pull the overall median to 4.77 px.

## Verification & other test findings

- `npx tsc -b`: passed (0 errors).
- `npx oxlint`: passed (0 errors; only pre-existing warnings in unrelated files).
- `npx vitest run src/world src/scene/model` (run before stopping; no existing tests were modified yet because we stopped on the `birdsTravel.test.ts` threshold failure):
  1. **`src/scene/model/birdsTravel.test.ts`**: failed on overall median (`4.77 < 8`).
  2. **`src/world/lifeSchedule.test.ts`** (old slow-speed expectation): line 56 expects `< 25°` azimuth change in 60 s at closest approach; measured `72.97°` (expected with 6–14 m/s close resident passes).
  3. **`src/scene/model/continuity.test.ts`** (old slow-speed expectation): line 80–81 expects birds to move `< 45 px` in 60 s; measured up to `221.50 px` (tel-aviv `bat:10`), `166.65 px` (haifa `bat:9`), `191.54 px` (jerusalem `bat:10`).
  4. **`src/scene/model/flight.test.ts`**: 2 of 12 places failed line 111 (`hidden in the open`): `shadmot-mehola birds.2026-11-17:crow:37 at 2026-11-17T16:16` and `tiberias birds.2026-11-17:crow:6 at 2026-11-17T07:04` (likely exposed by ~10× more daily crow sessions testing terrain sight-line edge cases).
  5. **Schedule build runtime regression (~10× more daily flocks)**: because `sessionS` dropped ~10× while `PREVALENCE` and `reach` stayed fixed, `flockEvents` now generates and lays terrain tracks (`wayOf` + up to 4× `heightsOver`/`unclear`) for ~10× more resident flocks per day. When running all 46 test files in parallel (`npx vitest run src/world src/scene/model`), total runtime jumped to 703 s and 6 other files timed out (`drawnSkyline.test.ts`, `c10.test.ts`, `c10fixes.test.ts`, `lifeContinuity.test.ts`, `water.test.ts`, `weather.test.ts`). Running `lifeContinuity.test.ts` solo still passes all 4 tests in 42 s.

## Tests changed

None of the existing test files were modified, because execution stopped on the `birdsTravel.test.ts` median threshold failure per the brief.
