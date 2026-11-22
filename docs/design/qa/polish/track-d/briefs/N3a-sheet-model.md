# N3a — sheet-mode model: `cloudSheet.<lattice>` descs from the field (SPEC §6.0)

N2 is signed off (round 10, 7a93be4). The stills still draw the old blob painters: an overcast sky comes out as
separate shapes. SPEC §6.0 asks for layers before shapes. Read it first, together with its five photo findings.

The painter and the contract are done (5b85f7b, Claude's). Don't edit these files:
- `src/scene/paint/cloudSheet.ts` and its test;
- the `cloudSheet` member in `src/scene/model/types.ts`.

You write the model that fills the contract. Do not commit.

## Contract (`types.ts`, `kind: 'cloudSheet'`)
- `xs`: column centres in sky px. They must span the sky surface edge to edge (`xs[0] ≤ 0`, last ≥ sky width), because
  the painter stretches only between the outer centres.
- `ys`: row centres, top to bottom, ending at the horizon (`geom.horizon`). Space them evenly in ground range at the
  layer's height, not in px, so that the deck's perspective compression toward the horizon is sampled. Keep rows at
  least ~1.5 px apart. Expect about 24–40 rows and 40–64 columns per layer at 375 px.
- `alpha[n]` and `tone[n]`, row-major: the coverage after the soft threshold, and 0 lit to 1 shade.
- `body`, `shade`, `lit`: reuse the colours the existing `model/clouds.ts` `deckOf`/`litOf` use. Do not invent new
  ones.

## Must do
1. **`src/scene/model/cloudSheet.ts`** (new, ≤ 150 lines; split it if needed).
   - For each `world.cloudField` layer with sheet weight `s = max(form.strat, form.sheet, form.veil,
     smoothstep(0.35, 0.55, cover))` above 0.05, emit `cloudSheet.<lattice>`.
   - Use z just under the matching `clouds.<level>` (Z = high 6, mid 7, low 8), so that the layers stack high to low.
   - Per node, invert the sky geometry: x gives the azimuth, y the altitude. Add an exact inverse next to `skyGeom` if
     there is none.
   - March the ray to the layer's mid height at ground range `groundRangeAt(heightKm, alt)` (`world/field/project.ts`).
   - Read τ from the field's existing snapshot `densityGrid.tauAt`, the same data the shadows and the light use. Do not
     build a second field. Beyond the raster range, use the expected τ (`farStrips` / the layer mean).
2. **Genus texture.** Add a seeded, world-space, multi-scale noise, advected with the layer's `d`, so that the sheet
   moves with the wind and is continuous minute to minute.
   - Shape it by genus:
     - st: smooth, long wavelength;
     - sc: cellular lumps of about 1–2 km with lit gaps;
     - as: striated along the wind;
     - ac/cc: fine cells of about 0.3–0.8 km, aliased away gracefully when a cell falls under a texel;
     - cs: a near-uniform veil.
   - The noise must be pure (`clump.ts` style samplers, place-seeded). Never use `Math.random`, and never read the clock.
3. **Coverage equals cover by construction.**
   - Soft-threshold the density `D = cellsτ-normalised + noise` at θ, using a smoothstep of width w.
   - Choose θ from the noise's known CDF, so that the expected covered area fraction is the layer's `cover`.
   - Compute it analytically or from a fixed precomputed table. Never use a per-frame quantile: that would flicker.
   - Test: over 6 days × 4 hours × 3 places, the area-weighted mean of `alpha > 0.5`, taken over world area (not px),
     is within ±0.05 of `cover`.
4. **Tone.** The tone comes from the node's τ (thicker is darker underneath) and from the light that reaches the
   layer (`light.eye` / the layer transmission above). Lit gaps at the sheet's thin places face the sun. As the line of
   sight leaves the layer near the horizon, alpha falls, which makes the bright horizon strip (photo finding 1). Make
   it come out of the geometry. Do not paint a special band.
5. **Hand-off from the old painters.** Where `s` > 0.5, the old `deckOf` sheets and wash for that layer must step
   aside, with a continuous crossfade on `s` and no hard switch. The `cells` mode (conv genus, towers, horizon heaps)
   stays on the old sprites for now.
6. **Tests** (`cloudSheet.test.ts` in model):
   - coverage (item 3);
   - continuity: between minute t and t+1, the max |Δalpha| per node ≤ 0.08 at default wind;
   - the field agrees: a node whose ray hits a field cell with τ > 2 has alpha > 0.7;
   - horizon compression: the row spacing is monotonic decreasing toward the horizon;
   - purity: the same inputs give the same arrays.
7. **Perf.** `sceneModel` increment ≤ 1.5 ms per minute for all sheets together, measured the same way as
   `cloudShadowPanorama.test.ts` (ratio to the baseline model ≤ 0.25). Reuse the buffers per place and lattice, as N2f
   did.

## Precision
- Every node's ray is exact: the altitude is apparent, with the same refraction the sky uses. The ground range uses the
  curved earth `groundRangeAt`.
- Bound the screen error of the bilinear stretch: say in px at 375 px width how far a 1 km Sc lump can be misplaced by
  the grid spacing.
- Coverage is in world area, not screen px. The perspective weighting comes from the geometry.

## Rules
- Never run a multi-line `npx tsx -e`. Write a temp script and use `./node_modules/.bin/<tool>`; the npx shim is
  broken.
- Pure and seeded. No `ctx.filter`, no clock. Files ≤ ~150 lines, DRY, no dead code. Don't touch track A's glyph or
  face files, or track C's life, planes and birds files.
- Run `tsc -b`, oxlint on the touched files, and targeted vitest (`cloudSheet*`, `clouds`, `sky`, `model`, `field`).
- Append `## Round 8 (N3a)` to `docs/design/qa/polish/track-d/N2-report.md`, with:
  - the changes;
  - the coverage numbers;
  - the continuity numbers;
  - the ms;
  - the grid-error bound;
  - anything not done.
