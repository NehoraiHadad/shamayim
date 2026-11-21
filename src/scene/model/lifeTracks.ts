import type { FlightPoint, Flock, FlockSample, HighPlane, LowPlane, LowSample } from '../../world/life'
import { AHEAD_STEP_S } from '../../world/lifeAhead'
import { airDirection, skyDirection } from '../../world/lifeSchedule'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { periodDelta } from './anim'
import type { SkyGeom } from './sky'
import type { Box, LifeClock, Pt, Track } from './types'

export const LIFE_START: LifeClock = { laidAt: 0, sinceS: 0 }
export const RAD = Math.PI / 180

interface Pose { x: number; y: number; scale: number; alpha: number; turn?: number }

const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

export function openTrack(path: Pt[], life: LifeClock): Track {
  return { path, step: AHEAD_STEP_S, open: true, at: life.sinceS - life.laidAt }
}

export function poseTrack(poses: Pose[], life: LifeClock, azimuthRange?: SkyGeom['azimuthRange']): Track {
  const first = poses[0]
  const track = openTrack(poses.map((p) => [p.x - first.x, p.y - first.y]), life)
  track.scale = poses.map((p) => p.scale / first.scale)
  track.alpha = poses.map((p) => p.alpha / trackBaseAlpha(first))
  if (azimuthRange) track.wrapX = { min: azimuthRange.min - first.x, period: azimuthRange.period }
  if (first.turn !== undefined) {
    let last = first.turn, turn = 0
    track.turn = poses.map((p) => {
      const next = p.turn ?? last
      turn += angleDelta(next, last)
      last = next
      return turn
    })
  }
  return track
}

/** A zero-opacity start uses absolute track opacity so later samples can fade in. */
export const trackBaseAlpha = (pose: Pose) => pose.alpha || 1

/** Test the same projected samples that the compositor will lay, including the rotated sprite's extent. */
export function flightInView(poses: Pose[], bounds: Box, width: number, height: number): boolean {
  return poses.some(({ x, y, scale, alpha, turn = 0 }) => {
    if (alpha < 0.01) return false
    const c = Math.cos(turn), s = Math.sin(turn)
    const u = bounds.x + bounds.w / 2, v = bounds.y + bounds.h / 2
    const cx = x + (c * u - s * v) * scale, cy = y + (s * u + c * v) * scale
    const rx = (Math.abs(c) * bounds.w + Math.abs(s) * bounds.h) * scale / 2
    const ry = (Math.abs(s) * bounds.w + Math.abs(c) * bounds.h) * scale / 2
    return cx + rx >= 0 && cx - rx <= width && cy + ry >= 0 && cy - ry <= height
  })
}

export function birdPose(world: WorldState, geom: SkyGeom, nearM: number, flock: FlockSample): Pose {
  const nearFade = world.air.fade(nearM / 1000), farFade = world.air.fade(flock.distanceM / 1000)
  return { x: geom.x(flock.azimuth), y: geom.y(flock.altitude), scale: Math.min(1, nearM / flock.distanceM),
    alpha: flock.fade * Math.min(1, (1 - farFade) / Math.max(0.05, 1 - nearFade)) }
}

export function birdPoses(world: WorldState, geom: SkyGeom, flock: Flock) {
  return (flock.samples ?? [flock]).map((p) => birdPose(world, geom, flock.nearM, p))
}

export const LOW_SPRITE_PX = 9
/** Low over the field, the plane sinks into or lifts out of the haze over five minutes at its vertical speed. */
const NEAR_FIELD_S = 300

export function lowPose(world: WorldState, geom: SkyGeom, plane: LowPlane, sample: LowSample) {
  const d = airDirection(sample.at.e, sample.at.n, sample.at.up), n = airDirection(sample.ahead.e, sample.ahead.n, sample.ahead.up)
  const x = geom.x(d.azimuth), y = geom.y(d.altitude)
  const reach = world.night.dark > 0.5 ? 50 : plane.light ? 18 : 45
  const vertical = plane.speedMs * Math.max(0.02, sample.overFieldM / Math.max(500, sample.fieldKm * 1000))
  const alpha = (1 - smoothstep(0.2 * reach, reach, d.km)) * smoothstep(0, NEAR_FIELD_S * vertical, sample.overFieldM) *
    smoothstep(0, 0.45 * plane.pathKm, plane.pathKm - sample.fieldKm)
  const turn = screenAngle(x, y, geom.x(n.azimuth), geom.y(n.altitude), geom.azimuthRange.period)
  // Apparent span of a 35 m jet or 11 m light plane, enlarged by 9 for legibility and limited to 2.5–9 CSS px.
  const span = plane.light ? 11 : 35
  const size = Math.max(2.5, Math.min(9, (span / (d.km * 1000)) / RAD * world.camera.pxPerDeg * geom.s * 9))
  return { x, y, scale: size / LOW_SPRITE_PX, alpha, turn, km: d.km, altitude: d.altitude }
}

export function lowPoses(world: WorldState, geom: SkyGeom, plane: LowPlane) {
  return (plane.samples ?? [plane]).map((p) => lowPose(world, geom, plane, p))
}

export const cruiseFar = (km: number) => 1 - smoothstep(70, 140, km)

export function screenAngle(x: number, y: number, nextX: number, nextY: number, period: number) {
  const dx = nextX - x
  return Math.atan2(nextY - y, periodDelta(dx, period))
}

export function highPose(geom: SkyGeom, plane: HighPlane, p: FlightPoint, shown: number) {
  const dir = skyDirection(p.e, p.n, p.up)
  const x = geom.x(dir.azimuth), y = geom.dome(dir.altitude)
  const h = plane.headingDeg * RAD
  // A local heading from the tangent to the straight crossing, a one-metre chord (<0.005 s in cruise).
  const next = skyDirection(p.e + 0.001 * Math.sin(h), p.n + 0.001 * Math.cos(h), p.up)
  return { x, y, scale: 1, alpha: shown * cruiseFar(Math.hypot(p.e, p.n)), km: dir.km, altitude: dir.altitude,
    turn: screenAngle(x, y, geom.x(next.azimuth), geom.dome(next.altitude), geom.azimuthRange.period) }
}

export function highPoses(geom: SkyGeom, plane: HighPlane, first: FlightPoint, shown: number) {
  let pose = highPose(geom, plane, first, shown)
  return (plane.samples ?? [first]).map((p) => {
    pose = p ? highPose(geom, plane, p, shown) : { ...pose, alpha: 0 }
    return pose
  })
}
