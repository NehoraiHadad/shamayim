import type { OutsideFrame } from '../data/city/outsideView'
import { azimuthAt } from '../domain/camera'
import { beyondKm } from './beyondSeat'
import { SCENE_W } from './sceneBox'
import type { Plane, WorldState } from './types'

/** Recover a raster item's km offset when its skyline descriptor has only screen x and normalised row. */
export function outsideItemKm(frame: OutsideFrame, baseKm: number,
  item: { x: number; near: number; dx?: number; dy?: number }) {
  const dy = item.dy ?? frame.s + item.near * (frame.n - frame.s)
  const dx = item.dx ?? (frame.centerX - item.x) * (frame.eyeN - dy) / frame.f
  return beyondKm(frame, baseKm, dx, dy)
}

const ridgeCache = new WeakMap<object, Map<Plane, Plane>>()

/** Transport once per immutable world/ridge; every foot sample and screen width shares this distance geometry. */
export function outsideRidge(world: Pick<WorldState, 'place3' | 'terrain' | 'camera'>, ridge = world.terrain.near):
  Plane {
  if (world.place3.kind !== 'outside') return ridge
  let cached = ridgeCache.get(world)
  if (!cached) ridgeCache.set(world, cached = new Map())
  const found = cached.get(ridge)
  if (found) return found
  const { frame, baseKm } = world.place3
  const transport = (distances: readonly number[]) => ridge.points.map(([x], i) => {
    const azimuth = azimuthAt(x / SCENE_W, world.camera) * Math.PI / 180
    const km = distances[i]
    return beyondKm(frame, baseKm, km * Math.sin(azimuth), km * Math.cos(azimuth))
  })
  const result = { ...ridge, distanceKm: transport(ridge.distanceKm), ...(ridge.hazeKm ? { hazeKm:
    transport(ridge.hazeKm) } : {}) }
  cached.set(ridge, result)
  return result
}
