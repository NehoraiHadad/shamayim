import { HORIZON_Y, SCENE_W } from './sceneBox'

/** y (px) of the highest drawn ridge at a horizontal fraction of the scene (0 = west/left); `peak` is its highest y. */
export interface Skyline {
  (x: number): number
  peak: number
}

/** Fallback when no ridge is known: the old fixed horizon line. */
export const FLAT_SKYLINE: Skyline = Object.assign(() => HORIZON_Y, { peak: HORIZON_Y })

/** The zenith's y over a low skyline: high enough that a summer noon sun still shows its whole halo. */
const SKY_TOP = 12
/**
 * The zenith stands at least this far above the arc's base, so on a high ridge (a hill town, the ridge near the top
 * of the box) a noon sun still climbs well clear of the houses instead of sitting on them. Above y 0 it rises into the
 * sky over the scene, which the scene's clip leaves open (72 px).
 */
const MIN_RISE = 48
const RAD = Math.PI / 180

/** The ridge line a body rises from: the upper of the far and near ridges at each x (viewBox coordinates). */
export function skylineOf(...ridges: readonly (readonly [number, number])[][]): Skyline {
  const at = (fraction: number) => {
    const x = fraction * SCENE_W
    let top = Number.POSITIVE_INFINITY
    for (const points of ridges) {
      for (let i = 0; i < points.length - 1; i++) {
        const [x0, y0] = points[i]
        const [x1, y1] = points[i + 1]
        if (x < Math.min(x0, x1) || x > Math.max(x0, x1)) continue
        top = Math.min(top, x1 === x0 ? Math.min(y0, y1) : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0))
      }
    }
    return Number.isFinite(top) ? top : HORIZON_Y
  }
  const peak = Math.min(...Array.from({ length: 76 }, (_, i) => at(i / 75)))
  return Object.assign(at, { peak })
}

/** The shared arc stands on the highest ridge point (never lower than this, to keep room for the arc itself). */
const ARC_FLOOR = 28
/** Below the horizon a body sinks this many px per degree, so it slips behind the ridge instead of vanishing on it. */
const SINK = 3
const smooth = (v: number) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k) }

/**
 * y for a body at `altitude`: 0° sits on the ridge at x (it rises and sets behind the line you see); by ~15° it has
 * joined a common arc that tops out at the zenith. The ridges stand in for the horizon, so a body that is up is shown.
 */
export function altitudeY(skyline: Skyline, x: number, altitude: number): number {
  const ridge = skyline(x)
  if (altitude <= 0) return ridge - SINK * altitude
  // The base only ever rises (ridge → the arc's own base), so the path never dips on its way up or down. It is one height
  // for the whole arc: the highest ridge point, or the floor if that is lower. (It used to be the ridge under x wherever
  // the ridge stood above the floor, so on a high bumpy ridge (Jerusalem) the moon's arc copied the bumps.)
  const arcBase = Math.min(ridge, skyline.peak, ARC_FLOOR)
  const base = ridge + (arcBase - ridge) * smooth(altitude / 15)
  const top = Math.min(SKY_TOP, arcBase - MIN_RISE)
  return base - (base - top) * Math.sin(altitude * RAD) ** 0.8
}
