import { groundFn } from '../landmarks/seat'
import type { Coordinate } from '../landmarks/project'
import { apparentAngle } from '../terrain/panorama'
import type { SceneTerrain } from '../terrain/terrain'
import type { CityRaster } from './cityRaster'
import { COLUMN_WIDTH } from './columns'
import { homeRoof, STOREY_M } from './skylineHeight'
import { skylineBand, skylineRay, solidRoofs, type SkylineBand, type SkylineView } from './skylineRay'
import { projectSkylineTowers } from './skylineTowers'
import type { CityTower } from './types'

export type SkylineFace = { top: number; foot: number; km: number; cover: number; pitch: number }
type Faces = [SkylineFace | null, SkylineFace | null, SkylineFace | null]
export type SkylineColumn = { left: number; right: number; faces: Faces }
export type SkylineData = NonNullable<ReturnType<typeof skylineData>>

function columnFaces(place: Coordinate, width: number, raster: CityRaster, view: SkylineView,
  eyeLiftM: number, left: number, right: number): Faces {
  const ray = skylineRay(view, (left + right) / 2, width, eyeLiftM)
  const faces: Faces = [null, null, null]
  let massAngle = -Infinity
  for (const { km, heightM, cover } of solidRoofs(place, raster, ray.azimuth, left / COLUMN_WIDTH)) {
    const roof = ray.roofAt(km, heightM)
    if (!roof || roof.angle <= Math.max(massAngle, ray.terrainAt(km))) continue
    massAngle = roof.angle
    const top = Math.min(roof.top, roof.foot - 1.5)
    const storeyY = view.angleY(apparentAngle(roof.groundM + heightM - eyeLiftM - STOREY_M, km, 0))
    faces[skylineBand(km)] = { top, foot: roof.foot, km, cover, pitch: storeyY - roof.top }
  }
  return faces
}

export function skylineData(place: Coordinate, width: number, raster: CityRaster | undefined, terrain: SceneTerrain,
  towers: readonly CityTower[] = []) {
  const { groundAt, angleY, sightAt } = terrain
  if (!raster || !groundAt || !angleY || !sightAt || !(width > 0) || !Number.isFinite(width)) return null
  const view = { ground: groundFn(terrain.nearPoints, width), groundAt, angleY, sightAt }
  const eyeLiftM = homeRoof(place, raster)
  const columns: SkylineColumn[] = []
  for (let left = 0; left < width; left += COLUMN_WIDTH) {
    const right = Math.min(left + COLUMN_WIDTH, width)
    columns.push({ left, right, faces: columnFaces(place, width, raster, view, eyeLiftM, left, right) })
  }
  return { columns, eyeLiftM, towers: projectSkylineTowers(place, raster, view, width, eyeLiftM, raster.towers ?? towers) }
}

export const SKYLINE_BANDS: readonly SkylineBand[] = [2, 1, 0]
