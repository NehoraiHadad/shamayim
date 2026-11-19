import { waterGlints } from '../data/water/glint'
import type { SceneTerrain } from '../data/terrain/terrain'
import type { Camera } from '../domain/camera'
import type { LocalTime } from '../domain/types'
import type { Skyline } from './skyline'
import type { WaterState } from './types'
import { waterLight } from './waterLight'

/**
 * The water really in view (`data/water/`, at its true bearing and distance) and the light's path on it, under the sun
 * (or the moon by night), its strength by the wave slopes the one wind raises.
 */
export function waterOf(at: LocalTime, site: { lat: number; lon: number; timezone: string }, terrain: SceneTerrain,
  skyline: Skyline, cloudCover: number, camera: Camera, windMs: number): WaterState {
  const spans = terrain.water ?? []
  if (!spans.length) return { spans: [], glints: [], light: null, lit: false, byMoon: false, coastalSea: null }
  const { light, lit, moon } = waterLight(at, site, terrain, skyline, cloudCover)
  return { spans, glints: waterGlints(spans, light, lit, camera, windMs), light, lit, byMoon: moon, coastalSea: null }
}
