import { expect } from 'vitest'
import type { HighPlane } from '../../world/life'
import { AHEAD_STEP_S } from '../../world/lifeAhead'
import { skyDirection } from '../../world/lifeSchedule'
import type { WorldState } from '../../world/types'
import { trackAt } from './anim'
import { contrailFrame, rotateScale } from './contrailFrame'
import { trailAt, type LaidPuff } from './contrailMotion'
import { crestOf } from './life'
import { flightInView } from './lifeTracks'
import type { SkyGeom } from './sky'
import { tangentScale, unitOf } from './tangent'
import type { LayerDesc, LayerOf, Pt, SceneBox } from './types'

export const distance = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])
export const visible = ([x, y]: Pt, geom: SkyGeom) => x >= 0 && x <= geom.width && y >= 0 && y <= geom.horizon

export function pose(layer: LayerDesc, phase: number) {
  const lay = layer.placed!, flight = trackAt(layer.animated!.flight, phase)!
  return { point: [lay.x + flight.x, lay.y + flight.y] as Pt, scale: lay.scale * flight.scale,
    turn: (lay.turn ?? 0) + flight.turn, alpha: lay.alpha * flight.alpha }
}

/** Replay the old sample-zero gates. Rounded flock bounds make the geometric bird gate conservative by under 3 px. */
export function legacyCull(layer: LayerDesc, first: ReturnType<typeof pose>, geom: SkyGeom) {
  const { point: [x, y], scale, alpha } = first
  const b = layer.bounds
  if (layer.kind === 'birds') {
    return alpha < 0.01 || x + (b.x + b.w) * scale < -4 || x + b.x * scale > geom.width + 4 || y + (b.y + b.h) * scale < -4
  }
  if (layer.id.startsWith('aircraft.low.')) return alpha < 0.01 || x < -10 || x > geom.width + 10
  return alpha <= 0.01 || x <= -60 || x >= geom.width + 60 || y <= -40 || y >= geom.horizon
}

/** Independent chord along the aircraft's heading, measured from the spherical unit vectors, in px/km. */
export function localScale(layer: LayerOf<'contrail'>, plane: HighPlane, world: WorldState, geom: SkyGeom, phase: number) {
  const head = plane.plane!, heading = plane.headingDeg * Math.PI / 180
  const dir = skyDirection(head.e, head.n, head.up)
  if (!visible([geom.x(dir.azimuth), geom.dome(dir.altitude)], geom)) return null
  const near = { e: head.e - 2 * Math.sin(heading), n: head.n - 2 * Math.cos(heading), up: head.up }
  const [u, v] = [dir, skyDirection(near.e, near.n, near.up)].map(unitOf)
  const arc = 2 * Math.asin(Math.hypot(...u.map((x, i) => x - v[i])) / 2) * 180 / Math.PI
  const expected = arc * tangentScale(world, geom, dir.altitude) / 2
  const f = contrailFrame(world, geom, plane)
  const actual = distance(f.point(head)!, f.point(near)!) * pose(layer, phase).scale / 2
  return { actual, expected }
}

/** A cruise trajectory is linear in km, so the halfway position can be projected independently of its 2 s track. */
export function cruiseInterpolation(layer: LayerDesc, plane: HighPlane, geom: SkyGeom, phase: number) {
  const [a, b] = plane.samples ?? []
  if (!a || !b) return 0
  const midpoint = skyDirection((a.e + b.e) / 2, (a.n + b.n) / 2, a.up)
  const exact: Pt = [geom.x(midpoint.azimuth), geom.dome(midpoint.altitude)]
  return visible(exact, geom) ? distance(exact, pose(layer, phase + 1).point) : 0
}

const puffMap = (puffs: LaidPuff[]) => new Map(puffs.filter((p) => p.seed !== null).map((p) => [p.seed, p]))

export function trailContinuity(a: LayerOf<'contrail'>, b: LayerOf<'contrail'>, phase: number, geom: SkyGeom) {
  const before = puffMap(trailAt(a, phase)), lastFrame = puffMap(trailAt(a, phase - 1 / 30))
  const age = () => ({ count: 0, width: 0, alpha: 0, frameWidth: 0, frameAlpha: 0 })
  const result = { px: 0, count: 0, young: age(), old: age() }
  for (const puff of trailAt(b, phase)) {
    const old = before.get(puff.seed)
    if (!old || !visible(puff.point, geom)) continue
    result.count++
    result.px = Math.max(result.px, distance(old.point, puff.point))
    const end = puff.ageS <= 180 ? result.young : puff.ageS >= b.trail.lifeS * 0.55 ? result.old : null
    if (!end) continue
    end.count++
    end.width = Math.max(end.width, Math.abs(old.width - puff.width))
    end.alpha = Math.max(end.alpha, Math.abs(old.alpha - puff.alpha))
    const prior = lastFrame.get(puff.seed)
    if (prior) {
      end.frameWidth = Math.max(end.frameWidth, Math.abs(old.width - prior.width))
      end.frameAlpha = Math.max(end.frameAlpha, Math.abs(old.alpha - prior.alpha))
    }
  }
  expect(result.px).toBeLessThanOrEqual(1)
  expect(Math.max(result.young.width, result.old.width)).toBeLessThanOrEqual(0.5)
  expect(Math.max(result.young.alpha, result.old.alpha)).toBeLessThanOrEqual(0.03)
  return result
}

/** Check the largest error from linearly interpolating projected drift halfway between whole-minute samples. */
export function driftInterpolation(layer: LayerOf<'contrail'>, plane: HighPlane, world: WorldState, geom: SkyGeom, phase: number) {
  const laid = pose(layer, phase + 30), frame = contrailFrame(world, geom, plane)
  const bySeed = new Map(plane.trail.map((p) => [p.seed, p]))
  let error = 0
  for (const puff of trailAt(layer, phase + 30)) {
    const start = bySeed.get(puff.seed!)
    if (!start || !visible(puff.point, geom)) continue
    const exact = frame.point({ e: start.e + 30 * plane.driftE, n: start.n + 30 * plane.driftN, up: start.up })
    if (!exact) continue
    const [x, y] = rotateScale(exact, laid.turn, laid.scale)
    error = Math.max(error, distance(puff.point, [laid.point[0] + x, laid.point[1] + y]))
  }
  return error
}

export function frontChange(a: LayerDesc, b: LayerDesc, geom: SkyGeom, world: WorldState, phase: number, box: SceneBox) {
  const { point: [x, y], scale, turn, alpha } = pose(b, phase)
  if (alpha < 0.01) return 0
  const { x: bx, y: by, w, h } = a.bounds
  const c = Math.cos(turn), s = Math.sin(turn)
  const corners = [[bx, by], [bx + w, by], [bx, by + h], [bx + w, by + h]]
  const xs = corners.map(([u, v]) => x + (c * u - s * v) * scale)
  const ys = corners.map(([u, v]) => y + (s * u + c * v) * scale)
  if (Math.max(...xs) <= 0 || Math.min(...xs) >= geom.width) return 0
  const crest = crestOf(world, box, geom)
  const left = Math.max(0, Math.ceil(Math.min(...xs))), right = Math.min(geom.width, Math.floor(Math.max(...xs)))
  let top = box.landTop + box.landHeight
  for (let col = left; col <= right; col++) top = Math.min(top, crest(col))
  return Math.max(0, Math.min(box.skyHeight, Math.max(...ys)) - Math.max(box.landTop, top, Math.min(...ys)))
}

export function culledAtStart(layer: LayerDesc, time: number, geom: SkyGeom, box: SceneBox) {
  const first = pose(layer, time)
  if (flightInView([{ ...first, x: first.point[0], y: first.point[1] }], layer.bounds, geom.width, box.skyHeight)) return null
  for (let t = AHEAD_STEP_S; t < 60; t += AHEAD_STEP_S) {
    const sample = pose(layer, time + t)
    if (flightInView([{ ...sample, x: sample.point[0], y: sample.point[1] }], layer.bounds, geom.width, box.skyHeight)) return { time: t, first }
  }
  return null
}
