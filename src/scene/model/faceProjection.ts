//# allFunctionsCalledOnLoad
import { groundAt as lineAt } from '../../world/sceneLight'
import type { Plane, WorldState } from '../../world/types'

/**
 * Shared projected-face distance & slope lookup (Stages 3 & 4: living land).
 * Used identically by `landColour.ts`, `landVegetation.ts` and `ground.ts` so land albedo,
 * vegetation cover and resolvability thresholds always agree on the same ground distance at `(x, y)`.
 */

export type PlaneName = 'back' | 'far' | 'near'
export interface FaceSample { km: number; slope: number }

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

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

/**
 * Interpolates visible ground distance (km) and radial slope (m/m) along `world.terrain.faces[name]`
 * at projected screen `targetY`.
 *
 * Fallback rules:
 * - Below the last measured DEM `FacePoint` in a column, holds the last measured `(km, slope)` rather than
 *   extrapolating invented closer ground (matching Stage 3 albedo in `landColour.ts`).
 * - When a plane carries no measured `FacePoint[]` columns (e.g., synthetic/fallback terrain), falls back
 *   to a gentle geometric ramp (`0.35..1.0 * crestKm` near, `0.75..1.0 * crestKm` far).
 */
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
      return { km: prevKm, slope: prevSlope }
    }
  }
  const rowFrac = clamp((targetY - crestY) / Math.max(1, footY - crestY), 0, 1)
  return {
    km: name === 'near' ? Math.max(0.35, crestKm * (1 - 0.65 * rowFrac)) : crestKm * (1 - 0.25 * rowFrac),
    slope: name === 'near' ? lerp(0.14, 0.03, rowFrac) : 0.10,
  }
}
