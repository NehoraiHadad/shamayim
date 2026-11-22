# N1c — second fix round for the cloud field core

You wrote N1b (commit 36698c5). The Opus review (round 2) returned **fix first again**. Most of the 19 items landed.
The three failing tests each have a different cause, given below with measurements. Fix everything here, in this
branch, without committing. Read `SPEC.md` §0–3, §6.0 and §7 again first.

## Budget (hard)
| Budget | Measures | Limit |
|---|---|---|
| Forecast arrival | `buildField` on a new hours array | ≤ 3 ms |
| Cold place scrub | new place, same forecast object, all 4 layers | ≤ 15 ms |
| Warm scrub | same place, next minute, all 4 layers | ≤ 3 ms |

Each is the median of at least 9 runs after one JIT warm-up. A new forecast arrives on refresh, not every scrub.

## Must fix
1. **The life cycle must not depend on genus** (`cells.ts:50-54`). Today a cell that flips Sc → Cu jumps its phase
   (t ≈ 2.9e7 min, so a period change moves the phase arbitrarily): share 0.26 → 0.96 in one minute.
   - One period and one phase per site per layer: low and tower T_cu 20–40 min, mid 60–180, high 90–240.
   - Blend Cu and Sc behaviour with the layer's stratus weight `w = form.strat`, not per cell:
     `amp = mix(1, 0.2/0.35, w)`;
     `rank = unit(u + amp·clump) + 0.075·[(1−w)·sin(2π(t/T_cu + φ)) + w·sin(2π(t/T_sc + φ))]`, `T_sc = 60 + 6·(T_cu − 20)`.
   - Genus is for dimensions and drawing only.
   - Amplitude 0.08 → 0.075. Fix the comment: 6 × 0.075 × 2 sin(π/20) = 0.141 (the old bound, 0.1502, was false).
2. **Make `layerCovers` continuous** (`src/world/clouds.ts:39-41`; you may edit this file and `src/world/*.test.ts`).
   `total >= 1 ? Infinity` makes every layer with any cover 1 at 100 % total, and at 98.9 % high is 0.38. Open-Meteo
   reports 100 % total often, so the app jumps every such hour, and dk/dtotal → ∞ also makes the mid ramp steep.
   - Compute k finitely from `t' = min(total, 0.98)`.
   - Blend to full: `covers = lerp(scaled(t'), (c > 0 ? 1 : 0), smoothstep(0.98, 1, total))`.
   - Test: as total moves 0.98 → 1.0 in 0.001 steps, no layer cover changes by more than 0.05 per step.
3. **Rewrite the continuity test** (`field.test.ts:59-99`). Keep the move and new-id assertions.
   - Replace the share check with the analytic per-cell bound `|Δs| ≤ 6·(|ΔQ| + 0.075·2 sin(π/T_min)) + 0.01`.
   - Also assert `|Δs| ≤ 0.15` on minutes where `|ΔQ| < 0.005`.
4. **Rewrite the directions test** (`field.test.ts:101-120`). It is ill-posed: an unrelated place at the same minute
   matches 0.444 by chance (tower crowds ~313 cells near the horizon).
   - Compare within each layer only.
   - Per layer assert `similar(t, t+Δ) ≤ similar(t, unrelated place at t) + 0.05`.
   - Keep `byId similar < 0.2`. Drop the absolute 20 %.
5. **Density grid steps** (`density.ts:9`): `{ low: 0.125, tower: 0.5, mid: 0.5, high: 1 }` km (measured RMS 3.9, 4.0,
   4.8, 2.7 %). Size the tower grid to what shading needs: `min(80, z_mid / tan 6°)` ≈ 40 km (rays at ≥ 6° cross the
   tower's mid-height within that distance; say so in a comment). Keep the 5 % RMS test.
6. **Grid allocation** (`density.ts:64`) dominates warm cost. Allocate 32×32 tiles lazily, only where a footprint lands;
   a missing tile returns `floorTau`. (Or one reused buffer per place and layer, documented as valid until the next
   call — tiles are preferred, they stay pure.)
7. **Visit cells once per layer per scrub.** Add `layerSnapshot(field, lattice, t)` running `visitCells` once and
   returning `{ cells, densityGrid }`. Today `cellsAround` and `densityGrid` enumerate the same sites twice.
8. **Single-pass steering precompute** (`field.ts:85-107`, `advect.ts:85-121`).
   - Parse `wallMinutes` once per hour, run `profile()` once per hour, fill all 4 layer timelines in that loop.
   - Replace `anchorDate` with a scan for the first midnight; no wind timeline.
   - Delete `displacement`, `displacementAt`, `timelineOf`, `motionAt` and the 4-height `Timeline` (test-only now);
     move the wind-vector test onto `steeringTimeline`. `advect.ts` must drop under 150 lines.
9. **Split the scrub timing test** (`density.test.ts:43-72`) into the three budgets above.
   - If warm still lands at 3.0–3.5 ms: hoist the closures out of `valueNoise` (`lattice.ts:72-94`), and write the 10
     values in `siteAt` directly instead of `block.data.set([...])` (`lattice.ts:126`, an array per site).

## Should fix
10. **Ring at the grid edge** (`density.ts:97-101`): cross-fade raster → expected mean over the outer 15 % of the
    individual range.
11. **DRY** (`cells.ts:56`): `visitCells` calls `shareOf`; no inline copy.
12. **Stratus and Ns gates** (`genus.ts:41-42`) are booleans, so every cell's genus flips at once. Make them weights:
    `smoothstep(0.85, 0.95, strat)·…`; Ns `smoothstep(0.4, 0.6, low·mid)` times a rain weight. `genusOf` compares
    those weights with the genus draw `ug`.

## Precision
Pay attention to subtleties and physical accuracy. Real cloud heights and sizes; ellipse areas; wind is "from", so it
blows toward from + 180; km/h ÷ 60 = km/min; above-ground versus sea-level heights. No unstated approximations: every
approximation gets a comment with its error bound. Bounds in comments must be computed, not guessed (item 1).

## Rules
- Never run a multi-line `npx tsx -e "..."`: on this Windows shell it waits on stdin and hangs. Write a temp script
  file and run `npx tsx <file>`.
- Pure and seeded: no `Math.random`, no `Date.now`, no clock. Caches are deterministic memoisation only.
- Files ≤ ~150 lines, DRY, meaningful names. Remove dead code you make.
- Edit only `src/world/field/`, `src/world/clouds.ts`, `src/world/*.test.ts`, `scripts/` and the report. Do not commit.
- Run only `npx tsc -b`, `npx oxlint src/world scripts`, `npx vitest run src/world` and the calibration script. No full
  suite, perf or Playwright: CI runs them. Regenerate the calibration table if the layout changed.
- Append `## Round 3` to `docs/design/qa/polish/track-d/N1-report.md`: per-item changes; the three timing medians;
  the calibration table with held-out errors; the continuity worst cases per layer after the fix; what you could not do
  and why.
