import { useEffect, useMemo, useState } from 'react'
import type { Place } from '../../config/place'
import { gentleHillsPath, profilePoints, profileToPath, profileY, sampleY, type TerrainSample } from './profile'

export interface TerrainData {
  near: TerrainSample[]
  far: TerrainSample[]
}

export interface SceneTerrain {
  near: string
  far: string
  centerLeft: string
  centerY: number
  seaY: number
  seaInView: boolean
  seaSide: 'west' | 'east' | null
  nearPoints: [number, number][]
  farPoints: [number, number][]
  nearElevations?: number[]
  farElevations?: number[]
}

const SHADMOT: SceneTerrain = {
  far: 'M0 128V38C34 28 70 32 104 48S160 80 190 86S236 76 262 52S326 16 375 20V128Z',
  near: 'M0 128V50C30 44 60 48 90 62S134 90 150 96L200 97Q212 103 222 98L236 96C256 82 272 58 296 44S348 30 375 32V128Z',
  centerLeft: '47.5%',
  centerY: 96,
  seaY: 72,
  seaInView: false,
  seaSide: null,
  nearPoints: [[0, 50], [150, 96], [200, 96], [236, 96], [296, 44], [375, 32]],
  farPoints: [[0, 38], [104, 48], [190, 86], [262, 52], [375, 20]],
}

export const GENERIC_TERRAIN: SceneTerrain = {
  far: 'M0 128V54C52 32 102 44 148 62S236 76 284 48S344 38 375 50V128Z',
  near: gentleHillsPath(),
  centerLeft: '50%',
  centerY: 74,
  seaY: 72,
  seaInView: false,
  seaSide: null,
  nearPoints: [[0, 72], [136, 70], [220, 88], [375, 66]],
  farPoints: [[0, 54], [148, 62], [236, 76], [375, 50]],
}

function terrainKey(placeId: string): string {
  return `shamayim:terrain:v1:${placeId}`
}

export function readTerrain(placeId: string): TerrainData | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(terrainKey(placeId)) ?? 'null') as TerrainData | null
    return parsed && Array.isArray(parsed.near) && Array.isArray(parsed.far) ? parsed : null
  } catch {
    return null
  }
}

function writeTerrain(placeId: string, data: TerrainData): void {
  try {
    localStorage.setItem(terrainKey(placeId), JSON.stringify(data))
  } catch {
    // Terrain gracefully remains memory-only when storage is unavailable.
  }
}

/** Water rule: two adjacent ~0 m samples at either profile edge count as visible sea. */
function seaAtEdge(samples: readonly TerrainSample[]): 'west' | 'east' | null {
  const water = (sample: TerrainSample) => Math.abs(sample.elevation) <= 1
  const hasWater = (edge: readonly TerrainSample[]) => edge.some((sample, index) =>
    index > 0 && water(sample) && water(edge[index - 1]))
  if (hasWater(samples.slice(0, 3))) return 'west'
  if (hasWater(samples.slice(-3))) return 'east'
  return null
}

export function terrainForPlace(placeId: string, data: TerrainData | null): SceneTerrain {
  if (placeId === 'shadmot-mehola') return SHADMOT
  if (!data) return GENERIC_TERRAIN
  const middle = Math.floor(data.near.length / 2)
  const seaSide = seaAtEdge(data.near) ?? seaAtEdge(data.far)
  return {
    near: profileToPath(data.near),
    far: profileToPath(data.far),
    centerLeft: '50%',
    centerY: sampleY(data.near, middle),
    seaY: profileY(data.near, 0),
    seaInView: seaSide !== null,
    seaSide,
    nearPoints: profilePoints(data.near),
    farPoints: profilePoints(data.far),
    nearElevations: data.near.map((sample) => sample.elevation),
    farElevations: data.far.map((sample) => sample.elevation),
  }
}

function points(place: Place, radiusKm: number): { latitudes: string; longitudes: string } {
  const longitudeKm = 111.32 * Math.max(0.1, Math.cos(place.lat * Math.PI / 180))
  const delta = radiusKm / longitudeKm
  const longitudes = Array.from({ length: 41 }, (_, index) => place.lon - delta + 2 * delta * index / 40)
  return { latitudes: Array(41).fill(place.lat).join(','), longitudes: longitudes.join(',') }
}

async function fetchLine(place: Place, radiusKm: number, signal: AbortSignal): Promise<TerrainSample[]> {
  const { latitudes, longitudes } = points(place, radiusKm)
  const query = new URLSearchParams({ latitude: latitudes, longitude: longitudes })
  const response = await fetch(`https://api.open-meteo.com/v1/elevation?${query}`, { signal })
  if (!response.ok) throw new Error(`Elevation HTTP ${response.status}`)
  const body = await response.json() as { elevation?: unknown }
  if (!Array.isArray(body.elevation) || body.elevation.length !== 41) throw new Error('Invalid elevation profile')
  return body.elevation.map((value) => ({ elevation: typeof value === 'number' ? value : 0 }))
}

async function fetchTerrain(place: Place, signal: AbortSignal): Promise<TerrainData> {
  const [near, far] = await Promise.all([fetchLine(place, 12, signal), fetchLine(place, 30, signal)])
  return { near, far }
}

export function useTerrain(place: Place): SceneTerrain {
  const [loaded, setLoaded] = useState<{ placeId: string; data: TerrainData | null }>(() => ({
    placeId: place.id,
    data: readTerrain(place.id),
  }))
  const data = loaded.placeId === place.id ? loaded.data : readTerrain(place.id)
  useEffect(() => {
    const cached = readTerrain(place.id)
    if (place.id === 'shadmot-mehola' || cached) return
    const controller = new AbortController()
    fetchTerrain(place, controller.signal).then((next) => {
      writeTerrain(place.id, next)
      setLoaded({ placeId: place.id, data: next })
    }).catch(() => undefined)
    return () => controller.abort()
  }, [place])
  return useMemo(() => terrainForPlace(place.id, data), [place.id, data])
}
