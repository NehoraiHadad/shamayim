//# allFunctionsCalledOnLoad
import type { RGB } from '../../world/types'
import { labOf, rgbOfLab } from './tone'

/**
 * Light-free albedo tone calibration and deterministic Oklab palette quantisation (Stage 3: living land).
 *
 * Provenance & calibration:
 * - Input `albedo`: IEC 61966-2-1 sRGB `[0..1]` of linear BOA reflectance (`landRadiometry.ts`,
 *   Sentinel-2 L2A TCI `[0, 0.25]` scale -> typical Oklab `L ≈ 0.40..0.56`).
 * - Unlit diffuse-skylight anchor: `REF_DAY_RIDGE_L = 0.312` (calibrated to match the visual luminance
 *   `0.3R + 0.6G + 0.1B ≈ 0.21..0.22` of `SKY_THEMES.clearDay.ridgeNear` `#2E3B4E` for warm earth/olive
 *   hues), compressing `L` around `REF_ALBEDO_L = 0.48` into `[0.23, 0.365]` so natural contrast (pine <
 *   winter green < limestone < straw < desert) stays readable beneath white overlay labels, pale limestone
 *   walls and sunlit crest washes.
 * - `CHROMA_BOOST = 1.35`: heuristic illustration chroma lift in Oklab (gamut-clamped via `rgbOfLab`).
 */

const REF_ALBEDO_L = 0.48, REF_DAY_RIDGE_L = 0.312, LIGHTNESS_SLOPE = 0.58
const MIN_LAND_L = 0.23, MAX_LAND_L = 0.365, CHROMA_BOOST = 1.35
/** Minimum squared Oklab separation between quantised centroids (~0.018 ΔE). */
const MIN_CLUSTER_SEP_SQ = 0.018 * 0.018

interface Lab { l: number; a: number; b: number }
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const roundByte = (c: number) => Math.round(clamp(c, 0, 1) * 255) / 255
export const roundRgb = (rgb: RGB): RGB => [roundByte(rgb[0]), roundByte(rgb[1]), roundByte(rgb[2])]

/** Converts one light-free BOA sRGB albedo into an illustrated, light-free land tone (Oklab calibrated). */
export function albedoToLandTone(albedo: RGB): RGB {
  const lab = labOf(albedo)
  const l = clamp(REF_DAY_RIDGE_L + (lab.l - REF_ALBEDO_L) * LIGHTNESS_SLOPE, MIN_LAND_L, MAX_LAND_L)
  return roundRgb(rgbOfLab({ l, a: lab.a * CHROMA_BOOST, b: lab.b * CHROMA_BOOST }))
}

/** Deterministic farthest-point + Lloyd Oklab quantiser (pure, zero randomness, 1..maxColours). */
export function quantiseTones(tones: readonly RGB[], maxColours: number): { palette: RGB[]; indices: number[] } {
  if (!tones.length) return { palette: [[0.25, 0.28, 0.24]], indices: [] }
  const labs: Lab[] = tones.map(labOf)
  const distSq = (a: Lab, b: Lab) => (a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2
  const mean: Lab = {
    l: labs.reduce((s, c) => s + c.l, 0) / labs.length,
    a: labs.reduce((s, c) => s + c.a, 0) / labs.length,
    b: labs.reduce((s, c) => s + c.b, 0) / labs.length,
  }
  let first = 0, bestD = Infinity
  for (let i = 0; i < labs.length; i++) { const d = distSq(labs[i], mean); if (d < bestD) { bestD = d; first = i } }
  const centers: Lab[] = [{ ...labs[first] }]
  const kMax = Math.max(1, Math.min(maxColours, labs.length))
  while (centers.length < kMax) {
    let farIdx = -1, farD = -1
    for (let i = 0; i < labs.length; i++) {
      let d = Infinity
      for (const c of centers) d = Math.min(d, distSq(labs[i], c))
      if (d > farD) { farD = d; farIdx = i }
    }
    if (farIdx < 0 || farD < MIN_CLUSTER_SEP_SQ) break
    centers.push({ ...labs[farIdx] })
  }
  const indices = new Array<number>(labs.length).fill(0)
  for (let iter = 0; iter < 4; iter++) {
    for (let i = 0; i < labs.length; i++) {
      let best = 0, bd = Infinity
      for (let k = 0; k < centers.length; k++) { const d = distSq(labs[i], centers[k]); if (d < bd) { bd = d; best = k } }
      indices[i] = best
    }
    for (let k = 0; k < centers.length; k++) {
      let sl = 0, sa = 0, sb = 0, n = 0
      for (let i = 0; i < labs.length; i++) if (indices[i] === k) { sl += labs[i].l; sa += labs[i].a; sb += labs[i].b; n++ }
      if (n > 0) centers[k] = { l: sl / n, a: sa / n, b: sb / n }
    }
  }
  return { palette: centers.map((c) => roundRgb(rgbOfLab(c))), indices }
}
