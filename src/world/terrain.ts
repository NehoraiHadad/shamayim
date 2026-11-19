import { NEAR_KM } from '../data/terrain/panorama'
import type { SceneTerrain } from '../data/terrain/terrain'
import { anglePx } from '../data/terrain/angleScale'
import { facesOf } from './face'
import { landOf } from './land'
import { FLOOR_Y, HORIZON_Y } from './sceneBox'
import type { Plane, Pt, TerrainPlanes } from './types'

/** Distances for the drawn stand-in, which knows none: the near ridge at the near band's edge, the far land beyond. */
const STAND_IN_KM = { near: NEAR_KM, far: 20 } as const

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

/**
 * The land as planes: the near ridge and the far horizon, each point with its distance (from the panorama's rays), and
 * the ground that shows on each face (on the world's relief: eye level at `horizonY`), with its gullies, terraces and
 * scrub seeded by the place.
 */
export function terrainPlanes(terrain: SceneTerrain, placeId = ''): TerrainPlanes {
  const { sightAt } = terrain
  const planes = {
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
  const horizonY = terrain.horizonY ?? HORIZON_Y
  const faces = facesOf(planes, (angle) => horizonY - anglePx(angle))
  return { ...planes, faces, land: landOf(planes, faces, placeId) }
}
