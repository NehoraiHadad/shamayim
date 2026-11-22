# N3k: alpha is the texel's coverage, not a point sample (after the fd5c903 stills)

The painter now blends rows correctly (fd5c903). The broken Sc stills still show stair-steps about 9 CSS px wide
along every cloud edge, and the element rows near the horizon read as a dither pattern.

**Cause:** each texel point-samples a sharp-edged field. N3f's edge contrast then sharpens it over about one texel,
so the alpha is nearly binary per texel. Bilinear upscaling of a binary texel pattern draws its steps. That is
aliasing in the model.

## Must do
1. **Find the grid that is drawn.** For jerusalem broken low, report the genus, cols × rows, and the texel angular
   size. If 9 px steps mean the low sheet is on a broad (24-column) grid, say why. Sc must use the 144-column grid.
2. **Anti-alias the opacity.** Alpha is the expected transmission over the texel's footprint on the deck:
   `1 − mean(exp(−τ))` over the texel's footprint.
   - Use the analytic edge coverage of the nearest cells, or 2 × 2 (3 × 3 where the edge crosses) jittered-free
     stratified sub-samples of `tauAt`, whichever passes the perf gate.
   - Remove the N3f per-texel edge contrast if coverage makes it redundant; real edge sharpness comes from the
     kernel, resolved at sub-texel scale.
   - The coverage must stay the same field: it averages the instantaneous `tauAt`, so shadows and light still agree.
3. **Tests.**
   - On jerusalem broken low, the fraction of edge texels (any neighbour Δα > 0.5) whose α lies in 0.15–0.85 is
     ≥ 0.6. That proves edges are fractional, not binary.
   - The coverage mean equals the old point-sample mean over the sky within ±0.02, so cover is unchanged.
   - The motion-compensated continuity gate still passes.
4. **Perf:** stay within N3j's budget result. Sub-sample only texels whose neighbours differ.

## Precision / Rules
- Same as N3j: every constant carries its source, no per-place tuning.
- Never run a multi-line `npx tsx -e`. Use a temp script and `./node_modules/.bin/<tool>`.
- Pure, seeded. Files ≤ ~150 lines, DRY, no dead code. Do not commit. Don't touch the painter.
- Run `tsc -b`, oxlint on the touched files, and vitest with explicit paths (the N3j list).
- Append `## Round 18 (N3k)` to `N2-report.md`.

## Also: cold snapshot cost (from N3j)
N3j reports 8.57–8.93 ms cold per new snapshot (once a minute). Profile it and say what dominates: the raster
build, the 144 × 73 grid, or the texture samplers. Bring it to ≤ 4 ms CI-equivalent without changing the gates, or
report the floor and why. A cold minute must never drop a frame on a mid phone: a 16 ms frame with the rest of the
scene in it.
