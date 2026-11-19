import type { Coordinate } from '../landmarks/project'
import { fetchDem } from './dem'
import { computePanorama, destination, localGround, type HeightAt, type Panorama } from './panorama'

/**
 * The tiles carry the sea floor. Raise land below 0 m to the surface, except in the Jordan rift
 * (Kinneret, Jordan Valley, Dead Sea, Arava), whose ground and lakes really lie below sea level.
 */
export function inRift(lat: number, lon: number): boolean {
  return lat > 29.4 && lat < 33.4 && lon > 35.15 && lon < 35.85
}

/** Within 12 km the DEM is read at zoom 10 (~130 m a pixel); far ridges use zoom 8 (~520 m). */
const NEAR_DEM_KM = 12

/** Builds a place's panorama from 1–4 near DEM tiles and 2–4 far ones (~0.3–0.6 MB a place). */
export async function fetchPanorama(place: Coordinate, signal?: AbortSignal,
  compute: (heightAt: HeightAt, groundM: number) => Panorama = computePanorama): Promise<Panorama> {
  const [near, far] = await Promise.all([
    fetchDem(place.lat, place.lon, NEAR_DEM_KM + 0.5, 10, signal),
    fetchDem(place.lat, place.lon, 61, 8, signal),
  ])
  const heightAt = (distanceKm: number, azimuth: number) => {
    const point = destination(place.lat, place.lon, distanceKm, azimuth)
    const height = (distanceKm <= NEAR_DEM_KM ? near : far).height(point.lat, point.lon)
    return height < 0 && !inRift(point.lat, point.lon) ? 0 : height
  }
  const ground = near.height(place.lat, place.lon)
  const panorama = compute(heightAt, Number.isFinite(ground) ? ground : 0)
  // The ground round the place in every direction, for the place seen from outside (its rows climb the slope under them).
  return { ...panorama, local: localGround(place, (lat, lon) => {
    const height = near.height(lat, lon)
    return height < 0 && !inRift(lat, lon) ? 0 : height
  }) }
}
