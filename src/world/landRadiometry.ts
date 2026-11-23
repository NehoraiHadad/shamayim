import type { RGB } from './types'

/**
 * Physical radiometry for living-land surface albedo.
 *
 * Provenance & approximations:
 * - Operational Sentinel-2 L2A topographic correction (no second de-lighting):
 *   ESA Sen2Cor operational L2A (and Element84 Earth Search `sentinel-2-l2a` COGs derived from it)
 *   already applies DEM-based topographic illumination correction (Copernicus Sentinel-2 MSI L2A
 *   Data Quality Report `OMPC.CS.DQR.002.12-2025`, Jan 2026, §2.2; Element84 Earth Search
 *   `sentinel-2-l2a` collection docs). Applying an additional Lambertian cosine factor would
 *   double-correct slopes (darkening sunlit faces and brightening shaded faces). Near L2A BOA
 *   reflectance is therefore taken directly without local topographic de-lighting.
 * - Sentinel-2 L2A `visual` TCI -> BOA reflectance proxy:
 *   Per Copernicus S2 TCI encoding (`https://sentiwiki.copernicus.eu/web/glossary`), the 8-bit
 *   True Colour Image maps BOA surface reflectance `[0, 0.25]` linearly onto `1..255` (`0` = nodata,
 *   values `>= 0.25` saturate/clip at `255`), with no gamma curve.
 *   Measured against spectral B04/B03 BOA reflectance on the recorded Shadmot PB 05.13 40 m overview
 *   fixture (`src/test/fixtures/land-s2-shadmot.json`, `S2B_36SYA_20261115_0_L2A`): RMS residual over
 *   all unsaturated bytes (`TCI < 245`) is `0.0111` (red, n = 118) and `0.0088` (green, n = 121),
 *   tightening to `0.0031` / `0.0043` on darker pixels (`TCI < 200`, `rho < 0.20`). Bright surfaces
 *   above `0.25` (snow, bright limestone/chalk; fixture max red `0.3286`) clip at `255`; snow cover
 *   is therefore tracked separately via SCL-11 and spectral B03/B11 NDSI rather than TCI brightness.
 * - Production colour-space conversions:
 *   - Near S2 `visual` TCI & per-cover means: linear BOA reflectance via `tciRgbToReflectance`.
 *   - Far GIBS SR JPEG: linear reflectance via `farRgbToReflectance` (`landReflectance.ts`).
 *   - Climatology palette (`climatology.ts`): heuristic bytes on the TCI scale via `tciRgbToReflectance`.
 *   - Final albedo output (`WorldState.land`): IEC 61966-2-1 linear -> sRGB OETF (`linearRgbToSrgb`).
 */

/** Maximum BOA reflectance represented before saturation (`255`) in Sentinel-2 L2A `visual` TCI. */
export const S2_TCI_MAX_REFLECTANCE = 0.25

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** Converts one Sentinel-2 L2A `visual` TCI byte (`0..255`) to linear BOA reflectance (`0..0.25`). */
export function tciByteToReflectance(byte: number): number {
  if (!Number.isFinite(byte) || byte <= 0) return 0
  return (clamp(byte, 0, 255) / 255) * S2_TCI_MAX_REFLECTANCE
}

/** Converts a Sentinel-2 L2A `visual` TCI RGB triplet (`0..255`) to linear BOA reflectance. */
export function tciRgbToReflectance(rgb: readonly [number, number, number]): [number, number, number] {
  return [tciByteToReflectance(rgb[0]), tciByteToReflectance(rgb[1]), tciByteToReflectance(rgb[2])]
}

/** IEC 61966-2-1 linear reflectance `[0, 1]` -> sRGB `[0, 1]`. */
export function linearToSrgb(l: number): number {
  const x = clamp(l, 0, 1)
  return x <= 0.0031308 ? 12.92 * x : 1.055 * (x ** (1 / 2.4)) - 0.055
}

/** Converts linear reflectance `[0, 1]` to sRGB `[0, 1]` (matching `WorldState` `RGB`). */
export function linearRgbToSrgb(rgb: readonly [number, number, number]): RGB {
  return [linearToSrgb(rgb[0]), linearToSrgb(rgb[1]), linearToSrgb(rgb[2])]
}
