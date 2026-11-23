//# allFunctionsCalledOnLoad
import type { FaceColumn } from '../../world/face'
import type { LivingLand } from '../../world/landLiving'
import { SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { Plane, WorldState } from '../../world/types'
import { crestKmAt, faceColumnAt, faceColumnStep } from './faceProjection'
import { distanceRange, profileBounds, type Depth } from './vegFootprintDepth'

export type Footprint = readonly [left: number, top: number, right: number, bottom: number]
export type CoverCheck = (cover: number | null) => boolean
export type AreaLimit = ((area: Footprint, loKm: number, hiKm: number) => boolean) & {
  allowsEdges?: (left: number, right: number) => boolean
}

interface CoverRun {
  uniform?: number | null
  covers: (loKm: number, hiKm: number, accepts: CoverCheck) => boolean
}

function coverRun(land: LivingLand, ray: number): CoverRun {
  const bands = land.rays[ray]?.bands ?? []
  const first = bands.length ? bands[0].sample.cover : land.own.cover
  // Nearest on the shared log-distance scale: a band's boundary is the geometric mean.
  const cuts = bands.slice(1).map((b, i) => Math.sqrt(bands[i].distanceM * b.distanceM) / 1000)
  return { uniform: bands.every((b) => b.sample.cover === first) ? first : undefined, covers: (lo, hi, accepts) => {
    for (let i = 0; i < bands.length; i++) {
      if (i < cuts.length && cuts[i] < lo) continue
      if (!accepts(bands[i].sample.cover)) return false
      if (i < cuts.length && cuts[i] > hi) break
    }
    return true
  } }
}

function columnCuts(columns: readonly FaceColumn[]) {
  return columns.slice(1).map((_, i) => columns[0].x + (i + 0.5) * faceColumnStep(columns))
}

/** Test every projected ray/band that a painted envelope can touch. Bounds are conservative on slanted faces. */
export function projectedFootprints(
  world: WorldState, name: 'near' | 'far', plane: Plane, crestAt: (x: number) => number, footAt: (x: number) => number,
) {
  const columns = world.terrain.faces[name]?.columns ?? []
  const rays = world.land.rays.length
  const rayCuts = Array.from({ length: Math.max(0, rays - 1) }, (_, i) => (i + 0.5) * SCENE_W / (rays - 1))
  const front = name === 'far' ? world.terrain.near.points : []
  const edges = [...new Set([0, SCENE_W, ...columnCuts(columns), ...rayCuts,
    ...plane.points.map(([x]) => x), ...front.map(([x]) => x)])].filter((x) => x >= 0 && x <= SCENE_W).sort((a, b) => a - b)
  const coverRuns = Array.from({ length: Math.max(1, rays) }, (_, i) => coverRun(world.land, i))
  const strips = edges.slice(1).map((right, i) => {
    const left = edges[i], mid = (left + right) / 2
    const cy0 = crestAt(left), cy1 = crestAt(right), fy0 = footAt(left), fy1 = footAt(right)
    const k0 = crestKmAt(plane, left), k1 = crestKmAt(plane, right)
    const crestLo = Math.min(cy0, cy1), crestHi = Math.max(cy0, cy1)
    const points = faceColumnAt(columns, mid)?.points ?? []
    return { right, left, points, crestLo, crestHi, ...profileBounds(points, crestLo, crestHi),
      // Far foot = min(sheet, max(near crest + 3, far crest)). The unclamped lines can cross within a strip.
      footLo: front.length < 2 ? Math.min(fy0, fy1)
        : Math.min(fy0, fy1, Math.max(crestLo, Math.min(lineAt(front, left), lineAt(front, right)) + 3)),
      footHi: Math.max(fy0, fy1), kmLo: Math.min(k0, k1), kmHi: Math.max(k0, k1),
      cover: coverRuns[Math.round(mid / SCENE_W * Math.max(0, rays - 1))] }
  })
  function firstStrip(x: number) {
    let low = 0, high = strips.length
    while (low < high) {
      const mid = (low + high) >> 1
      if (strips[mid].right < x) low = mid + 1
      else high = mid
    }
    return low
  }
  function fits(box: Footprint, accepts: CoverCheck, limits?: AreaLimit) {
    const [x0, top, x1, bottom] = box
    if (limits?.allowsEdges && x0 <= SCENE_W && x1 >= 0 && !limits.allowsEdges(Math.max(x0, 0), Math.min(x1, SCENE_W))) return false
    for (let i = firstStrip(x0); i < strips.length && strips[i].left <= x1; i++) {
      const strip = strips[i], { uniform, covers } = strip.cover
      if (uniform !== undefined && !accepts(uniform)) return false
      if (uniform !== undefined && !limits) continue
      const [lo, hi] = distanceRange(strip, name, top, bottom)
      if (uniform === undefined && !covers(lo, hi, accepts)) return false
      // Use this strip's angular slice with its own depth range, including both sides of a DEM seam.
      if (limits && !limits([Math.max(x0, strip.left), top, Math.min(x1, strip.right), bottom], lo, hi)) return false
    }
    return true
  }
  /** The probe can move down to clear the local crest. Include that y at every DEM seam. */
  function cropDepth([left, top, right, bottom]: Footprint, crestClearance: number): Depth {
    let lo = Infinity, hi = -Infinity
    for (let i = firstStrip(left); i < strips.length && strips[i].left <= right; i++) {
      const strip = strips[i]
      const [a, b] = distanceRange(strip, name, top, Math.max(bottom, strip.crestHi + crestClearance))
      lo = Math.min(lo, a)
      hi = Math.max(hi, b)
    }
    return [lo, hi]
  }
  return { fits, cropDepth }
}
