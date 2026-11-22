import type { FlightPoint, HighPlane } from '../../world/life'
import { skyDirection } from '../../world/lifeSchedule'
import type { WorldState } from '../../world/types'
import { periodDelta } from './anim'
import { RAD } from './lifeTracks'
import type { SkyGeom } from './sky'
import { gnomonic, tangentFrame, tangentScale, unitOf } from './tangent'
import type { Pt } from './types'

const direction = ({ e, n, up }: FlightPoint) => skyDirection(e, n, up)
const angle = ([x, y]: Pt) => Math.atan2(y, x)
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
export const rotateScale = ([x, y]: Pt, turn: number, scale: number): Pt => {
  const c = scale * Math.cos(turn), s = scale * Math.sin(turn)
  return [c * x - s * y, s * x + c * y]
}

/** The fixed frame preserves the trail's shape. Match the head to the dome and set the ribbon's scale with a local
 * 2 km chord to an advected puff. The dome gives its direction and the local tangent metric its length. The chord
 * approximates along-course scale within 0.11% at the visible heads in the three fixture views. */
export function contrailFrame(world: WorldState, geom: SkyGeom, plane: HighPlane) {
  const { centre } = plane.crossing
  const d = direction(centre)
  const k = tangentScale(world, geom, d.altitude)
  const frame = tangentFrame(d, [0, 0], k, world.camera.handed)
  // The ends of a crossing can be more than 75° from closest approach. Cull in screen space.
  const project = (p: FlightPoint) => gnomonic(frame, direction(p), 1e-3)
  const heading = plane.headingDeg * RAD
  const speedE = plane.speedMs / 1000 * Math.sin(heading) - plane.driftE
  const speedN = plane.speedMs / 1000 * Math.cos(heading) - plane.driftN
  const seconds = 2 / Math.hypot(speedE, speedN)
  const at = (point: FlightPoint) => {
    const head = direction(point)
    const x = geom.x(head.azimuth), y = geom.dome(head.altitude)
    const here = project(point)!
    const behind = { e: point.e - speedE * seconds, n: point.n - speedN * seconds, up: point.up }
    const puff = direction(behind)
    const source = sub(here, project(behind)!)
    const target: Pt = [periodDelta(x - geom.x(puff.azimuth), geom.azimuthRange.period), y - geom.dome(puff.altitude)]
    const turn = angle(target) - angle(source)
    const u = unitOf(head), v = unitOf(puff)
    const arcDeg = 2 * Math.asin(Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2]) / 2) / RAD
    const scale = arcDeg * tangentScale(world, geom, head.altitude) / Math.hypot(...source)
    const origin = sub([x, y], rotateScale(here, turn, scale))
    return { turn, scale, x, y, origin }
  }
  return { point: project, at }
}
