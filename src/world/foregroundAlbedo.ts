import { LAND_STEP } from '../data/land/grid'
import { linearRgbToSrgb } from './landRadiometry'
import type { LivingLandSample } from './landSample'

// The existing near-albedo transition ends at 700 m.
export const FOREGROUND_M = 700
const RAD = Math.PI / 180
// The same local metric approximation as livingLandOf.
const M_PER_DEG = 111_320
const WATER = 8 // Stable WorldCover index in data/land/grid.
// IEC 61966-2-1 inverse transfer function, once for each encoded byte.
const LINEAR = Float64Array.from({ length: 256 }, (_, byte) => {
  const x = byte / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
})

export interface ForegroundAlbedo {
  east0: number; north0: number; eastStep: number; northStep: number
  cols: number
  /** Three encoded BOA channels and one dry-land validity byte per cell. */
  rgba: Uint8Array
  /** Resolve an untouched cell before reading its bytes. */
  read?(row: number, col: number): void
}

/** Read on the native WorldCover cell centres, or at the available Sentinel-2 GSD. */
export function foregroundAlbedo(
  lat: number, lon: number, hasCover: boolean, nearStep: number | undefined,
  sample: (lat: number, lon: number, eastM: number, northM: number) => LivingLandSample,
): ForegroundAlbedo | undefined {
  // WorldCover's supported latitude bounds also keep angular cells well-conditioned.
  hasCover &&= lat >= -60 && lat <= 84
  if (!hasCover && (!nearStep || !Number.isFinite(nearStep) || nearStep <= 0)) return undefined
  const lonM = M_PER_DEG * Math.max(1e-6, Math.cos(lat * RAD))
  const northStep = hasCover ? LAND_STEP * M_PER_DEG : nearStep!
  const eastStep = hasCover ? LAND_STEP * lonM : nearStep!
  const axis = (origin: number, step: number) => {
    // Include the full support of the cell footprint filter at the 700 m boundary.
    const first = Math.floor((origin - FOREGROUND_M) / step - 1)
    const last = Math.ceil((origin + FOREGROUND_M) / step)
    return { start: (first + 0.5) * step - origin, count: last - first + 1 }
  }
  const east = axis(hasCover ? lon * lonM : 0, eastStep)
  const north = axis(hasCover ? lat * M_PER_DEG : 0, northStep)
  const rgba = new Uint8Array(east.count * north.count * 4)
  const loaded = new Uint8Array(east.count * north.count)
  const read = (r: number, c: number) => {
    const cell = r * east.count + c
    if (r >= north.count || loaded[cell]) return
    const e = east.start + c * eastStep
    const n = north.start + r * northStep
    const s = sample(lat + n / M_PER_DEG, lon + e / lonM, e, n)
    loaded[cell] = 1
    if (s.cover === WATER) return
    const i = cell * 4
    for (let k = 0; k < 3; k++) rgba[i + k] = Math.round(s.albedo[k] * 255)
    rgba[i + 3] = 255
  }
  return { east0: east.start, north0: north.start, eastStep, northStep, cols: east.count, rgba, read }
}

/** Integrate the linear reconstruction over one native cell in each ground axis. */
export function albedoAtGround(field: ForegroundAlbedo, eastM: number, northM: number) {
  const { east0, north0, eastStep, northStep, cols, rgba, read } = field
  const x = (eastM - east0) / eastStep, y = (northM - north0) / northStep
  const c = Math.round(x), r = Math.round(y), u = x - c, v = y - r
  // Integral of a unit-width box over the linear tent basis, a quadratic B-spline.
  const weights = (d: number) => [0.5 * (0.5 - d) ** 2, 0.75 - d * d, 0.5 * (0.5 + d) ** 2]
  const wx = weights(u), wy = weights(v)
  let red = 0, green = 0, blue = 0, sum = 0
  for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
    const row = r + dy - 1, col = c + dx - 1
    if (row < 0 || col < 0 || col >= cols) continue
    const w = wx[dx] * wy[dy]
    if (!w) continue
    read?.(row, col)
    const i = (row * cols + col) * 4
    if (!rgba[i + 3]) continue
    red += w * LINEAR[rgba[i]]; green += w * LINEAR[rgba[i + 1]]; blue += w * LINEAR[rgba[i + 2]]; sum += w
  }
  if (sum > 0) return { rgb: linearRgbToSrgb([red / sum, green / sum, blue / sum]), dryShare: sum }
}
