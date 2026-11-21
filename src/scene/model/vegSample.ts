//# allFunctionsCalledOnLoad
import type { LivingLand } from '../../world/landLiving'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { Plane, RGB, WorldState } from '../../world/types'
import { COVER_WATER, nonWaterLocalFallback, roundRgb } from './landPalette'
import { labOf, mixRgb, rgbOfLab } from './tone'

/**
 * Living-land cell sampling, face projection and light-free illustrated vegetation palette
 * (Stage 4: living land). Shared by `landVegetation.ts`, `vegBuilders.ts` and `ground.ts`.
 */

export type PlaneName = 'back' | 'far' | 'near'
export interface VegSample { cover: number | null; ndvi: number; dryness: number; elevationM: number; albedo: RGB }
export interface FaceSample { km: number; slope: number }

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpRgb = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

/** Crest distance (km) along `plane` at reference screen `x`. */
export function crestKmAt(plane: Plane, x: number): number {
  const pts = plane.points, kms = plane.distanceKm
  if (!pts.length || !kms.length) return 2
  if (x <= pts[0][0]) return kms[0]
  if (x >= pts.at(-1)![0]) return kms.at(-1)!
  let lo = 0, hi = pts.length - 1
  while (lo < hi) { const mid = (lo + hi) >> 1; if (pts[mid][0] >= x) hi = mid; else lo = mid + 1 }
  return kms[lo - 1] + (kms[lo] - kms[lo - 1]) * ((x - pts[lo - 1][0]) / Math.max(1e-6, pts[lo][0] - pts[lo - 1][0]))
}

/** Local visible foot y matching `planes.ts` outline bottom (`landHeight` for near, `nearCrest + 3` for far/back). */
export function localFootY(world: WorldState, name: PlaneName, x: number, crestY: number, landHeight: number): number {
  if (name === 'near' || world.terrain.near.points.length < 2) return landHeight
  return Math.min(landHeight, Math.max(crestY, lineAt(world.terrain.near.points, x) + 3))
}

/** Interpolates visible ground distance (km) and slope along `world.terrain.faces[name]` at projected screen `y`. */
export function faceAtY(
  world: WorldState, name: PlaneName, plane: Plane, x: number, crestY: number, footY: number, targetY: number,
): FaceSample {
  const crestKm = crestKmAt(plane, x)
  if (name === 'back' || targetY <= crestY + 1e-4) return { km: crestKm, slope: 0.08 }
  const cols = world.terrain.faces[name]?.columns
  if (cols?.length) {
    const step = Math.max(1e-6, (cols.at(-1)!.x - cols[0].x) / Math.max(1, cols.length - 1))
    const pts = cols[clamp(Math.round((x - cols[0].x) / step), 0, cols.length - 1)].points
    if (pts.length > 0) {
      let prevY = crestY, prevKm = crestKm, prevSlope = pts[0].slope
      for (const pt of pts) {
        if (pt.y <= prevY + 1e-4) continue
        if (targetY <= pt.y) {
          const t = (targetY - prevY) / (pt.y - prevY)
          return { km: lerp(prevKm, pt.km, t), slope: lerp(prevSlope, pt.slope, t) }
        }
        prevY = pt.y; prevKm = pt.km; prevSlope = pt.slope
      }
      const rem = clamp((targetY - prevY) / Math.max(1, footY - prevY), 0, 1)
      const nearFloorKm = name === 'near' ? Math.max(0.35, prevKm * 0.55) : prevKm * 0.85
      return { km: lerp(prevKm, nearFloorKm, rem), slope: lerp(prevSlope, 0.03, rem) }
    }
  }
  const rowFrac = clamp((targetY - crestY) / Math.max(1, footY - crestY), 0, 1)
  return {
    km: name === 'near' ? Math.max(0.35, crestKm * (1 - 0.65 * rowFrac)) : crestKm * (1 - 0.25 * rowFrac),
    slope: name === 'near' ? lerp(0.14, 0.03, rowFrac) : 0.10,
  }
}

/** Samples discrete cover (preserving open water `8`), plus log-interpolated NDVI, dryness, elevation and albedo. */
export function sampleCellAtKm(land: LivingLand, rayIdx: number, km: number): VegSample {
  const rays = land.rays
  if (!rays.length) {
    const fb = nonWaterLocalFallback(land)
    return { cover: land.own.cover, ndvi: land.own.ndvi, dryness: land.own.dryness, elevationM: 0, albedo: fb.albedo }
  }
  const bands = rays[clamp(Math.round(rayIdx), 0, rays.length - 1)].bands
  if (!bands.length) {
    return { cover: land.own.cover, ndvi: land.own.ndvi, dryness: land.own.dryness, elevationM: 0, albedo: land.own.albedo }
  }
  const distM = Math.max(50, km * 1000)
  const hi = bands.findIndex((b) => b.distanceM >= distM)
  let cover: number | null, ndvi: number, dryness: number, elevationM: number, albedo: RGB
  if (hi <= 0) {
    const b = hi === -1 ? bands.at(-1)! : bands[0]
    cover = b.sample.cover; ndvi = b.sample.ndvi; dryness = b.sample.dryness; elevationM = b.elevationM; albedo = b.sample.albedo
  } else {
    const a = bands[hi - 1], b = bands[hi]
    const t = clamp((Math.log(distM) - Math.log(a.distanceM)) / Math.max(1e-6, Math.log(b.distanceM) - Math.log(a.distanceM)), 0, 1)
    cover = t < 0.5 ? a.sample.cover : b.sample.cover
    ndvi = lerp(a.sample.ndvi, b.sample.ndvi, t); dryness = lerp(a.sample.dryness, b.sample.dryness, t)
    elevationM = lerp(a.elevationM, b.elevationM, t); albedo = lerpRgb(a.sample.albedo, b.sample.albedo, t)
  }
  if (distM < 700 && cover !== COVER_WATER && land.own.cover !== COVER_WATER && land.own.cover !== 5) {
    const ownW = clamp((700 - distM) / 500, 0, 0.45)
    ndvi = lerp(ndvi, land.own.ndvi, ownW); dryness = lerp(dryness, land.own.dryness, ownW)
    albedo = lerpRgb(albedo, land.own.albedo, ownW)
  }
  return { cover, ndvi, dryness, elevationM, albedo }
}

/** Shared light-free tone indices inside `PlaneVegetation.tones` (calibrated to Stage 3 Oklab `L ≈ 0.17..0.42`). */
export const TONE = {
  PINE_SHADE: 0, PINE_MID: 1, OLIVE: 2, CITRUS: 3, PALM: 4, TRUNK: 5,
  FIELD_GREEN: 6, FIELD_PLOUGH: 7, FIELD_STRAW: 8,
  SHRUB: 9, GRASS: 10, STRATA_LIGHT: 11, STRATA_DARK: 12,
} as const

/** Builds the 13-colour light-free illustrated vegetation palette anchored to the plane's median Stage 3 tone. */
export function buildVegPalette(medianLand: RGB, dryness: number): RGB[] {
  const d = clamp(dryness, 0, 1)
  const calm = (rgb: RGB, share = 0.20) => roundRgb(mixRgb(rgb, medianLand, share))
  const lab = labOf(medianLand)
  const strataLight = roundRgb(rgbOfLab({ l: clamp(lab.l + 0.052, 0.24, 0.44), a: lab.a * 1.05, b: lab.b * 1.15 }))
  const strataDark = roundRgb(rgbOfLab({ l: clamp(lab.l - 0.048, 0.16, 0.34), a: lab.a * 1.10, b: lab.b * 1.05 }))
  return [
    calm([0.11, 0.17, 0.11], 0.14),                       // 0: PINE_SHADE
    calm([0.15, 0.24, 0.15], 0.16),                       // 1: PINE_MID
    calm([0.23, 0.29, 0.20], 0.18),                       // 2: OLIVE
    calm([0.14, 0.26, 0.14], 0.14),                       // 3: CITRUS
    calm([0.20, 0.30, 0.16], 0.14),                       // 4: PALM
    calm([0.30, 0.25, 0.19], 0.16),                       // 5: TRUNK
    calm(lerpRgb([0.19, 0.33, 0.16], [0.26, 0.33, 0.18], d * 0.5), 0.18), // 6: FIELD_GREEN
    calm([0.31, 0.23, 0.16], 0.18),                       // 7: FIELD_PLOUGH
    calm([0.50, 0.43, 0.26], 0.15),                       // 8: FIELD_STRAW
    calm(lerpRgb([0.16, 0.23, 0.14], [0.25, 0.24, 0.17], d * 0.75), 0.20), // 9: SHRUB
    calm(lerpRgb([0.22, 0.32, 0.17], [0.49, 0.42, 0.24], clamp((d - 0.30) / 0.36, 0, 1)), 0.16), // 10: GRASS
    strataLight,                                          // 11: STRATA_LIGHT
    strataDark,                                           // 12: STRATA_DARK
  ]
}
