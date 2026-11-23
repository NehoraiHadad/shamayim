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
    const first = Math.floor((origin - FOREGROUND_M) / step - 0.5)
    const last = Math.ceil((origin + FOREGROUND_M) / step - 0.5)
    return { start: (first + 0.5) * step - origin, count: last - first + 1 }
  }
  const east = axis(hasCover ? lon * lonM : 0, eastStep)
  const north = axis(hasCover ? lat * M_PER_DEG : 0, northStep)
  const rgba = new Uint8Array(east.count * north.count * 4)
  const reachSq = (FOREGROUND_M + Math.hypot(eastStep, northStep)) ** 2
  for (let r = 0; r < north.count; r++) {
    const n = north.start + r * northStep
    for (let c = 0; c < east.count; c++) {
      const e = east.start + c * eastStep
      // Corner samples outside the foreground disk cannot contribute to a bilinear lookup.
      if (e * e + n * n > reachSq) continue
      const s = sample(lat + n / M_PER_DEG, lon + e / lonM, e, n)
      if (s.cover === WATER) continue
      const i = (r * east.count + c) * 4
      for (let k = 0; k < 3; k++) rgba[i + k] = Math.round(s.albedo[k] * 255)
      rgba[i + 3] = 255
    }
  }
  return { east0: east.start, north0: north.start, eastStep, northStep, cols: east.count, rgba }
}

/** Four ground cells contribute, with open-water weights omitted and renormalized. */
export function albedoAtGround(field: ForegroundAlbedo, eastM: number, northM: number) {
  const { east0, north0, eastStep, northStep, cols, rgba } = field
  const x = (eastM - east0) / eastStep, y = (northM - north0) / northStep
  const c = Math.floor(x), r = Math.floor(y), u = x - c, v = y - r
  if (c < 0 || c + 1 >= cols || r < 0 || (r + 1) * cols * 4 >= rgba.length) return undefined
  let red = 0, green = 0, blue = 0, sum = 0
  for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
    const i = ((r + dy) * cols + c + dx) * 4
    if (!rgba[i + 3]) continue
    const w = (dx ? u : 1 - u) * (dy ? v : 1 - v)
    red += w * LINEAR[rgba[i]]; green += w * LINEAR[rgba[i + 1]]; blue += w * LINEAR[rgba[i + 2]]; sum += w
  }
  if (sum > 0) return { rgb: linearRgbToSrgb([red / sum, green / sum, blue / sum]), dryShare: sum }
}
