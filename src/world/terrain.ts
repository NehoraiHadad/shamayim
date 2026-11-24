import { NEAR_KM } from '../data/terrain/panorama'
import type { LandStatus, SceneTerrain } from '../data/terrain/terrain'
import { anglePx } from '../data/terrain/angleScale'
import { facesOf } from './face'
import { landOf } from './land'
import { FLOOR_Y } from './sceneBox'
import type { Plane, Pt, TerrainPlanes } from './types'

/** Distances for the unknown land (C8), which knows none (nothing of it is drawn): the near band's edge, the far land beyond. */
const UNKNOWN_KM = { near: NEAR_KM, far: 20 } as const

function plane(points: readonly Pt[], elevations: number[] | undefined, km: (x: number) => number): Plane {
  const distanceKm = points.map(([x]) => km(x))
  return { points: points.map(([x, y]) => [x, y] as const), elevations, distanceKm, hazeKm: smooth(distanceKm) }
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0

/** A running median, then a running mean, each over ~±12 px of the reference width. */
function smooth(km: number[]): number[] {
  const n = km.length, span = Math.max(1, Math.round(n * 12 / 375))
  const around = (i: number, values: number[]) => values.slice(Math.max(0, i - span), Math.min(n, i + span + 1))
  const med = km.map((_, i) => median(around(i, km)))
  return med.map((_, i) => { const w = around(i, med); return w.reduce((a, b) => a + b, 0) / w.length })
}

export const terrainY = (horizonY: number, angle: number) => horizonY - anglePx(angle)

/** Whether the land is known: a terrain's own status, else known (a panorama). */
export const landStatusOf = (terrain: SceneTerrain): LandStatus => terrain.status ?? 'ready'

export { UNKNOWN_EYE_Y, unknownLand } from '../data/terrain/terrain'

/**
 * The land as planes: the near ridge and the far horizon, each point with its distance (from the panorama's rays), and
 * the ground that shows on each face (on the world's relief: eye level at `horizonY`), with its gullies, terraces and
 * scrub seeded by the place.
 */
export function terrainPlanes(terrain: SceneTerrain, placeId = ''): TerrainPlanes {
  const { sightAt } = terrain
  const planes = {
    near: plane(terrain.nearPoints, terrain.nearElevations, (x) => sightAt?.(x).nearKm ?? UNKNOWN_KM.near),
    far: plane(terrain.farPoints, terrain.farElevations, (x) => {
      const sight = sightAt?.(x)
      return sight ? (sight.farShows ? sight.farKm : sight.nearKm) : UNKNOWN_KM.far
    }),
    floorY: FLOOR_Y,
    horizonY: terrain.horizonY,
    status: landStatusOf(terrain),
    sightAt: terrain.sightAt,
    groundAt: terrain.groundAt,
    eyeM: terrain.eyeM,
    snowEdge: terrain.snowEdge,
  }
  const faces = facesOf(planes, (angle) => terrainY(terrain.horizonY, angle))
  return { ...planes, faces, land: landOf(planes, faces, placeId) }
}
