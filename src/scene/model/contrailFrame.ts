import type { FlightPoint, HighPlane } from '../../world/life'
import { skyDirection } from '../../world/lifeSchedule'
import type { WorldState } from '../../world/types'
import type { SkyGeom } from './sky'
import { gnomonic, tangentFrame, tangentScale } from './tangent'
import type { Pt } from './types'

const direction = ({ e, n, up }: FlightPoint) => skyDirection(e, n, up)
const angle = ([x, y]: Pt) => Math.atan2(y, x)
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
export const rotateScale = ([x, y]: Pt, turn: number, scale: number): Pt => {
  const c = scale * Math.cos(turn), s = scale * Math.sin(turn)
  return [c * x - s * y, s * x + c * y]
}

/** Keep the raster in one tangent frame throughout the crossing. Its straight ribbon has two registrations on the
 * dome: the fixed crossing start (far end) and the live head. This similarity preserves the straight projection while
 * meeting the dome-projected aircraft exactly. An expired head leaves the registration at the crossing end. */
export function contrailFrame(world: WorldState, geom: SkyGeom, plane: HighPlane) {
  const { start, centre, end } = plane.crossing
  const d = direction(centre)
  const k = tangentScale(world, geom, d.altitude)
  const frame = tangentFrame(d, [0, 0], k, world.camera.handed)
  // The reference points can be more than 75° from closest approach. Culling for the raster is in screen space.
  const project = (p: FlightPoint) => gnomonic(frame, direction(p), 1e-3)
  const anchor = project(start)!
  const startDir = direction(start)
  const anchorX = geom.x(startDir.azimuth), anchorY = geom.dome(startDir.altitude)
  const exactPeriod = 360 * world.camera.pxPerDeg * geom.s
  const centreX = geom.x(d.azimuth)
  const unwrap = (x: number) => x - Math.round((x - centreX) / exactPeriod) * exactPeriod
  const at = (point: FlightPoint) => {
    const head = direction(point)
    const x = geom.x(head.azimuth), y = geom.dome(head.altitude)
    const source = sub(project(point)!, anchor)
    const target: Pt = [unwrap(x) - unwrap(anchorX), y - anchorY]
    // At the crossing's start both baselines are zero. Use their first one-metre chord for the limiting transform.
    if (Math.hypot(...source) < 1e-6) {
      const f = 0.001 / Math.hypot(end.e - start.e, end.n - start.n)
      return registration({ e: start.e + (end.e - start.e) * f, n: start.n + (end.n - start.n) * f, up: start.up }, x, y)
    }
    return fit(source, target, x, y)
  }
  function registration(p: FlightPoint, x: number, y: number) {
    const d = direction(p)
    return fit(sub(project(p)!, anchor), [unwrap(geom.x(d.azimuth)) - unwrap(anchorX), geom.dome(d.altitude) - anchorY], x, y)
  }
  function fit(source: Pt, target: Pt, x: number, y: number) {
    const turn = angle(target) - angle(source)
    const scale = Math.hypot(...target) / Math.hypot(...source)
    return { turn, scale, x, y, origin: [x - target[0], y - target[1]] as Pt }
  }
  const point = (p: FlightPoint) => {
    const pt = project(p)
    return pt && sub(pt, anchor)
  }
  return { point, at, k }
}
