# Brief N1: the cloud field core (`src/world/field/`)

You are writing TypeScript in the Shamayim repo (a Hebrew weather PWA with a canvas valley scene). Work in this
directory only. Read first:
- `docs/design/qa/polish/track-d/SPEC.md`: the whole design. This brief is phase N1 of it (§1, §2, §3's projection
  functions).
- `src/world/clouds.ts`: `layerCovers`, `lowBaseM`, `Covers`, `LEVELS`. Keep that file untouched in this phase.
- `src/world/wind.ts` and `src/world/livingLight.ts` (`cloudDriftKm`): how the wind aloft is read today.
- `src/data/landmarks/hash.ts`: `hashId` and `seeded`, the only randomness allowed.
- `src/domain/types.ts`: `HourPoint` (`windAloft` = 850, 700 and 300 hPa vectors `{ speed km/h, fromDeg }`), `LocalTime`.

## What to build

New modules under `src/world/field/`, each ≤ 150 lines, DRY, with meaningful names and a short doc comment on each export:

1. `types.ts`
   - `Lattice = 'low' | 'tower' | 'mid' | 'high'`
   - `Genus = 'cu' | 'cg' | 'cb' | 'sc' | 'st' | 'ac' | 'as' | 'ns' | 'ci' | 'cs'`
   - `LayerForm { conv; strat; sheet; veil }`, all 0–1.
   - `FieldLayer`:
     - `lattice`;
     - `baseKm` (above the eye) and `meanVKm`;
     - `cover`: this lattice's plan cover, 0–1;
     - `Q`, `g`, `floorTau`, `kappa`, `form`;
     - `d: [eastKm, northKm]`: the air frame's displacement at `t`;
     - `vel: [eastKmPerMin, northKmPerMin]`: the steering wind at `t`.
   - `FieldCell`:
     - `id` (`${lattice}:${i}:${j}`), `lattice`;
     - `x`, `y`: km east and north of the eye;
     - `r` (km), `baseKm`, `vKm`, `tau0`, `share` (0–1), `seed`, `genus`, `rank`;
     - `axis?`: deg, high lattice only.
   - `CloudField { placeId; t: number /* minutes */; layers: FieldLayer[] }`
   - `FieldInput`:
     - `placeId`, `hours: readonly HourPoint[]`, `at: LocalTime`;
     - `covers: Covers` (low, mid, high, 0–1, as `layerCovers` gives them);
     - `lowBaseKm`, `elevationKm`;
     - `weatherCode`, `rateMmH`, `sunAltitude`;
     - `wind10: { speedKmh; fromDeg }` (the shown 10 m wind, for the fallback).
2. `genus.ts`: the §1.4 table as constants; `formOf(input, covers): LayerForm[lattice]` per §1.5 (no CAPE, so `conv`
   comes from the code only); `genusOf(lattice, form, rank)`.
3. `lattice.ts`: `siteAt(placeId, lattice, i, j)` gives the static site attributes (§1.3). Keep a typed-array block
   cache of 128×128 sites, LRU 2, rebuilt when the eye nears an edge. Also the clump noise `clumpAt(q, lattice)`, a
   2-octave value noise seeded by place and lattice.
4. `occupancy.ts`: `lambdaOf(c)`, `occupancyOf(lattice, c)` → `{ Q, g, floorTau }`, `shareOf(rankAtT, Q)` (δ = 0.25), and
   the per-lattice correction table produced by test 1.
   - The low cover is split: the tower lattice takes `conv·min(c_low, 0.5)`, and the low lattice the rest, so that
     `1 − (1 − c_lowLattice)(1 − c_tower) = c_low`.
5. `advect.ts`:
   - `steeringWind(hour, zAslKm)` → `[eastKmPerMin, northKmPerMin]`. Interpolate linearly in height between 10 m, 1.46,
     3.01 and 9.16 km asl. The vector points where the wind blows **to**: `fromDeg + 180`. Above 9.16 km hold; clamp the
     speed at 250 km/h.
     - Fallback with no `windAloft`: ×1.4 / ×2 / ×3 of the 10 m wind, veered +20° / +30° / +30°.
   - `displacement(hours, at, zAslKm, anchorOffset)` → `{ d, vel }`: trapezoid cumulative sums cached per
     `hours` identity in a `WeakMap`, O(1) per call afterwards; in-hour `cum[h] + a·f + (b − a)·f²/2`, per component.
   - Anchor: the first local midnight in `hours`, plus `anchorOffset = 500 km × seeded(hash(placeId, date(anchor),
     lattice))`, a random direction.
6. `field.ts`: `buildField(input): CloudField`. Cheap, with no per-site work: the layers' parameters only.
7. `cells.ts`:
   - `cellsAround(field, lattice, x, y, radiusKm, dtMin = 0): FieldCell[]`: on-cells (`share > 0`) whose centre lies
     within the radius, positioned at `t + dtMin` by `vel`. These are the motion keyframes.
   - `cellsAt(field, lattice, x, y)`: the 3×3 sites around the point, 5×5 when `g > 1.5`.
   - Both read the site cache.
   - Life cycle: `rank(t) = u' + 0.12·sin(2π(t/T + φ))`.
8. `project.ts` (§3):
   - `R_EFF_KM = 7433`;
   - `altitudeOf(zKm, dKm)`, `groundRangeAt(zKm, altDeg)`;
   - `projectCell(cell)` → `{ az, aFar, aNear, aTop, rangeKm, widthDeg }`.

Time: `t` = minutes of the local wall time parsed as UTC (`Date.UTC` of the `at` string's fields). This is continuous
except at a DST change. State that in a comment. Never read a clock.

## Tests (vitest, `src/world/field/*.test.ts`)

- **Test 1, cover calibration** (SPEC §8.1). For each lattice and c ∈ {0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.98, 1}:
  - 4,000 seeded plan points over 60×60 km, at 3 times;
  - covered = the point lies inside some on-cell's disc of radius `R_i`, or the floor closes it (c ≥ 0.98);
  - expect `|covered − c| ≤ 0.04`, and exactly 1 at c = 1.
  - Build the correction table so this passes. Print the table from a script, not from the test.
- **Test 4, continuity.** Minute by minute over 48 h of the fixture `src/test/fixtures/forecast-layers-2026-11-17.json`,
  through midnight and hour boundaries:
  - each id present at both minutes moves no more than `speed·1 min` and matches `vel` integration within 1 m;
  - `|Δshare| ≤ 0.15` per minute;
  - no new id appears with share > 0.15.
- **Test 5, difference.** Comparing t with t + 3 h, and with the same hour on the next day: fewer than 20 % of cells are
  within 1° of their old direction.
- **Projection tests.**
  - `aFar < aNear ≤ 90`;
  - for equal base heights, the base line is monotonic in range;
  - a 1.5 km base vanishes below 0° at about 149 km.
- Look at how the existing tests load fixtures (`grep -rn "forecast-layers" src`) and do the same.

## Precision

Pay attention to subtleties and physical accuracy:
- real cloud base heights and thicknesses per genus (the SPEC table: WMO étages);
- real cell sizes and pitch;
- the Boolean-model coverage formula with overlap;
- true perspective with Earth curvature and standard refraction (`R_eff`);
- wind vector conventions: meteorological "from" versus the direction it moves, east and north components, km/h →
  km/min;
- units on every variable name or in its comment.

No unstated approximations: every approximation gets a comment with its size of error.

## Rules

- Seeded randomness only (`hashId` / `seeded`); no `Math.random`, no `Date.now`, no clock.
- Do not edit files outside `src/world/field/`. Do not commit. Do not touch `package.json`.
- Perf: `buildField` < 0.5 ms. `cellsAround` with a 10 km radius on the low lattice < 1 ms warm. Add a rough timing
  assertion with generous slack (×5).
- When done, run:
  - `npx vitest run src/world/field`
  - `npx tsc -b`
  - `npx oxlint src/world/field`

  All must be green. Then write `docs/design/qa/polish/track-d/N1-report.md`: what you built, the correction table, the
  test results, and any deviation from the SPEC with its reason.
