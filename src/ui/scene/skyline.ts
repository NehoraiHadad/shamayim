import { HORIZON_Y, SCENE_W } from './sunPath'

/** y (px) of the highest drawn ridge at a horizontal fraction of the scene (0 = west/left). */
export type Skyline = (x: number) => number

/** Fallback when no ridge is known: the old fixed horizon line. */
export const FLAT_SKYLINE: Skyline = () => HORIZON_Y

/** The zenith's y: high enough that a summer noon sun still shows its whole halo. */
const SKY_TOP = 12
const RAD = Math.PI / 180

/** The ridge line a body rises from: the upper of the far and near ridges at each x (viewBox coordinates). */
export function skylineOf(...ridges: readonly (readonly [number, number])[][]): Skyline {
  return (fraction) => {
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
}

/** Above this line the bodies share one arc, so a dip in the ridge line does not flatten the sun's path. */
const ARC_Y = 46
const smooth = (v: number) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k) }

/**
 * y for a body at `altitude`: 0° sits on the ridge at x (it rises and sets behind the line you see); by ~15° it has
 * joined a common arc that tops out at the zenith. The ridges stand in for the horizon, so a body that is up is shown.
 */
export function altitudeY(skyline: Skyline, x: number, altitude: number): number {
  const ridge = skyline(x)
  const base = ridge + (Math.min(ridge, ARC_Y) - ridge) * smooth(altitude / 15)
  const lift = Math.sign(altitude) * Math.abs(Math.sin(altitude * RAD)) ** 0.8
  return base - (base - SKY_TOP) * lift
}
