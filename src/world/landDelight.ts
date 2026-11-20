import type { RGB } from './types'

/**
 * Physical radiometry and topographic de-lighting for living-land surface colour.
 *
 * Provenance & approximations:
 * - Sentinel-2 L2A `visual` TCI -> BOA reflectance:
 *   ESA Sen2Cor L2A (`L2A_Tables.py`) / Element84 Earth Search `sentinel-2-l2a` `visual` COG maps
 *   BOA surface reflectance `[0, 0.25]` (`DN 0..2500` at `QUANTIFICATION_VALUE = 10000`) linearly
 *   to 8-bit `1..255` (`0` = nodata, values `>= 0.25` saturate at `255`), with no gamma curve.
 *   Empirically verified against `src/test/fixtures/land-s2-shadmot.json` (`S2B_36SYA_20261115_0_L2A`,
 *   PB 05.13): across unsaturated pixels (`TCI < 245`), `rho_B04 / (TCI_R / 255) = 0.250` and
 *   `rho_B03 / (TCI_G / 255) = 0.250` (residual `< 0.0005`). Older Sen2Cor 2.5 docs cited `0.20`
 *   (`DN 2000`), which under-predicts modern Earth Search PB04+ L2A bands by 20 %.
 * - sRGB <-> linear reflectance: exact IEC 61966-2-1 EOTF / OETF. Used to convert display sRGB
 *   sources (GIBS MODIS 8-day SR JPEG and climatology profiles) into linear reflectance space for
 *   energy-conserving age blending, and to encode the final de-lit albedo into `WorldState`'s sRGB
 *   `0..1` contract (`src/world/types.ts`).
 * - Topographic de-lighting: Lambertian cosine correction (Teillet et al. 1982, *Can. J. Remote
 *   Sens.* 8(2):84-106): `rho_h = rho_t * (cos(theta_z) / cos(i))`. Documented approximation:
 *   assumes a Lambertian surface and negligible diffuse skylight, which over-corrects grazing or
 *   self-shadowed slopes; therefore `cos(i)` is floored at `MIN_COS_INCIDENCE = 0.2`, gain is
 *   clamped to `[0.5, 2.0]`, and de-lighting is skipped below `MIN_SUN_ELEVATION_DEG = 5°` or when
 *   acquisition solar geometry or the terrain normal is missing.
 */

/** Maximum BOA reflectance represented before saturation (`255`) in Sentinel-2 L2A `visual` TCI. */
export const S2_TCI_MAX_REFLECTANCE = 0.25
/** Minimum acquisition solar elevation (deg) for Lambertian topographic de-lighting. */
export const MIN_SUN_ELEVATION_DEG = 5
/** Floor on `cos(incidence)` to prevent noise blow-up on grazed/self-shadowed slopes. */
export const MIN_COS_INCIDENCE = 0.2
/** Clamped bounds on the Lambertian topographic correction multiplier `cos(theta_z) / cos(i)`. */
export const MIN_DELIGHT_GAIN = 0.5
export const MAX_DELIGHT_GAIN = 2.0

/** Unit vector in local East-North-Up (ENU) coordinates. */
export type Vec3 = readonly [number, number, number]

export type DelightStatus =
  | 'lambert'
  | 'skipped-no-sun'
  | 'skipped-low-sun'
  | 'skipped-no-normal'
  | 'none'

export interface DelightResult {
  rho: [number, number, number]
  status: DelightStatus
  factor: number
}

const RAD = Math.PI / 180
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

/** IEC 61966-2-1 sRGB `[0, 1]` -> linear reflectance `[0, 1]`. */
export function srgbToLinear(c: number): number {
  const x = clamp(c, 0, 1)
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

/** IEC 61966-2-1 linear reflectance `[0, 1]` -> sRGB `[0, 1]`. */
export function linearToSrgb(l: number): number {
  const x = clamp(l, 0, 1)
  return x <= 0.0031308 ? 12.92 * x : 1.055 * (x ** (1 / 2.4)) - 0.055
}

/** Converts display sRGB bytes (`0..255`) to linear `[0, 1]`. */
export function srgbBytesToLinear(rgb: readonly [number, number, number]): [number, number, number] {
  return [srgbToLinear(rgb[0] / 255), srgbToLinear(rgb[1] / 255), srgbToLinear(rgb[2] / 255)]
}

/** Converts linear reflectance `[0, 1]` to sRGB `[0, 1]` (matching `WorldState` `RGB`). */
export function linearRgbToSrgb(rgb: readonly [number, number, number]): RGB {
  return [linearToSrgb(rgb[0]), linearToSrgb(rgb[1]), linearToSrgb(rgb[2])]
}

/** Outward unit surface normal in ENU `(east, north, up)` from elevation gradient `(dz/de, dz/dn)`. */
export function normalFromGradient(dzDe: number, dzDn: number): Vec3 {
  const len = Math.hypot(dzDe, dzDn, 1)
  return [-dzDe / len, -dzDn / len, 1 / len]
}

/** Unit vector toward the sun in ENU `(east, north, up)` from elevation and clockwise-from-north azimuth (deg). */
export function sunVectorEnu(elevationDeg: number, azimuthDeg: number): Vec3 {
  const el = elevationDeg * RAD, az = azimuthDeg * RAD
  const cosEl = Math.cos(el)
  return [cosEl * Math.sin(az), cosEl * Math.cos(az), Math.sin(el)]
}

/**
 * Removes terrain illumination from linear BOA reflectance using Lambertian cosine topographic
 * correction `rho_h = rho_t * (cos(theta_z) / cos(i))`, clamped to `[MIN_DELIGHT_GAIN, MAX_DELIGHT_GAIN]`.
 * Skips cleanly (returning `rho` unchanged and an explicit status) whenever geometry is missing or grazing.
 */
export function delightReflectance(
  rho: readonly [number, number, number],
  sunElevation: number | undefined,
  sunAzimuth: number | undefined,
  normal: Vec3 | null,
): DelightResult {
  const copy: [number, number, number] = [clamp(rho[0], 0, 1), clamp(rho[1], 0, 1), clamp(rho[2], 0, 1)]
  if (sunElevation === undefined || sunAzimuth === undefined || !Number.isFinite(sunElevation) || !Number.isFinite(sunAzimuth)) {
    return { rho: copy, status: 'skipped-no-sun', factor: 1 }
  }
  if (sunElevation < MIN_SUN_ELEVATION_DEG) {
    return { rho: copy, status: 'skipped-low-sun', factor: 1 }
  }
  if (!normal || !Number.isFinite(normal[0]) || !Number.isFinite(normal[1]) || !Number.isFinite(normal[2])) {
    return { rho: copy, status: 'skipped-no-normal', factor: 1 }
  }
  const sun = sunVectorEnu(sunElevation, sunAzimuth)
  const cosZ = sun[2] // sin(sunElevation) = cos(solar zenith angle)
  const cosI = normal[0] * sun[0] + normal[1] * sun[1] + normal[2] * sun[2]
  const factor = clamp(cosZ / Math.max(MIN_COS_INCIDENCE, cosI), MIN_DELIGHT_GAIN, MAX_DELIGHT_GAIN)
  return {
    rho: [clamp(copy[0] * factor, 0, 1), clamp(copy[1] * factor, 0, 1), clamp(copy[2] * factor, 0, 1)],
    status: 'lambert',
    factor,
  }
}
