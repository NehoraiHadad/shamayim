# N3h: broken Sc must read as a field of elements; the overcast horizon is too dark (after the d88def5 stills)

CI run 45011050810 stills at d88def5:
- The overcast is grey now (good), but the horizon is near black.
- In broken Sc the blue gaps still form vertical wedges that widen toward the horizon, with blurry, stair-stepped
  edges, and a flat white strip runs between about 5° and 20°.

An independent review at d88def5 measured the causes below. Re-verify each number before you act on it.

## Diagnosis (from the review)
- **The cells are the right size.**
  - Low lattice: pitch 1.5 km, radius multiplier g 2.06.
  - Radius p10 / p50 / p90 = 0.26 / 0.56 / 0.99 km, so the median element is about 1.1 km across. WMO Atlas: Sc
    elements subtend more than 5° when seen above 30°, and are about 0.5–2 km across physically.
  - Base 1.2 km, depth 0.4 km, τ₀ p50 about 15.
  - A few large elements overhead is physically right.
- **Anisotropic projection.** The camera is 1.5 px per degree of azimuth (375 px for 250°, `camera.ts:28`, correct,
  don't change it). Vertically it is about 4.3 px per degree at 45° and 8–10 px per degree near the zenith.
  - Elements are therefore drawn 2–2.4× taller than wide between 20° and 50°.
  - A cell's azimuth width falls as 1/range, so cloud columns narrow toward the horizon and the gaps widen. That is
    the wedge.
- **The grid is too coarse where Sc reads as a field.**
  - 48 columns (`cloudSheetGrid.ts:48`) are 5.3° each. At 10° an element is about 9° wide and 1.6° tall: under
    2 columns and about 1 row.
  - The fixed hand-off to the ensemble below 16°, complete by 10° (`cloudSheet.ts:77-78`), then gives the flat
    strip.
- **The sweep smears each cell by about one element.**
  - 11 one-minute taps at ±5 min and 0.133 km/min (`cloudSheet.ts:47,101-107`) smear 1.33 km along the wind (wind
    axis 106°/286°, both in view). Pointing away from the eye, that smear draws as vertical streaks.
  - It also makes the drawn sheet a 10-minute average, while shadows and `light.eye` read the instantaneous cells.
    That breaks one world state.
- **The texture duplicates the cell scale.** Sc is 1.5 km with octaves at 3 and 0.75 km (`cloudSheetTexture.ts:42,58`),
  sampled only at nodes, so it shifts blobs instead of adding lumpy detail.
- **Overcast horizon.**
  - Measured on the haifa still: zenith linear luminance about 0.50, just above the horizon about 0.037, about
    13.6 : 1.
  - CIE standard overcast `L(θ) = Lz(1 + 2 sin θ)/3` gives 3 : 1, and the code's own Eddington argument (μ + 2/3)
    gives 2.5 : 1.
  - Cause: `clouds.ts:303-304` builds the shade colour as `mixRgb(black, base, 2/5)`, and `mixRgb` interpolates in Lab
    (`tone.ts:45-47`). A 0.4 in L* is about 0.064 in luminance. `cloudSheet.ts:120,151` then drives the horizon to
    the full shade.

## Must do (ranked)
1. **Sweep ≤ one texel or 0.25·r̄.** Bound the swept distance to the smaller of the texel footprint and 0.25 × mean
   radius: 1–3 taps at today's wind. The drawn sheet becomes the same instantaneous field that `cloudShadows` and
   `light.eye` read. Keep the continuity gate, re-deriving its bound for the new tap count, and report p99 per lattice.
2. **Resolution and a footprint hand-off.**
   - Sc and Ac columns: 48 → about 144.
   - Rows: about 72, packed into 5–30° by the vertical px-per-degree.
   - Replace the fixed 10–16° fade with a footprint test: fade to the ensemble only where `2·r̄` is under 2 texels.
   - Keep τ from `tauAt` per texel, so shadows, light and coverage still agree.
   - Perf: the review estimates about 10.5k `tauAt` calls against 19.5k today. Report the CI-equivalent local
     increment, against a budget of ≤ 1.5 ms.
3. **Sc/Ac texture: shading only, at sub-element scale.**
   - Set Sc to about 0.3–0.5 km and Ac to its sub-element scale, with one fine octave.
   - Feed it into **tone only**; remove it from alpha (`edgeTexture`). Opacity and optical depth then come only from
     cells, so shadows, eye transmission and coverage cannot diverge.
   - `textureCorrection` keeps the mean tone unbiased.
   - If the N3f elevation-aware texture filtering becomes dead code, remove it.
4. **Overcast luminance.**
   - Apply the 2/5 shade as a luminance factor (scale linear RGB, or a lightness mix of 0.4^(1/3) ≈ 0.74). Better:
     make the closed-deck tone ramp follow `(sin alt + 2/3)/(5/3)` in linear light.
   - Test: for a closed overcast (τ ≥ 10 everywhere), the painted zenith-to-horizon luminance ratio (5° above the
     horizon) is within [2.5, 3.5].
   - Check every other `mixRgb(black, …)` darkening in the cloud tone path for the same Lab-for-luminance error.
     List them and fix those that mean a luminance factor.
5. **Optional, only if items 1–4 leave the crisp rims missing above 30°:** say so, and propose the projected-ellipse
   rim method (as in `cloudShadows`) for Claude's painter. Do not edit the painter.
6. **Optional, model:** the Sc mesoscale is 10–50 km (Atkinson & Zhang 1996; Wood & Hartmann 2006), and the
   low-lattice clump wavelength is 12 km (`lattice.ts:7`). Raise it to about 25 km only if the N3e/N3g field tests
   (cover through the handover, refresh invariance) still pass unchanged. Report it either way.

## Tests (new)
- **Projected element aspect.** On jerusalem broken, measure the connected-component bounding boxes of the low alpha
  > 0.5 between 5° and 20°. Their median width : height in px must be ≥ 1.5. Real rows of flattened elements are
  wider than tall.
- **No flat band.** Between 5° and 20° on the broken fixtures, the low-alpha standard deviation per row must be
  ≥ 0.08.
- **One world state.** At the drawn texels the sheet's τ equals the instantaneous `tauAt` (no time average), to 1e-9.
- The overcast luminance ratio above.

## Precision
- Every constant carries its source.
- No per-place tuning. The camera and the deck geometry stay as they are.

## Rules
- Never run a multi-line `npx tsx -e`. Use a temp script and `./node_modules/.bin/<tool>`.
- Pure, seeded, no clock. Files ≤ ~150 lines, DRY, no dead code. Do not commit.
- Edit only `src/scene/model/cloudSheet*.ts`, `src/scene/model/clouds.ts`, `src/scene/model/tone.ts` (only if the
  darkening helper belongs there) and their tests. Item 6 may touch `src/world/field/lattice.ts`.
- Run `tsc -b`, oxlint on the touched files, and vitest with explicit paths: the cloudSheet tests, `sky.test.ts`,
  `weather.test.ts`, `model.test.ts`, `c10fixes.test.ts`, plus `field.test.ts` and `continuity.test.ts` if item 6 is
  done.
- Append `## Round 15 (N3h)` to `N2-report.md`.
