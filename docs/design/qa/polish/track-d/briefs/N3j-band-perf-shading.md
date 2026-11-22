# N3j: the horizon seam, perf, cell shading, the Cs veil (after the e25e4ca stills)

CI run 45014110205 at e25e4ca: `check` fails on 2 gates, the seam (`cloudSheetLook.test.ts`) and perf (haifa).
From the stills:
- **Broken Sc reads as a sky at last.** There are distinct opaque elements with blue gaps, and rows of flattened
  elements near the horizon.
- **Stair-steps:** Claude's painter fixes them in the same commit as this brief (rows are resampled before one draw).
  Don't touch it.

## Must do (ranked)
1. **The seam band (gate: lasting row-mean step ≤ 0.03).**
   - The gate now compares 6-row window means (a cell edge is a real per-pixel step). It measures 0.089 Jerusalem,
     0.087 Shadmot Mehola, 0.046 Haifa showers.
   - In the stills there is a pale flat strip between the lowest element rows and the horizon, and a step where the
     resolved element rows start.
   - Find each step's altitude, which layer it is in, and its cause (the footprint hand-off, the raster's far edge,
     the horizon heap band, or the haze). Fix the cause so the deck runs through to the horizon with aerial
     perspective, not on a line.
   - Report the gate per place after the fix.
2. **Perf: haifa 1.93 ms against ≤ 1.5 ms** (`incrementMs + rasterDeltaMs`; Jerusalem passes).
   - Profile the raster extension and the 144 × 73 grid.
   - Allowed: bin the far annulus at a coarser step, cap the raster at the footprint rule, and memo per lattice and
     minute.
   - Not allowed: shrinking the grid below what the element-aspect and no-flat-band gates need.
   - Report the ms per place.
3. **Cell shading.** The elements are flat grey cardboard.
   - A real Sc element seen from below has a dark, flat-ish base where it is thickest, brighter thin margins, and,
     toward the sun, forward-scattered bright rims (only where it is thin, as in N3d).
   - The tone already has τ; check that the tone ramp is actually driven per texel by the slant τ and the
     shading-only texture.
   - If τ inside an element is uniform (a flat kernel top), the kernel shape is the cause. Use the clump kernel's
     own profile so τ falls toward the edges.
   - Test: inside elements with α > 0.9 on Jerusalem broken, the tone's p10–p90 is ≥ 0.15. Also, the mean tone of
     the edge texels (α 0.3–0.7) is brighter than that of the core texels by ≥ 0.1.
4. **Overhead wedges.** Above about 40° the gaps are still tall vertical slots.
   - The camera's vertical px per degree exaggerates height there (it is physically drawn so), but check whether
     the cells' footprint shape is still circular in world space at that range. The radial elongation might come
     from the anisotropic `rMinor`/axis, or from the advection direction.
   - Report the median world-space aspect of the low cells in the overhead sector.
5. **The Cs veil (jerusalem 07:15 cirrus still).** It reads as grey blotches with blue holes. Cs is a thin,
   near-uniform, milky white veil: τ about 0.1–1, little texture, and a tone close to the sunlit side, not grey.
   - Check the Cs tone and alpha: is its tone pulled to `shade` by the opaque-deck ramp?
   - Test: on the cirrus fixture, the Cs sheet's alpha p10–p90 spread is ≤ 0.25, and its mean tone is brighter
     (lower) than 0.4.

## Precision
- Every number carries its source. No per-place tuning. The painter and the camera stay as they are.

## Rules
- Never run a multi-line `npx tsx -e`. Use a temp script and `./node_modules/.bin/<tool>`.
- Pure, seeded, no clock. Files ≤ ~150 lines, DRY, no dead code. Do not commit.
- Edit only `src/scene/model/cloudSheet*.ts`, `src/scene/model/clouds.ts`, `src/world/field/density.ts`, `cells.ts`
  and `clump.ts` (kernel profile), and their tests.
- Run `tsc -b`, oxlint on the touched files, and vitest with explicit paths: the cloudSheet tests, `sky.test.ts`,
  `weather.test.ts`, `model.test.ts`, `c10fixes.test.ts`, `field.test.ts`, `continuity.test.ts`, `density.test.ts`,
  `transmit.test.ts`.
- Append `## Round 17 (N3j)` to `N2-report.md`.
