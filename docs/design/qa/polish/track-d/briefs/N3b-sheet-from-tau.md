# N3b: the sheet is the field's optical depth (fix round for N3a)

N3a (uncommitted, in the tree) gets the projection right: there is an inverse dome, a curved-earth ground range, rows
that compress toward the horizon, buffer reuse and the far-edge fade. Keep all of that. The opacity, though, is wrong.

In `cloudSheetTexture.ts:40-47`, alpha is a smoothstep threshold of two triangle waves, and the field's τ enters with
weight 0.04. The result is that the drawn sheet ignores the cells that cast the shadows and block the sun (one world
state, broken). It is also why "τ > 2 gives α > 0.7" fails: you measured min α 0.22–0.49. Triangle waves also print
regular stripes, while real decks are not periodic.

## Must fix
1. **Opacity comes from τ along the line of sight.** At each node, take `τv = densityGrid.tauAt(x, y)` within the query
   range and the snapshot's expected τ beyond it. Then:
   - `τslant = τv × m`, where `m` is the path-length factor through a layer of thickness `meanVKm` at the ray's
     elevation angle in the layer. Use the curved-earth geometry you already have (it is `1 / sin(elevation)` at
     zenith), and cap it at the far-edge chord.
   - `alpha = mix × path × (1 − exp(−κ × τslant × texture))`. Use the layer's own `kappa`, the same extinction the
     light uses (`world/field/extinction.ts`). Do not invent a constant.
   - With this, coverage = cover follows from the field's own calibration (N1, which is tested). Delete
     `threshold()` and the noise quantile.
2. **The texture modulates τ and must preserve the mean.** `texture` is a seeded, advected, multi-scale value noise
   with mean exactly 1 over the place's area. Build it from `clump.ts` / `createClumpSampler`: smooth value noise, no
   triangle waves, no periodic tile visible across a 375 px sky.
   - Shape it by genus, with these amplitudes and scales:
     - st: σ about 0.15 at 8 km;
     - sc: σ about 0.5 at 1.5 km, cellular, with gaps that reach under 0.3;
     - as: σ about 0.3, stretched 1:6 along the wind;
     - ac: σ about 0.6 at 0.6 km;
     - cs/ci: σ about 0.1.
   - Fade the fine octaves to 1 when their wavelength falls under a texel footprint. Keep your footprint logic: that is
     the anti-aliasing, and the mean stays 1.
   - The texture never makes τ negative. It must not change the area-mean τ by more than 1 %. Test that.
3. **Tone** stays as N3a has it (τ-driven, lit toward the sun). Check that a gap (low τ) is lit and the thick core is
   shade.
4. **Tests** (update `cloudSheet.test.ts`):
   - dense ray: τv > 2 and an elevation over 20° give α > 0.7;
   - clear ray: τv = floor gives α < 0.15 for a low cover of 0.3;
   - coverage: the world-area fraction with α > 0.5 is within ±0.05 of cover on your 72 fixtures. Report it per
     lattice;
   - continuity: ≤ 0.08 (keep);
   - texture mean: within 1 %, and texture ≥ 0;
   - agreement with the shadows: at the sun's own direction, `1 − alpha` and `light.eye`'s transmission for the same
     layer are within 0.15, at three fixtures with the sun above 25°.
5. **Vertical grid.** The maximum row gap of 40 px is too coarse for Sc lumps overhead. Cap row gaps at 12 px and keep
   the monotone compression toward the horizon. Report rows × cols and the ms.
6. **Perf.** Run `cloudSheet.perf.test.ts` locally once (it is targeted, so this is allowed) and report the increment
   and the ratio to baseline. The budget is ≤ 1.5 ms and ≤ 0.25.

## Precision
- Every number has a physical source: κ and τ from the field, and the thickness from `meanVKm`. Say where each comes
  from.
- Coverage is measured in world area. The texture keeps the mean τ, so the shadows (which read τ without the texture)
  and the sheet agree on average. Say what the per-node disagreement bound is.

## Rules
- Never run a multi-line `npx tsx -e`. Use a temp script and `./node_modules/.bin/<tool>`.
- Pure, seeded, no clock, no `ctx.filter`. Files ≤ ~150 lines, DRY, no dead code (remove `threshold` and
  `triangle`).
- Don't touch `src/scene/paint/cloudSheet.ts` or the `cloudSheet` type. Do not commit.
- Run `tsc -b`, oxlint on the touched files, and vitest for `cloudSheet*`, `clouds`, `sky` and `model`.
- Append `## Round 9 (N3b)` to `N2-report.md`.
