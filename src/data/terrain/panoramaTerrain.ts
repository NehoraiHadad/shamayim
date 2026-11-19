import { SCENE_CAMERA, type Camera } from '../../domain/camera'
import { anglePx } from './angleScale'
import { apparentAngle, type HorizonPoint, type Panorama } from './panorama'
import { pointsToPath } from './profile'
import { sightProfiles } from './sightProfile'
import type { SceneTerrain } from './terrain'
import { visibilityAt } from './visibility'

type Pt = [number, number]

/** Where the village sits: the near ridge due south stands at this y... */
const MIDDLE_Y = 96
/** ...unless the lowest near ridge (looking down from a hilltop) would then fall below this y (under the sheet). */
const LOWEST_Y = 110
/** A far horizon this share of the way along a side, lying at sea level, means the sea is in view on that side. */
const SEA_SHARE = 0.2

const median = (values: number[]) => {
  if (!values.length) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/** Sea within this distance (km) along a ray counts as sea in view (a city's own ground may hide its surface). */
const SEA_KM = 8
/** A ray that reaches the sea (the DEM's sea floor is raised to the surface in `fetchPanorama`) close enough to see it. */
const atSea = (ray: Panorama['rays'][number]) => ray.seaKm !== null && ray.seaKm <= SEA_KM

/** Which side the sea is on: west or east rays that reach it. */
function seaSideOf(p: Panorama): 'west' | 'east' | null {
  const half = Math.floor(p.rays.length / 2)
  const share = (rays: Panorama['rays']) => rays.filter(atSea).length / rays.length
  const west = share(p.rays.slice(0, half))
  const east = share(p.rays.slice(half + 1))
  if (Math.max(west, east) < SEA_SHARE) return null
  return west >= east ? 'west' : 'east'
}

/**
 * The scene's land from a horizon panorama. Across, each ray sits at its azimuth's x (the sky's own mapping); up, each
 * ridge at its angle on the sky's scale (`anglePx`) above eye level, which stands at `horizonY`.
 */
export function terrainFromPanorama(p: Panorama, view: { camera?: Camera; horizonY?: number } = {}): SceneTerrain {
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
  const seaSide = seaSideOf(p)
  // The sea line: on a coast, the sea horizon; below sea level, where sea level meets the slopes around (each slope
  // taken as straight from the eye up to its crest); otherwise eye level.
  const seaRays = p.rays.filter(atSea)
  const below = p.rays.filter((ray) => ray.far.elevation > 0 && p.eyeM < 0)
  const seaY = seaSide ? median(seaRays.map((ray) => yOf(Math.max(apparentAngle(0, ray.seaKm!, p.eyeM), ray.far.elevation <= 1 ? ray.far.angle : -90))))
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
    nearPoints,
    farPoints,
    nearElevations: p.rays.map((ray) => ray.near.elevation),
    farElevations: p.rays.map((ray) => (ray.far.angle > ray.near.angle ? ray.far : ray.near).elevation),
    horizonY,
    snowEdge,
    sightAt,
    seenAt,
    groundAt: profiles.groundAt,
    angleY: yOf,
    camera: view.camera ?? SCENE_CAMERA,
  }
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
