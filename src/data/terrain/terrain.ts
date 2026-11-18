import { useEffect, useMemo, useState } from 'react'
import type { Place } from '../../config/place'
import { anglePx } from './angleScale'
import { fetchDem } from './dem'
import {
  apparentAngle, computePanorama, destination, packPanorama, unpackPanorama, type HorizonPoint, type Panorama,
  type StoredPanorama,
} from './panorama'
import { gentleHillsPath, pointsToPath, ridgePoints } from './profile'

type Pt = [number, number]

export interface SceneTerrain {
  near: string
  far: string
  centerLeft: string
  centerY: number
  seaY: number
  seaInView: boolean
  seaSide: 'west' | 'east' | null
  nearPoints: Pt[]
  farPoints: Pt[]
  /** Height (m) of the ridge crest at each of the points' x, evenly across the scene (sampled terrain only). */
  nearElevations?: number[]
  farElevations?: number[]
  /**
   * y of eye level (0°) when the land is the horizon panorama, drawn on the sky's own vertical scale: the sun and moon
   * stand on this line, so they hide behind the land exactly when the real land hides them. Absent for the stand-in
   * drawings (loading, offline), where a body stands on the drawn ridge instead.
   */
  horizonY?: number
  /** Where snow above `lineM` reaches down to on each layer, as points west to east (panorama only). */
  snowEdge?: (layer: 'near' | 'far', lineM: number) => Pt[]
  /**
   * What the land is like in the direction at scene x (panorama only): how far the near ridge and the far horizon are
   * (km), and whether the far horizon shows above the near ridge there. Landmarks use it to stand on the ridge in their
   * own direction, or to be left out when the land in front hides them.
   */
  sightAt?: (x: number) => { nearKm: number; farKm: number; farShows: boolean }
  /** The hand-drawn valley (its village sits on the drawn floor, its snow line is scaled from the place's depth). */
  drawn?: boolean
}

const SHADMOT_FAR = 'M0 128V38C34 28 70 32 104 48S160 80 190 86S236 76 262 52S326 16 375 20V128Z'
const SHADMOT_NEAR = 'M0 128V50C30 44 60 48 90 62S134 90 150 96L200 97Q212 103 222 98L236 96C256 82 272 58 296 44S348 30 375 32V128Z'
const GENERIC_FAR = 'M0 128V54C52 32 102 44 148 62S236 76 284 48S344 38 375 50V128Z'

/** The hand-drawn Jordan Valley at Shadmot Mehola: shown until its panorama has loaded (and if it never can). */
const SHADMOT: SceneTerrain = {
  far: SHADMOT_FAR,
  near: SHADMOT_NEAR,
  centerLeft: '47.5%',
  centerY: 96,
  seaY: 72,
  seaInView: false,
  seaSide: null,
  // Sampled from the drawn paths, so marks stand on the line you see (a few hand-picked corners missed the curves).
  nearPoints: ridgePoints(SHADMOT_NEAR),
  farPoints: ridgePoints(SHADMOT_FAR),
  drawn: true,
}

export const GENERIC_TERRAIN: SceneTerrain = {
  far: GENERIC_FAR,
  near: gentleHillsPath(),
  centerLeft: '50%',
  centerY: 74,
  seaY: 72,
  seaInView: false,
  seaSide: null,
  nearPoints: ridgePoints(gentleHillsPath()),
  farPoints: ridgePoints(GENERIC_FAR),
}

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
export function terrainFromPanorama(p: Panorama): SceneTerrain {
  const n = p.rays.length
  const xOf = (i: number) => (375 * i) / (n - 1)
  const mid = p.rays[Math.floor(n / 2)]
  const lowestNear = Math.min(...p.rays.map((ray) => ray.near.angle))
  const horizonY = Math.min(MIDDLE_Y + anglePx(mid.near.angle), LOWEST_Y + anglePx(lowestNear))
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
  const sightAt = (x: number) => {
    const i = Math.min(n - 1, Math.max(0, Math.round((x / 375) * (n - 1))))
    const ray = p.rays[i]
    return { nearKm: ray.near.distance, farKm: ray.far.distance, farShows: farAngles[i] > nearAngles[i] + 0.15 }
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
  }
}

function horizonKey(placeId: string): string {
  return `shamayim:horizon:v2:${placeId}`
}

export function readPanorama(placeId: string): Panorama | null {
  try {
    return unpackPanorama(JSON.parse(localStorage.getItem(horizonKey(placeId)) ?? 'null') as StoredPanorama | null)
  } catch {
    return null
  }
}

function writePanorama(placeId: string, panorama: Panorama): void {
  try {
    localStorage.setItem(horizonKey(placeId), JSON.stringify(packPanorama(panorama)))
    // The old west–east cross-section is no longer read.
    localStorage.removeItem(`shamayim:terrain:v1:${placeId}`)
  } catch {
    // The panorama gracefully remains memory-only when storage is unavailable.
  }
}

export function terrainForPlace(placeId: string, panorama: Panorama | null): SceneTerrain {
  if (panorama) return terrainFromPanorama(panorama)
  return placeId === 'shadmot-mehola' ? SHADMOT : GENERIC_TERRAIN
}

/**
 * The tiles carry the sea floor (the Mediterranean is −20 m a kilometre off Tel Aviv); what you see is its surface, so
 * land below 0 m is raised to it, except in the Jordan rift (Kinneret, Jordan Valley, Dead Sea, Arava), whose ground
 * and lakes really lie below sea level.
 */
export function inRift(lat: number, lon: number): boolean {
  return lat > 29.4 && lat < 33.4 && lon > 35.15 && lon < 35.85
}

/** Within this distance (km) the DEM is read at zoom 10 (~130 m a pixel); beyond, at zoom 8 (~520 m), for far ridges. */
const NEAR_DEM_KM = 12

/**
 * Builds a place's horizon panorama from the DEM tiles around it: 1–4 tiles at zoom 10 for the near land and 2–4 at
 * zoom 8 for the far horizon (~0.3–0.6 MB once per place; the result is kept for good, so it is never fetched again).
 */
export async function fetchPanorama(place: Pick<Place, 'lat' | 'lon'>, signal?: AbortSignal): Promise<Panorama> {
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
  return computePanorama(heightAt, Number.isFinite(ground) ? ground : 0)
}

export function useTerrain(place: Place): SceneTerrain {
  const [loaded, setLoaded] = useState<{ placeId: string; panorama: Panorama | null }>(() => ({
    placeId: place.id,
    panorama: readPanorama(place.id),
  }))
  const panorama = loaded.placeId === place.id ? loaded.panorama : readPanorama(place.id)
  useEffect(() => {
    if (readPanorama(place.id)) return
    const controller = new AbortController()
    fetchPanorama(place, controller.signal).then((next) => {
      writePanorama(place.id, next)
      setLoaded({ placeId: place.id, panorama: next })
    }).catch(() => undefined)
    return () => controller.abort()
  }, [place])
  return useMemo(() => terrainForPlace(place.id, panorama), [place.id, panorama])
}
