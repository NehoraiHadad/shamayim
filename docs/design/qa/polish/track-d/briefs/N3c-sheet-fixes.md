# N3c: sheet fix round (after N3b, Round 9)

N3b is on the right track: the opacity comes from the snapshot τ, the texture preserves the mean, and the rows are
12 px. The failures and their causes:

## Must fix (ranked)
1. **κ counted twice.** `tauAt` is already an optical depth: it sums `kappa × thickness`-derived τ. Your Round 9
   report says so.
   - Use `alpha = mix × path × (1 − exp(−τv × m × texture))`, with no extra `kappa`.
   - This also removes most of the 0/1 saturation behind the continuity failure.
   - Revise the `light.eye` agreement test accordingly. Gate it at ≤ 0.20 per node. Report the max and the p95 per
     place.
2. **Footprint averaging (anti-aliasing), the second cause of Δα = 1.0.** A node point-samples τ even when its texel's
   ground footprint covers many cells (near the horizon, one px is kilometres). Blend from the point sample to the
   expected τ over the footprint as the footprint grows past the layer's cell radius:
   - let `f = smoothstep(0.5·r̄, 2·r̄, footprint)`, where `r̄` is the lattice's mean cell radius from the field;
   - use `τ = (1 − f)·tauAt + f·expected`, where `expected` is the snapshot's own expected-density path, so there is
     still one field;
   - in transmission, average `exp(−τ)` rather than τ where you can do it cheaply (the expected transmission of the
     Boolean model). Otherwise state the bias.

   Then gate continuity at max |Δα| ≤ 0.08 per minute for rows whose footprint is below `r̄`. For finer rows, gate
   the p99 at ≤ 0.15 and report the max. Real cell edges do move, but at 10 km/h a cell edge moves about 0.17 km a
   minute. Bound the expected Δα from the kernel's edge slope and show that the gate is consistent with it.
3. **The coverage test is physically wrong for veils.** A Cs or Ci veil at a cover of 0.81 is translucent (τ ≈
   0.2–0.8), so `alpha > 0.5` measures opacity, not coverage.
   - Measure coverage as the world-area fraction where the textured τ exceeds `floorTau + 0.05`. That is the occupancy
     N1 calibrates.
   - Gate it at ±0.05 per lattice.
   - Keep the dense-ray (α > 0.7) and clear-ray tests.
4. **Perf: an increment of 4.0–4.9 ms against a budget of 1.5 ms.**
   - Profile it, then cut the cost in this order:
     - skip lattices whose `sheetBlend` is 0;
     - evaluate the texture only where `τv > floorTau` or `f > 0`;
     - cap the octaves by the footprint (none finer than the texel);
     - reuse per-row trig and per-column directions (already partly done);
     - hoist the `densityGrid` lookups.
   - If it is still over budget, reduce the columns to 40 and the row cap to 14 px and report the visual cost.
   - Report the increment and the ratio per place. The budget is ≤ 1.5 ms and ≤ 0.25.

## Precision
- State each number's source: τ and the expected density from the snapshot, `r̄` from the lattice, the thickness from
  `meanVKm`.
- No point fixes per place or per genus beyond the texture table.

## Rules
- Never run a multi-line `npx tsx -e`. Use a temp script and `./node_modules/.bin/<tool>`.
- Pure, seeded, no clock. Files ≤ ~150 lines, DRY, no dead code.
- Don't touch `src/scene/paint/cloudSheet.ts` or the `cloudSheet` type. Do not commit.
- Run `tsc -b`, oxlint on the touched files, and vitest with explicit paths: `src/scene/model/cloudSheet.test.ts`,
  `cloudSheet.perf.test.ts`, `clouds.test.ts` if present, `sky.test.ts`, `model.test.ts`.
- Append `## Round 10 (N3c)` to `N2-report.md`.
