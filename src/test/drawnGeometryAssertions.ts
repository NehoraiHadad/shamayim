import { expect } from 'vitest'
import { anglePx } from '../data/terrain/angleScale'
import { baseAngle } from '../data/terrain/apparentHeight'
import { azimuthAt, SCENE_CAMERA, xOf } from '../domain/camera'
import type { SceneTerrain } from '../data/terrain/terrain'
import { groundAt } from '../world/sceneLight'
import type { GlyphDesc } from '../scene/model/types'
import { SCENE_W } from '../world/sceneBox'
import type { Plane, WorldState } from '../world/types'

/** The actual painted ridge polyline; shared by independent base and height checks. */
export function drawnRidgeLine(world: WorldState, kind: 'near' | 'land' | undefined) {
  return kind === 'land' ? (world.place3.kind === 'outside' ? world.place3.land?.top : undefined)
    : world.terrain.near.points
}

/** Sub-micro CSS px tolerance resolves multiplication and the inverse relief projection. */
export const HEIGHT_TOLERANCE_PX = 1e-6

export function visibleOverRidge(terrain: SceneTerrain, dx: number, dy: number, heightM: number) {
  const camera = terrain.camera ?? SCENE_CAMERA
  const x = xOf(Math.atan2(dx, dy) * 180 / Math.PI, camera) * SCENE_W / camera.width
  const km = Math.hypot(dx, dy)
  if (km <= (terrain.sightAt?.(x).nearKm ?? 0)) return Infinity
  const seen = terrain.seenAt?.(x, km, heightM)
  return seen ? Math.max(0, Math.min(seen.groundY, groundAt(terrain.nearPoints, x)) - seen.y) : 0
}

export function projectedHeight(heightM: number, km: number, base: number, horizon: number) {
  const a0 = baseAngle(base, horizon)
  const rise = Math.atan(heightM / (km * 1000)) * 180 / Math.PI
  return anglePx(a0 + rise) - anglePx(a0)
}

/** Depth/haze measured from the outside eye and anchored at the place's near edge. */
export function outsideDepth(world: WorldState, dx: number, dy: number) {
  if (world.place3.kind !== 'outside') throw new Error('Missing outside frame')
  const { frame, baseKm } = world.place3
  return Math.max(baseKm + Math.max(0, Math.hypot(dx, frame.eyeN - dy) - frame.backKm),
    baseKm + Math.max(0, frame.n - dy))
}

export function assertRidges(world: WorldState, glyph: GlyphDesc, sx: number, depth: number, outside: boolean,
  seated: boolean, hint: string, skipRidge?: 'near' | 'land') {
  const land = world.place3.kind === 'outside' && world.place3.land
  const ridge = world.terrain.near
  const distances = outside ? ridge.points.map(([x], i) => {
    const angle = azimuthAt(x / SCENE_W, world.camera) * Math.PI / 180
    return outsideDepth(world, ridge.distanceKm[i] * Math.sin(angle), ridge.distanceKm[i] * Math.cos(angle))
  }) : ridge.distanceKm
  const ridges: Pick<Plane, 'points' | 'distanceKm'>[] = [{ points: ridge.points, distanceKm: distances }]
  if (land) ridges.push({ points: land.top, distanceKm: land.top.map(() => outside ? land.km : 0) })
  // Town feet close the raster/terrain seam with the existing one-scene-pixel overlap.
  const foot = glyph.base - (seated ? 1 : 0)
  for (const [index, ridge] of ridges.entries()) {
    if (skipRidge === (index === 0 ? 'near' : 'land')) continue
    for (let i = 1; i < ridge.points.length; i++) {
      const [x0, y0] = ridge.points[i - 1], [x1, y1] = ridge.points[i]
      const d0 = ridge.distanceKm[i - 1], d1 = ridge.distanceKm[i]
      const left = Math.max(glyph.x - glyph.w / 2, x0 * sx), right = Math.min(glyph.x + glyph.w / 2, x1 * sx)
      if (left >= right) continue
      const ts = [(left / sx - x0) / (x1 - x0), (right / sx - x0) / (x1 - x0)]
      if (d0 !== d1) {
        const edge = (depth - d0) / (d1 - d0)
        if (edge > ts[0] && edge < ts[1]) ts.push(edge + Math.sign(d0 - d1) * Number.EPSILON)
      }
      expect(ts.some(t => d0 + (d1 - d0) * t < depth && y0 + (y1 - y0) * t < foot - HEIGHT_TOLERANCE_PX),
        hint).toBe(false)
    }
  }
}
