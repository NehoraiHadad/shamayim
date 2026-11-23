import { aerosolDepth, airMass, HAZE_SCALE_KM, hazeAbove } from '../../world/sceneLight'
import type { Air } from '../../world/types'

// The sky's dust airlight and this extinction describe the same sunlit veil.
const dustDepth = (air: Air) => (air.dustAirlight ?? 0) * aerosolDepth(air)[1]
const quantize = (t: number) => Math.round(255 * t) / 255

export function sheetDust(air: Air | undefined, baseKm: number, altitudes: readonly number[]): number[] | undefined {
  if (!air?.dustAirlight) return
  const depth = dustDepth(air) * (1 - hazeAbove(baseKm))
  const through = altitudes.map((alt) => quantize(Math.exp(-depth * airMass(Math.max(0, alt)))))
  if (through.some((t) => t < 1)) return through
}

export function towerDust(air: Air, range: number, baseKm: number, topKm: number): readonly [number, number] | undefined {
  if (!air.dustAirlight) return
  const depth = dustDepth(air)
  // Integrate exponential haze along the straight eye-to-cell segment. Cell heights are above the observer.
  const through = (height: number) => {
    const density = height > 0 ? -Math.expm1(-height / HAZE_SCALE_KM) / height : 1 / HAZE_SCALE_KM
    return quantize(Math.exp(-depth * Math.hypot(range, height) * density))
  }
  const top = through(topKm), bottom = through(baseKm)
  if (top < 1 || bottom < 1) return [top, bottom]
}

export function cloudHaze(air: Air, km: number) {
  if (!air.dustAirlight) return air.fade(km)
  // Convert the 550 nm column back to surface extinction with the aerosol scale height.
  // Reserve the dust portion of the visibility loss for the final raster transfer.
  const extinction = Math.max(0, 3.912 / air.visibilityKm - dustDepth(air) / HAZE_SCALE_KM)
  return -Math.expm1(-extinction * km)
}

export const cloudFade = (air: Air, km: number) => 0.85 * cloudHaze(air, km)
