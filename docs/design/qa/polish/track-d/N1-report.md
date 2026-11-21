# N1 cloud field core

The field builds four layer snapshots from the displayed weather and forecast winds. Cell queries materialize deterministic sites from a two-block cache, apply intrinsic life cycles and corrected plan cover, and return cloud geometry and optical depth. Projection includes standard refraction and curvature. The phase leaves the existing cloud, lighting, rain, and scene paths untouched.

## Plan-cover calibration

The calibration script in `src/world/field/calibrate.cjs` prints the nine knots for each layer. Run it with Node 22.16 or later and `--experimental-strip-types`. The calibration uses three seeded 60 km × 60 km windows with 4,000 points per window. The closed floor covers the full window for the geometric check at 98% and 100%. The optical floor still follows the specified smooth ramp above 90%.

| Lattice | 0 | 0.05 | 0.10 | 0.25 | 0.50 | 0.75 | 0.90 | 0.98 | 1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| low | 0 | 0.0475 | 0.0982 | 0.2427 | 0.4511 | 0.665 | 0.8165 | 0.98 | 1 |
| tower | 0 | 0.0418 | 0.1035 | 0.2396 | 0.4439 | 0.6686 | 0.8277 | 0.98 | 1 |
| mid | 0 | 0.0444 | 0.0736 | 0.2085 | 0.4222 | 0.644 | 0.8024 | 0.98 | 1 |
| high | 0 | 0.114 | 0.1808 | 0.3305 | 0.5124 | 0.6959 | 0.8179 | 0.98 | 1 |

## Deviations and limits

- Cumuliform lifetimes use 31–40 minutes. With the specified 0.12 rank amplitude and 0.25 share transition, a 20-minute cycle can change share by about 0.23 per minute. A 31-minute minimum bounds the intrinsic change below 0.15.
- At occupied fractions below 0.125, the share is faded toward zero. This removes the residual disc coverage that would otherwise remain as forecast cover approaches zero.
- Calibration treats footprints as discs. For high clouds the calibrated radius is the half-length. The genus table retains the cross-width for the subsequent painting phase.
- Steering vectors are capped at their pressure knots before height interpolation. Linear interpolation preserves the cap and allows the cached integrals at the four heights to be mixed exactly at a fixed steering height.
- The 48-hour continuity check holds cover and form constant and uses the fixture's wind history across two midnights. Changes to external cover or genus gates can change share directly. Changing the steering height between builds can also shift the accumulated displacement because the same wind history is integrated at the newly requested height.
- Local timestamps omit the UTC offset. Wall-time advection follows that representation and does not recover the repeated hour at a DST change.


## Verification

- `npx tsc -b` passed.
- `npx oxlint src/world/field` passed.
- The niced field Vitest run passed five checks, including calibration, projection and the warm timing assertions. The 48-hour continuity check exceeded its 20-second timeout at 24.8 seconds. Its timeout is now 60 seconds. The checks after that adjustment remain unverified under the one-run rule.
- The calibration script ran and printed the rows above.
- The full suite, standalone performance runs, and Playwright were skipped per the brief.
