import { climatologyAt, type ClimatologySample } from '../data/land/climatology'
import { prepareLandSampler, type PreparedLandSampler } from '../data/land/sampleLand'
import type { LandData } from '../data/land/types'
import { destination } from '../data/terrain/panorama'
import type { SceneTerrain } from '../data/terrain/terrain'
import { azimuthAt, type Camera } from '../domain/camera'
import {
  blendLinearRgb, blendScalar, monthFromIsoDate, observationWeight, TAU_DAYS, type LivingLandSource,
} from './landAgeBlend'
import {
  delightReflectance, linearRgbToSrgb, srgbBytesToLinear, tciRgbToReflectance,
  type DelightStatus, type Vec3,
} from './landDelight'
import { LIVING_LAND_DISTANCES_M, LIVING_LAND_RAYS, normalAtRay, normalFromLocal } from './landTerrainNormal'
import type { RGB } from './types'

/**
 * Pure, structured-cloneable living-land state per place for the shown date (`world.land`).
 * Samples along the panorama's rays by distance (metres) and over a 3×3 grid on the place's own
 * ground, strictly from physical coordinates and data (never place names or ids).
 */
export { LIVING_LAND_DISTANCES_M, LIVING_LAND_RAYS } from './landTerrainNormal'

const LOCAL_OFFSETS_M = [-1500, 0, 1500] as const
const RAD = Math.PI / 180
const EMPTY_DATA: LandData = { cover: null, near: null, far: null, weather: null }
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

export interface LivingLandSample {
  /** WorldCover class index (`1..10`), or null where unknown / outside loaded coverage. */
  cover: number | null
  /** Light-free surface albedo in sRGB `0..1` (IEC 61966-2-1 from de-lit linear BOA reflectance). */
  albedo: RGB; albedoSource: LivingLandSource; albedoDate: string | null
  /** Whether topographic de-lighting was applied to the RGB observation or why it was skipped. */
  delit: DelightStatus
  ndvi: number; ndviSource: LivingLandSource; ndviDate: string | null
  dryness: number; drynessSource: LivingLandSource; drynessDate: string | null
  snow: number; snowSource: LivingLandSource; snowDate: string | null
}

export interface LandRayBand { distanceM: number; elevationM: number; sample: LivingLandSample }
export interface LandRayColumn { x: number; azimuth: number; bands: LandRayBand[] }
export interface LandLocalPoint { eastM: number; northM: number; elevationM: number; sample: LivingLandSample }

export interface LivingLand {
  /** Shown local calendar date (`YYYY-MM-DD`) driving season and observation age blending. */
  date: string
  /** Calendar month (`1..12`) of `date` (never from the system clock). */
  month: number
  /** Distance rings sampled along each ray, in metres. */
  distancesM: number[]
  rays: LandRayColumn[]
  /** Sample at the place's own centre (`eastM = 0, northM = 0`). */
  own: LivingLandSample
  /** 3×3 grid over the place's own ground (±1.5 km east/north). */
  local: LandLocalPoint[]
}

export interface LivingLandInput {
  lat: number; lon: number; elevationM: number; shownDate: string
  camera: Camera; terrain: SceneTerrain; data?: LandData | null
}

function samplePoint(
  sampler: PreparedLandSampler, lat: number, lon: number, elevationM: number,
  shownDate: string, month: number, normal: Vec3 | null,
): LivingLandSample {
  const raw = sampler.sampleAt(lat, lon, month, elevationM)
  let clim: ClimatologySample | null = null
  const getClim = () => (clim ??= climatologyAt(lat, lon, elevationM, month, raw.cover ?? 0))

  let albedo: RGB, albedoSource: LivingLandSource, albedoDate: string | null, delit: DelightStatus = 'none'
  if (raw.rgbSource === 'climatology') {
    albedo = [raw.rgb[0] / 255, raw.rgb[1] / 255, raw.rgb[2] / 255]
    albedoSource = 'climatology'; albedoDate = null
  } else {
    let obsLin: [number, number, number]
    let baseSrc: typeof raw.rgbSource | `s2:${string}:no-delight` = raw.rgbSource
    if (raw.rgbSource.startsWith('s2:')) {
      const dl = delightReflectance(tciRgbToReflectance(raw.rgb), raw.rgbSunElevation, raw.rgbSunAzimuth, normal)
      obsLin = dl.rho; delit = dl.status
      if (dl.status !== 'lambert') baseSrc = `${raw.rgbSource}:no-delight` as `s2:${string}:no-delight`
    } else if (raw.rgbSource.startsWith('s2-mean:')) {
      obsLin = tciRgbToReflectance(raw.rgb)
    } else {
      obsLin = srgbBytesToLinear(raw.rgb)
    }
    const w = observationWeight(shownDate, raw.rgbDate, TAU_DAYS.albedo)
    const climLin: [number, number, number] = w < 1 ? srgbBytesToLinear(getClim().rgb) : [0, 0, 0]
    const blended = blendLinearRgb(obsLin, climLin, baseSrc, raw.rgbDate, shownDate, TAU_DAYS.albedo)
    albedo = linearRgbToSrgb(blended.rgb); albedoSource = blended.source; albedoDate = blended.date
    if (blended.weight <= 0) delit = 'none'
  }

  const ndviC = raw.ndviSource === 'climatology' || observationWeight(shownDate, raw.ndviDate, TAU_DAYS.ndvi) >= 1 ? raw.ndvi : getClim().ndvi
  const ndviB = blendScalar(raw.ndvi, ndviC, raw.ndviSource, raw.ndviDate, shownDate, TAU_DAYS.ndvi)
  const dryC = raw.drynessSource === 'climatology' || observationWeight(shownDate, raw.drynessDate, TAU_DAYS.dryness) >= 1 ? raw.dryness : getClim().dryness
  const dryB = blendScalar(raw.dryness, dryC, raw.drynessSource, raw.drynessDate, shownDate, TAU_DAYS.dryness)
  const snowC = raw.snowSource === 'climatology' || observationWeight(shownDate, raw.snowDate, TAU_DAYS.snow) >= 1 ? raw.snowProb : getClim().snowProb
  const snowB = blendScalar(raw.snowProb, snowC, raw.snowSource, raw.snowDate, shownDate, TAU_DAYS.snow)

  return {
    cover: raw.cover, albedo, albedoSource, albedoDate, delit,
    ndvi: clamp(ndviB.value, -1, 1), ndviSource: ndviB.source, ndviDate: ndviB.date,
    dryness: clamp(dryB.value, 0, 1), drynessSource: dryB.source, drynessDate: dryB.date,
    snow: clamp(snowB.value, 0, 1), snowSource: snowB.source, snowDate: snowB.date,
  }
}

/** Builds the pure, structured-cloneable living-land state for a place on `shownDate` from data only. */
export function livingLandOf(input: LivingLandInput): LivingLand {
  const { lat, lon, elevationM, shownDate, camera, terrain } = input
  const month = monthFromIsoDate(shownDate)
  const sampler = prepareLandSampler(input.data ?? EMPTY_DATA)
  const cosLat = Math.max(1e-6, Math.cos(lat * RAD))

  const local: LandLocalPoint[] = []
  let own: LivingLandSample | null = null
  for (const northM of LOCAL_OFFSETS_M) {
    for (const eastM of LOCAL_OFFSETS_M) {
      const dxKm = eastM / 1000, dyKm = northM / 1000
      const ptLat = lat + dyKm / 111.32, ptLon = lon + dxKm / (111.32 * cosLat)
      const elev = terrain.heightNear?.(dxKm, dyKm) ?? elevationM
      const sample = samplePoint(sampler, ptLat, ptLon, elev, shownDate, month, normalFromLocal(terrain, dxKm, dyKm))
      local.push({ eastM, northM, elevationM: elev, sample })
      if (eastM === 0 && northM === 0) own = sample
    }
  }

  const rays: LandRayColumn[] = []
  for (let i = 0; i < LIVING_LAND_RAYS; i++) {
    const frac = i / (LIVING_LAND_RAYS - 1), x = frac * camera.width
    const azimuth = ((azimuthAt(frac, camera) % 360) + 360) % 360
    const bands: LandRayBand[] = LIVING_LAND_DISTANCES_M.map((distanceM) => {
      const km = distanceM / 1000
      const pt = destination(lat, lon, km, azimuth)
      const hRel = terrain.groundAt?.(x, km) ?? null
      const elev = hRel !== null && terrain.eyeM !== undefined ? terrain.eyeM + hRel : elevationM
      return {
        distanceM, elevationM: elev,
        sample: samplePoint(sampler, pt.lat, pt.lon, elev, shownDate, month, normalAtRay(terrain, camera, x, km, azimuth)),
      }
    })
    rays.push({ x, azimuth, bands })
  }

  return { date: shownDate, month, distancesM: [...LIVING_LAND_DISTANCES_M], rays, own: own!, local }
}
