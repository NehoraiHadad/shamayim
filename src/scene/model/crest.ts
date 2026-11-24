import type { WorldState } from '../../world/types'
import type { SkyGeom } from './skyGeom'
import type { SceneBox } from './types'

/** One crest per world and box (the night sky, the optics, the meteors and the life all ask for it). */
const CRESTS = new WeakMap<WorldState, { key: string; at: (x: number) => number }>()

/**
 * Where the land's top stands at a sky x (sky px): the ridges, and the place's own ground where it rises over them, laid
 * down once in whole px columns (the land's polylines rasterised), so a look-up is an array read.
 */
export function crestOf(world: WorldState, box: SceneBox, geom: SkyGeom): (x: number) => number {
  const key = `${box.width}:${box.landTop}:${geom.width}:${geom.left}`
  const hit = CRESTS.get(world)
  if (hit?.key === key) return hit.at
  const ridges = [world.terrain.near.points, world.terrain.far.points, ...(world.terrain.back ? [world.terrain.back.points] : [])]
    .filter((p) => p.length > 1)
  const own = world.place3.kind === 'outside' && world.place3.land?.top.length ? [world.place3.land.top] : []
  const cols = new Float32Array(Math.ceil(geom.width) + 2).fill(Infinity)
  for (const line of [...ridges, ...own]) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, ay] = line[i], [bx, by] = line[i + 1]
      const x0 = geom.left + Math.min(ax, bx) * geom.s, x1 = geom.left + Math.max(ax, bx) * geom.s
      for (let c = Math.max(0, Math.floor(x0)); c <= Math.min(cols.length - 1, Math.ceil(x1)); c++) {
        const t = x1 > x0 ? Math.min(1, Math.max(0, (c - x0) / (x1 - x0))) : 0
        const y = box.landTop + (ax <= bx ? ay + (by - ay) * t : by + (ay - by) * t)
        if (y < cols[c]) cols[c] = y
      }
    }
  }
  // Columns past the land's ends take its end's height; with no land at all, eye level.
  const eye = box.landTop + world.relief.horizonY
  let first = cols.findIndex(Number.isFinite)
  if (first < 0) { cols.fill(eye); first = 0 }
  for (let c = 0; c < first; c++) cols[c] = cols[first]
  for (let c = 1; c < cols.length; c++) if (!Number.isFinite(cols[c])) cols[c] = cols[c - 1]
  const at = (x: number) => cols[Math.max(0, Math.min(cols.length - 1, Math.round(x)))]
  CRESTS.set(world, { key, at })
  return at
}

/**
 * How far (whole px) below eye level the sky is seen over the land, 0 where the land stands up to it all along: from a height
 * the sea's and the far land's own horizon lies under eye level. What is in the sky at eye level goes on down to there.
 */
export function skyBelowEye(world: WorldState, box: SceneBox, geom: SkyGeom): number {
  if (world.terrain.status !== 'ready') return 0
  const crest = crestOf(world, box, geom)
  let lowest = geom.horizon
  for (let x = 0; x <= geom.width; x++) lowest = Math.max(lowest, crest(x))
  return Math.max(0, Math.ceil(Math.min(lowest, box.skyHeight) - geom.horizon - HAIR))
}
/** A dip nobody sees (px). */
const HAIR = 0.25
