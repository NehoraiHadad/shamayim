import { anglePx } from '../data/terrain/angleScale'
import type { Camera } from '../domain/camera'
import type { HourPoint, LocalTime } from '../domain/types'
import { smoothstep } from './ridgeLighting'
import { sunLight, type Aerosol } from './sceneLight'

/*
 * The living light (2026-11-20, the owner's report: "the change is sharp instead of alive; it stands out on the houses and
 * on the clothes"). Every light parameter is a continuous function of the one world state: a body's direct share is the
 * part of its disc over the drawn land (softened by the air's shimmer at the land's edge) times what the air and the cloud
 * let through; every surface takes it by its own normal (Lambert, no left/right switch); the cloud between forecast hours
 * is read straight between them. Pure: no clock, no randomness.
 */

/** A body's true disc (0.53°) as a radius in drawn px at the horizon (the land's own vertical scale). */
export const DISC_PX = anglePx(0.53 / 2)
/**
 * The land's edge is never a knife against a low disc: the air's shimmer and the haze over the crest soften it by about a
 * disc's width (the penumbra a low sun's light goes through as it sinks).
 */
export const EDGE_SOFT = 2.5

/** The share of a disc of radius `r` whose centre stands `c` above a straight edge (exact: a circular segment). */
function segmentShare(c: number, r: number): number {
  const h = Math.max(0, Math.min(2 * r, c + r))
  if (h <= 0) return 0
  if (h >= 2 * r) return 1
  const d = r - h
  return (r * r * Math.acos(d / r) - d * Math.sqrt(Math.max(0, r * r - d * d))) / (Math.PI * r * r)
}

/**
 * The share of a body's disc over the drawn land (0–1): its centre `clearance` px over the land's top (negative behind
 * it), a circular segment of the true disc averaged over the edge's softness (a triangular kernel): continuous and
 * monotonic, so the light fades as the disc sinks behind the land instead of switching off.
 */
export function discShare(clearance: number, r = DISC_PX, soft = EDGE_SOFT): number {
  if (!Number.isFinite(clearance)) return clearance > 0 ? 1 : 0
  if (clearance >= r + soft) return 1
  if (clearance <= -r - soft) return 0
  const n = 9
  let sum = 0, weights = 0
  for (let i = 0; i < n; i++) {
    const u = -1 + (2 * i) / (n - 1)
    const w = 1 - Math.abs(u) + 1e-6
    sum += w * segmentShare(clearance + u * soft, r)
    weights += w
  }
  return sum / weights
}

/**
 * How strongly the direct sun lights a face through this much air (0–1 against a clean noon): the true transmission
 * through the air mass and the hour's aerosol (`sunLight`), as the adapted eye sees it (a compressive response: a sun 2°
 * up is a tenth of noon's light, and reads as about a third). Continuous down to the horizon: the low sun dims and warms
 * as it sinks instead of holding its noon strength to the last minute.
 */
export function airDim(altitude: number, aerosol: Aerosol): number {
  return Math.min(1, sunLight(altitude, aerosol).strength ** 0.35)
}

/**
 * The direct share over which directional light (a lit side, a shadow, a rim) eases in: none under the first (the light is
 * the sky's), full from the second. Under a closed deck the light is soft and nearly directionless, and turns so gradually.
 */
export const SHADING: readonly [number, number] = [0.04, 0.45]

/** The light's direction in the view's frame (a unit vector toward the source). */
export interface LightDir {
  /** + toward the screen's right. */
  across: number
  /** + into the scene: the source stands beyond the land, so the walls the eye sees are back-lit. */
  ahead: number
  up: number
}

/** A direction (deg) as a unit vector in the view's frame (`Camera`: its heading and handedness). */
export function viewDir(azimuth: number, altitude: number, camera: Camera): LightDir {
  const turn = ((azimuth - camera.heading) * Math.PI) / 180
  const flat = Math.cos((altitude * Math.PI) / 180)
  return { across: camera.handed * Math.sin(turn) * flat, ahead: Math.cos(turn) * flat, up: Math.sin((altitude * Math.PI) / 180) }
}

/** A surface's normal in the same frame. */
export type Normal = readonly [across: number, ahead: number, up: number]

/** The faces of a box seen from the eye: its front (toward the eye), its left and right sides, its top. */
export const NORMALS = {
  front: [0, -1, 0] as Normal,
  left: [-1, 0, 0] as Normal,
  right: [1, 0, 0] as Normal,
  top: [0, 0, 1] as Normal,
}

/**
 * Lambert's light on a face (0–1) from its normal against the light's direction, with a little `wrap` for rough plaster,
 * foliage and cloth (light carried a little past the terminator by the surface's own roughness and the air): monotonic in
 * the angle, 1 square to the light, 0 a little past the edge. Never a switch.
 */
export function lambert(n: Normal, dir: LightDir, wrap = 0): number {
  const dot = n[0] * dir.across + n[1] * dir.ahead + n[2] * dir.up
  return Math.max(0, Math.min(1, (dot + wrap) / (1 + wrap)))
}

/**
 * The light each face of a box takes (0–1), its direct share included: Lambert's with a little wrap for plaster, eased by
 * a gentle contrast curve so a face 60° off the sun still reads lit in the scene's small shapes; `rim` the light a back-lit
 * edge catches (the source beyond the land, low); all fading out with the direct light itself (below ~0.25 the faces ease
 * toward the sky's even light), so nothing switches.
 */
export interface FaceLight { front: number; left: number; right: number; top: number; rim: number; across: number }

export function faceLight(dir: LightDir, direct: number): FaceLight {
  const on = smoothstep(SHADING[0], SHADING[1], direct)
  const k = (n: Normal) => on * lambert(n, dir, 0.15) ** 0.7
  const back = Math.max(0, dir.ahead) * (1 - smoothstep(10, 45, Math.asin(Math.max(-1, Math.min(1, dir.up))) * 180 / Math.PI))
  return { front: k(NORMALS.front), left: k(NORMALS.left), right: k(NORMALS.right), top: k(NORMALS.top), rim: on * back,
    across: Math.max(-1, Math.min(1, dir.across / Math.max(0.05, Math.hypot(dir.across, dir.ahead)))) * on }
}

/**
 * One forecast field read at a minute: straight between the hour under it and the next, as `airInput` reads the cover;
 * null where either is unknown (the hour's own then).
 */
export function hourBetween(hours: readonly HourPoint[], at: LocalTime): HourPoint | undefined {
  const key = `${at.slice(0, 13)}:00`
  const index = hours.findIndex((h) => h.time === key)
  if (index < 0) return undefined
  const hour = hours[index], next = hours[index + 1]
  const f = Number(at.slice(14, 16)) / 60
  if (!next || f <= 0) return hour
  const lerp = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null ? a : a + (b - a) * f)
  return {
    ...hour,
    cloudLow: lerp(hour.cloudLow, next.cloudLow),
    cloudMid: lerp(hour.cloudMid, next.cloudMid),
    cloudHigh: lerp(hour.cloudHigh, next.cloudHigh),
    visibility: lerp(hour.visibility, next.visibility),
  }
}

/**
 * The share of windows lit (0–1) by the time of night, read smoothly: all through the evening, half late at night and
 * before dawn, a fifth in the small hours, eased over half an hour at each change instead of a step on the hour.
 */
export function eveningShare(localHour: number): number {
  const h = ((localHour % 24) + 24) % 24
  const ease = (a: number) => smoothstep(a - 0.25, a + 0.25, h)
  // 17–23 h: 1; 23–1 h: 0.5; 1–5 h: 0.2; 5–17 h: 0.5 (each change eased over half an hour; both halves meet at 0 and 12).
  return h >= 12 ? 0.5 + 0.5 * (ease(17) - ease(23)) : 0.5 - 0.3 * (ease(1) - ease(5))
}

/**
 * How far (km, across the view) the low cloud's air has carried its shadows since the day's midnight: the across part of
 * the 850 hPa wind (or the surface wind's double) integrated hour by hour, read straight within the hour, so the shadows
 * move continuously as the minute is scrubbed and faster or slower as the forecast's wind changes.
 */
const drifts = new WeakMap<readonly HourPoint[], Map<string, number[]>>()
export function cloudDriftKm(hours: readonly HourPoint[], at: LocalTime, across: (fromDeg: number) => number): number {
  const date = at.slice(0, 10)
  let byDate = drifts.get(hours)
  if (!byDate) drifts.set(hours, (byDate = new Map()))
  let cumulative = byDate.get(date)
  const speed = (h: HourPoint | undefined) => {
    if (!h) return 0
    const v = h.windAloft?.low
    return v ? v.speed * across(v.fromDeg) : 2 * h.windSpeed * across(h.windDirection ?? 270)
  }
  const day = hours.filter((h) => h.time.startsWith(date))
  if (!cumulative) {
    cumulative = [0]
    for (let i = 0; i < 24; i++) cumulative.push(cumulative[i] + (speed(day[i]) + speed(day[i + 1] ?? day[i])) / 2)
    byDate.set(date, cumulative)
  }
  const hour = Number(at.slice(11, 13)), f = Number(at.slice(14, 16)) / 60
  const a = speed(day[hour]), b = speed(day[hour + 1] ?? day[hour])
  return cumulative[hour] + a * f + ((b - a) * f * f) / 2
}
