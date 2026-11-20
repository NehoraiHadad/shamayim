import { MIN_CELL_VALID } from '../data/land/coverMeans'
import { farAt } from '../data/land/gibs'
import { nearCellCenter } from '../data/land/nearGrid'
import type { LandData } from '../data/land/types'
import { S2_TCI_MAX_REFLECTANCE, tciByteToReflectance } from './landDelight'

/**
 * One reflectance scale for every albedo source, so the near/far seam and the age blend do not jump in brightness.
 *
 * - Near Sentinel-2 `visual` TCI and its per-cover means: linear BOA reflectance (`landDelight.ts`, 0..0.25 → 0..255).
 * - Climatology palette (`climatology.ts`): heuristic bytes authored on the same TCI display scale (the SVG-era painter
 *   drew TCI colours as-is), so they decode like TCI bytes. Approximation: the palette is not a measured reflectance.
 * - Far GIBS `MODIS_Terra_L3_SurfaceReflectance_Bands143_8Day` JPEG: an 8-bit display of MOD09A1 surface reflectance
 *   whose stretch GIBS does not publish per layer. Rather than guess it, it is cross-calibrated per channel to the near
 *   S2 reflectance over their overlap (the ±5 km window): `gain_c = Σ rho_S2,c / Σ (GIBS_c / 255)` (ratio of means),
 *   so `rho_far,c = gain_c × GIBS_c / 255`. First-order only: a non-linear stretch leaves a residual away from the
 *   overlap's brightness range; MODIS 8-day vs S2 acquisition dates differ by days to weeks. With too little overlap
 *   (no near grid yet, clouds) the far colour is assumed to be on the TCI scale (`gain = 0.25`), marked `assumed-tci`.
 */
export interface FarGain {
  /** Per-channel `rho / (byte / 255)` for the far RGB. */
  rgb: [number, number, number]
  source: 'near-overlap' | 'assumed-tci'
  /** Overlap cells the gain was measured on (0 when assumed). */
  cells: number
}

export const FAR_GAIN_ASSUMED: FarGain = {
  rgb: [S2_TCI_MAX_REFLECTANCE, S2_TCI_MAX_REFLECTANCE, S2_TCI_MAX_REFLECTANCE], source: 'assumed-tci', cells: 0,
}
/** Fewest overlap cells for a measured gain (16 cells ≥ 0.16 km² at the 100 m near grid; heuristic). */
export const MIN_GAIN_CELLS = 16
/** Plausible gain bounds: a linear display saturating between 0.12 and 0.6 reflectance (heuristic guard). */
export const FAR_GAIN_RANGE = [0.12, 0.6] as const
/** Near cells probed per axis (bounds the cost on the 100×100 production grid). */
const PROBES_PER_AXIS = 24
/** Near TCI bytes at or above this are treated as saturated (TCI clips at 255 = 0.25) and skipped. */
const SATURATED_BYTE = 250

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** Measures the far-to-near reflectance gain on the overlap of the near S2 and far GIBS grids. */
export function farGainOf(data: LandData): FarGain {
  const { near, far } = data
  if (!near || !far?.rgb) return FAR_GAIN_ASSUMED
  const stride = Math.max(1, Math.ceil(near.size / PROBES_PER_AXIS))
  const rho = [0, 0, 0], unit = [0, 0, 0]
  let cells = 0
  for (let row = stride >> 1; row < near.size; row += stride) {
    for (let col = stride >> 1; col < near.size; col += stride) {
      const i = row * near.size + col
      if (!(near.rgbValid[i] >= MIN_CELL_VALID)) continue
      const r = near.rgb[i * 3], g = near.rgb[i * 3 + 1], b = near.rgb[i * 3 + 2]
      if (r <= 0 || g <= 0 || b <= 0 || r >= SATURATED_BYTE || g >= SATURATED_BYTE || b >= SATURATED_BYTE) continue
      const c = nearCellCenter(near, row, col)
      const f = farAt(far, c.lat, c.lon)
      if (!f?.rgb || f.rgb[0] <= 0 || f.rgb[1] <= 0 || f.rgb[2] <= 0) continue
      rho[0] += tciByteToReflectance(r); rho[1] += tciByteToReflectance(g); rho[2] += tciByteToReflectance(b)
      unit[0] += f.rgb[0] / 255; unit[1] += f.rgb[1] / 255; unit[2] += f.rgb[2] / 255
      cells++
    }
  }
  if (cells < MIN_GAIN_CELLS) return FAR_GAIN_ASSUMED
  const gain = (k: number) => clamp(rho[k] / unit[k], FAR_GAIN_RANGE[0], FAR_GAIN_RANGE[1])
  return { rgb: [gain(0), gain(1), gain(2)], source: 'near-overlap', cells }
}

/** Far GIBS display bytes → linear surface reflectance on the near S2 scale. */
export function farRgbToReflectance(rgb: readonly [number, number, number], gain: FarGain): [number, number, number] {
  return [
    clamp((rgb[0] / 255) * gain.rgb[0], 0, 1), clamp((rgb[1] / 255) * gain.rgb[1], 0, 1), clamp((rgb[2] / 255) * gain.rgb[2], 0, 1),
  ]
}
