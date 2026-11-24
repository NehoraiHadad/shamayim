import type { Plane, TerrainPlanes } from '../../world/types'
import { SCENE_W } from '../../world/sceneBox'
import { PALETTE_COLS, type PlaneName } from './faceProjection'

/** Hash the complete inputs consumed by the form and receiver builders once per terrain revision. */
export function planeGeometryKey(terrain: TerrainPlanes, name: PlaneName, plane: Plane, arrays: readonly Float32Array[]) {
  const value = new Float64Array(1)
  const bits = new Uint32Array(value.buffer)
  let hash = 2166136261
  const number = (n: number) => {
    value[0] = n
    hash = Math.imul(Math.imul(hash ^ bits[0], 16777619) ^ bits[1], 16777619)
  }
  const path = (points: readonly (readonly [number, number])[]) => {
    number(points.length)
    for (const point of points) { number(point[0]); number(point[1]) }
  }
  path(plane.points)
  path(terrain.near.points)
  number(plane.distanceKm.length)
  for (const km of plane.distanceKm) number(km)
  for (const array of arrays) {
    number(array.length)
    for (let i = 0; i < array.length; i++) number(array[i])
  }

  if (name !== 'back') {
    const columns = terrain.faces[name]?.columns ?? []
    number(columns.length)
    for (const col of columns) {
      number(col.x); number(col.crest); number(col.points.length)
      for (const pt of col.points) { number(pt.km); number(pt.y); number(pt.slope); number(pt.h) }
    }
    const land = terrain.land?.[name]
    number(land?.terraces.length ?? 0)
    for (const pts of land?.terraces ?? []) path(pts)
    number(land?.gullies.length ?? 0)
    for (const gully of land?.gullies ?? []) { number(gully.w); number(gully.alpha); path(gully.points) }
  }
  if (name === 'far' && terrain.sightAt) {
    for (let i = 0; i < PALETTE_COLS.far; i++) {
      number(Number(terrain.sightAt(i * SCENE_W / (PALETTE_COLS.far - 1)).farShows))
    }
  }
  return (hash >>> 0).toString(36)
}
