import { NEAR_KM } from '../data/terrain/panorama'
import type { SceneTerrain } from '../data/terrain/terrain'
import { FLOOR_Y } from './sceneBox'
import type { Plane, Pt, TerrainPlanes } from './types'

/** Distances for the drawn stand-in, which knows none: the near ridge at the near band's edge, the far land beyond. */
const STAND_IN_KM = { near: NEAR_KM, far: 20 } as const

function plane(points: readonly Pt[], elevations: number[] | undefined, km: (x: number) => number): Plane {
  return { points: points.map(([x, y]) => [x, y] as const), elevations, distanceKm: points.map(([x]) => km(x)) }
}

/** The land as planes: the near ridge and the far horizon, each point with its distance (from the panorama's rays). */
export function terrainPlanes(terrain: SceneTerrain): TerrainPlanes {
  const { sightAt } = terrain
  return {
    near: plane(terrain.nearPoints, terrain.nearElevations, (x) => sightAt?.(x).nearKm ?? STAND_IN_KM.near),
    far: plane(terrain.farPoints, terrain.farElevations, (x) => {
      const sight = sightAt?.(x)
      return sight ? (sight.farShows ? sight.farKm : sight.nearKm) : STAND_IN_KM.far
    }),
    floorY: FLOOR_Y,
    seaY: terrain.seaY,
    horizonY: terrain.horizonY,
    drawn: Boolean(terrain.drawn) || terrain.horizonY === undefined,
    sightAt: terrain.sightAt,
    seenAt: terrain.seenAt,
    groundAt: terrain.groundAt,
    snowEdge: terrain.snowEdge,
  }
}
