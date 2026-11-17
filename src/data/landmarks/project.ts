import type { MarkKind, TerrainSample } from './types'

export interface Coordinate { lat: number; lon: number }

export function offsetKm(place: Coordinate, mark: Coordinate) {
  const dx = (mark.lon - place.lon) * 111.32 * Math.cos(mark.lat * Math.PI / 180)
  const dy = (mark.lat - place.lat) * 111.32
  return { dx, dy }
}

export function toX(dx: number): { x: number; layer: 'near' | 'far' } | null {
  const distance = Math.abs(dx)
  if (distance > 30) return null
  return distance <= 12
    ? { x: 187.5 + 15.625 * dx, layer: 'near' }
    : { x: 187.5 + 6.25 * dx, layer: 'far' }
}

export function groundY(samples: TerrainSample[], x: number): number {
  if (!samples.length) return 128
  if (x <= samples[0].x) return samples[0].y
  const last = samples.at(-1)!
  if (x >= last.x) return last.y
  const rightIndex = samples.findIndex((sample) => sample.x >= x)
  const left = samples[rightIndex - 1]
  const right = samples[rightIndex]
  const t = (x - left.x) / (right.x - left.x)
  return left.y + (right.y - left.y) * t
}

export function groundElevation(samples: TerrainSample[], x: number): number | undefined {
  if (!samples.length || samples.some((sample) => sample.elevation == null)) return undefined
  if (x <= samples[0].x) return samples[0].elevation
  const last = samples.at(-1)!
  if (x >= last.x) return last.elevation
  const i = samples.findIndex((sample) => sample.x >= x)
  const a = samples[i - 1]
  const b = samples[i]
  const t = (x - a.x) / (b.x - a.x)
  return a.elevation! + (b.elevation! - a.elevation!) * t
}

export function markHeight(heightM: number, layer: 'near' | 'far' = 'near'): number {
  const near = Math.round(Math.max(10, Math.min(34, 8 + 26 * Math.sqrt(heightM / 240))))
  return layer === 'far' ? Math.max(8, Math.round(near * 0.6)) : near
}

export function markWidth(kind: MarkKind, glyph: string | undefined, height: number): number {
  const broadKind = ['bridge', 'homes', 'palms', 'orchard', 'solar', 'cooling', 'silo', 'castle'].includes(kind)
  const broadGlyph = /azrieli|cooling|bridge|wall|dagon|bab/.test(glyph ?? '')
  return broadKind || broadGlyph ? Math.max(12, height * .95) : Math.max(7, height * .65)
}
