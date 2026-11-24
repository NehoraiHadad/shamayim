import { climatologyAt, type ClimatologySample } from '../data/land/climatology'
import { COVER_WATER } from '../data/land/grid'
import { prepareLandSampler } from '../data/land/sampleLand'
import type { LandData } from '../data/land/types'
import { destination } from '../data/terrain/panorama'
import type { SceneTerrain } from '../data/terrain/terrain'
import { azimuthAt, type Camera } from '../domain/camera'
import { monthFromIsoDate } from './landAgeBlend'
import { LIVING_LAND_DISTANCES_M, LIVING_LAND_RAYS, M_PER_DEG } from './landRays'
import { farGainOf, type FarGain } from './landReflectance'
import { albedoAt, samplePoint, type LivingLandSample } from './landSample'
import { footprintOf, nearGroundOf, type GroundCell, type NearGround } from './nearGround'

/**
 * Pure, structured-cloneable living-land state per place for the shown date (`world.land`).
 * Samples along the panorama's rays by distance (metres) and over a 3×3 grid on the place's own
 * ground, strictly from physical coordinates and data (never place names or ids).
 */
export { LIVING_LAND_DISTANCES_M, LIVING_LAND_RAYS } from './landRays'
export type { LivingLandSample } from './landSample'
export type { FarGain } from './landReflectance'

/** Local ground offsets (m): ±1.5 km reaches past the place's own near land (`heightNear` covers ±5.5 km). */
const LOCAL_OFFSETS_M = [-1500, 0, 1500] as const
const RAD = Math.PI / 180
const EMPTY_DATA: LandData = { cover: null, near: null, far: null, weather: null }

export interface LandRayBand { distanceM: number; elevationM: number; sample: LivingLandSample }
export interface LandRayColumn {
  x: number; azimuth: number; bands: LandRayBand[]
  /** The ground between the eye and the first DEM ring; absent where its cover is not known. */
  near?: NearGround
}
export interface LandLocalPoint { eastM: number; northM: number; elevationM: number; sample: LivingLandSample }

export interface LivingLand {
  /** Shown local calendar date (`YYYY-MM-DD`) driving season and local-date weather blending. */
  date: string
  /** Shown UTC calendar date (`YYYY-MM-DD`) driving causal UTC satellite age blending. */
  utcDate: string
  /** Calendar month (`1..12`) of `date` (never from the system clock). */
  month: number
  /** Distance rings sampled along each ray, in metres. */
  distancesM: number[]
  rays: LandRayColumn[]
  /** Sample at the place's own centre (`eastM = 0, northM = 0`). */
  own: LivingLandSample
  /** 3×3 grid over the place's own ground (±1.5 km east/north). */
  local: LandLocalPoint[]
  /** How the far GIBS colour was put on the near S2 reflectance scale (`landReflectance.ts`). */
  farGain: FarGain
}

export interface LivingLandInput {
  lat: number; lon: number; elevationM: number
  /** Shown local calendar date (`YYYY-MM-DD`). */
  shownDate: string
  /** Shown UTC calendar date (`YYYY-MM-DD`); defaults to `shownDate` when omitted. */
  shownUtcDate?: string
  camera: Camera; terrain: SceneTerrain; data?: LandData | null
}

/** Builds the pure, structured-cloneable living-land state for a place on `(shownDate, shownUtcDate)`. */
export function livingLandOf(input: LivingLandInput): LivingLand {
  const { lat, lon, elevationM, shownDate, camera, terrain } = input
  const utcDate = input.shownUtcDate ?? shownDate
  const data = input.data ?? EMPTY_DATA
  const month = monthFromIsoDate(shownDate)
  const sampler = prepareLandSampler(data)
  const farGain = farGainOf(data, utcDate)
  const cosLat = Math.max(1e-6, Math.cos(lat * RAD))

  const elevationNear = (eastM: number, northM: number) => terrain.heightNear?.(eastM / 1000, northM / 1000) ?? elevationM
  const geoNear = (eastM: number, northM: number) => [lat + northM / M_PER_DEG, lon + eastM / (M_PER_DEG * cosLat)] as const

  const local: LandLocalPoint[] = []
  for (const northM of LOCAL_OFFSETS_M) {
    for (const eastM of LOCAL_OFFSETS_M) {
      const elevM = elevationNear(eastM, northM)
      const sample = samplePoint(sampler, ...geoNear(eastM, northM), elevM, shownDate, utcDate, month, farGain)
      local.push({ eastM, northM, elevationM: elevM, sample })
    }
  }
  const own = local.find((p) => p.eastM === 0 && p.northM === 0)!.sample

  // Only a cover class tells dry ground from water, so without the cover grid (near or far satellite colour alone) the near
  // ground is not known. The climatology is the eye's own for every cell: one look a class, whichever bearing asks first.
  const climates = new Map<number, ClimatologySample>(), eyeElevationM = elevationNear(0, 0)
  const climateOf = (cover: number) => {
    let climate = climates.get(cover)
    if (!climate) climates.set(cover, climate = climatologyAt(lat, lon, eyeElevationM, month, cover))
    return climate
  }
  const footprint = data.cover && footprintOf(lat, lon, cosLat, (eastM, northM): GroundCell => {
    const [cellLat, cellLon] = geoNear(eastM, northM), { cover } = sampler.coverAt(cellLat, cellLon)
    if (cover === null) return null
    return cover === COVER_WATER ? 'water' : albedoAt(sampler, cellLat, cellLon, cover, utcDate, farGain, () => climateOf(cover))
  })

  const rays: LandRayColumn[] = []
  for (let i = 0; i < LIVING_LAND_RAYS; i++) {
    const frac = i / (LIVING_LAND_RAYS - 1), x = frac * camera.width
    const azimuth = ((azimuthAt(frac, camera) % 360) + 360) % 360
    const bands: LandRayBand[] = LIVING_LAND_DISTANCES_M.map((distanceM) => {
      const km = distanceM / 1000
      const pt = destination(lat, lon, km, azimuth)
      // `groundAt` is height relative to the eye (m); absolute elevation needs the eye's own height.
      const hRel = terrain.groundAt?.(x, km) ?? null
      const elev = hRel !== null && terrain.eyeM !== undefined ? terrain.eyeM + hRel : elevationM
      return { distanceM, elevationM: elev, sample: samplePoint(sampler, pt.lat, pt.lon, elev, shownDate, utcDate, month, farGain) }
    })
    const near = footprint ? nearGroundOf(footprint(azimuth)) : undefined
    rays.push({ x, azimuth, bands, ...(near && { near }) })
  }

  return { date: shownDate, utcDate, month, distancesM: [...LIVING_LAND_DISTANCES_M], rays, own, local, farGain }
}
