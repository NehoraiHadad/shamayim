import { leftAzimuth, SCENE_CAMERA, wrap180, type Camera } from '../../domain/camera'
import { seaSideOf, waterInView, type WaterLookup } from '../water/waterInView'
import { anglePx } from './angleScale'
import { apparentAngle, localHeight, type HorizonPoint, type Panorama } from './panorama'
import { pointsToPath } from './profile'
import { sightProfiles } from './sightProfile'
import type { SceneTerrain } from './terrain'
import { visibilityAt } from './visibility'

type Pt = [number, number]

/** Where the village sits: the near ridge due south stands at this y... */
const MIDDLE_Y = 96
/** ...unless the lowest near ridge (looking down from a hilltop) would then fall below this y (under the sheet). */
const LOWEST_Y = 110

const median = (values: number[]) => {
  if (!values.length) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * The scene's land from a horizon panorama. Across, each ray sits at its azimuth's x (the sky's own mapping); up, each
 * ridge at its angle on the sky's scale (`anglePx`) above eye level, which stands at `horizonY`.
 */
export function terrainFromPanorama(given: Panorama,
  view: { camera?: Camera; horizonY?: number; water?: WaterLookup | null } = {}): SceneTerrain {
  const p = inViewOrder(given, view.camera ?? SCENE_CAMERA)
  const n = p.rays.length
  const xOf = (i: number) => (375 * i) / (n - 1)
  const mid = p.rays[Math.floor(n / 2)]
  const horizonY = view.horizonY ?? sceneHorizonY(p)
  const yOf = (angle: number) => horizonY - anglePx(angle)
  const round = (v: number) => Math.round(v * 10) / 10
  // A light 1-2-1 smoothing over neighbouring rays (±1.25°) takes the DEM's pixel steps out of the line; the sun and
  // moon are measured against the drawn line itself, so they still hide exactly behind what you see.
  const smooth = (values: number[]) => values.map((v, i) => (values[Math.max(0, i - 1)] + 2 * v + values[Math.min(values.length - 1, i + 1)]) / 4)
  const nearAngles = smooth(p.rays.map((ray) => ray.near.angle))
  const farAngles = smooth(p.rays.map((ray) => Math.max(ray.far.angle, ray.near.angle))).map((a, i) => Math.max(a, nearAngles[i]))
  const nearPoints = nearAngles.map((angle, i): Pt => [round(xOf(i)), round(yOf(angle))])
  const farPoints = farAngles.map((angle, i): Pt => [round(xOf(i)), round(yOf(angle))])
  // The water really in view (WorldCover's water along the rays, where the line of sight reaches it).
  const water = view.water ? waterInView(p, view.water, xOf, yOf) : []
  const seaSide = seaSideOf(water)
  // The sea line: with the sea in view, its horizon; below sea level, where sea level meets the slopes around (each
  // slope taken as straight from the eye up to its crest); otherwise eye level.
  const below = p.rays.filter((ray) => ray.far.elevation > 0 && p.eyeM < 0)
  const seaY = seaSide ? median(water.filter((span) => span.kind === 'sea').flatMap((span) => span.edges.map((edge) => edge.farY)))
    : below.length ? median(below.map((ray) => yOf(ray.far.angle * (0 - p.eyeM) / (ray.far.elevation - p.eyeM))))
      : horizonY
  const ground: HorizonPoint = { angle: apparentAngle(p.groundM, 0.4, p.eyeM), elevation: p.groundM, distance: 0 }
  const snowEdge = (layer: 'near' | 'far', lineM: number): Pt[] => p.rays.map((ray, i): Pt => {
    const base = layer === 'near' ? ground : ray.near
    const crest = layer === 'near' ? ray.near : ray.far.angle > ray.near.angle ? ray.far : ray.near
    const x = xOf(i)
    // Above the crest: no snow on this ray (the edge sits above the land, with room for the edge's wobble).
    if (lineM >= crest.elevation) return [x, yOf(crest.angle) - 16]
    if (lineM <= base.elevation || crest.elevation <= base.elevation) return [x, 140]
    const t = (lineM - base.elevation) / (crest.elevation - base.elevation)
    return [x, yOf(base.angle + t * (crest.angle - base.angle))]
  })
  const profiles = sightProfiles(p)
  const seenAt = visibilityAt(p, yOf, profiles)
  const sightAt = (x: number) => {
    const i = Math.min(n - 1, Math.max(0, Math.round((x / 375) * (n - 1))))
    const ray = p.rays[i]
    return { nearKm: ray.near.distance, farKm: ray.far.distance, farShows: farAngles[i] > nearAngles[i] + 0.15,
      seenAt: (km: number, heightM?: number) => seenAt(x, km, heightM) }
  }
  return {
    near: pointsToPath(nearPoints),
    far: pointsToPath(farPoints),
    centerLeft: '50%',
    centerY: yOf(mid.near.angle),
    seaY: Number.isFinite(seaY) ? seaY : horizonY,
    seaInView: seaSide !== null,
    seaSide,
    water,
    nearPoints,
    farPoints,
    nearElevations: p.rays.map((ray) => ray.near.elevation),
    farElevations: p.rays.map((ray) => (ray.far.angle > ray.near.angle ? ray.far : ray.near).elevation),
    horizonY,
    snowEdge,
    sightAt,
    seenAt,
    groundAt: profiles.groundAt,
    ...(given.local ? { heightNear: (dx: number, dy: number) => localHeight(given.local!, dx, dy) } : {}),
    angleY: yOf,
    camera: view.camera ?? SCENE_CAMERA,
  }
}

/**
 * The panorama's rays from the camera's left edge to its right: a stored south panorama runs west-north-west first
 * (`STORED_CAMERA`), so for the true view facing south (east on the left) it is turned round.
 */
export function inViewOrder(p: Panorama, camera: Camera = SCENE_CAMERA): Panorama {
  const n = p.rays.length
  const off = (azimuth: number) => Math.abs(wrap180(azimuth - leftAzimuth(camera)))
  return n > 1 && off(p.rays[n - 1].azimuth) < off(p.rays[0].azimuth) ? { ...p, rays: [...p.rays].reverse() } : p
}

/**
 * Eye level (y) for the south panorama: the near ridge due south at `MIDDLE_Y`, unless the lowest near ridge would then
 * fall under `LOWEST_Y`. A turning view keeps the one eye level of its place (`worldHorizonY`), so the land does not
 * rise and fall as it turns.
 */
export function sceneHorizonY(p: Panorama): number {
  const mid = p.rays[Math.floor(p.rays.length / 2)]
  const lowestNear = Math.min(...p.rays.map((ray) => ray.near.angle))
  return Math.min(MIDDLE_Y + anglePx(mid.near.angle), LOWEST_Y + anglePx(lowestNear))
}
