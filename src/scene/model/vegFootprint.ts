import type { FaceColumn, FacePoint } from '../../world/face'
import type { LivingLand } from '../../world/landLiving'
import { SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { Plane, WorldState } from '../../world/types'
import { crestKmAt, FACE_EPSILON, faceColumnAt, faceColumnStep, fallbackFaceKm, measuredFaceAt } from './faceProjection'

export type Footprint = readonly [left: number, top: number, right: number, bottom: number]
export type CoverCheck = (cover: number | null) => boolean
export type AreaLimit = (area: Footprint, loKm: number, hiKm: number) => boolean

interface Strip {
  crestLo: number; crestHi: number; footLo: number; footHi: number
  kmLo: number; kmHi: number; points: readonly FacePoint[]
  cover: CoverRun
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

/** Bounds a rectangle's radial distance on one strip, including profile and interpolation discontinuities. */
function distanceRange(s: Strip, name: 'near' | 'far', top: number, bottom: number): [number, number] {
  if (!s.points.length) {
    if (bottom <= s.crestLo + FACE_EPSILON) return [s.kmLo, s.kmHi]
    const fraction = (y: number, crest: number, foot: number) => Math.max(0, Math.min(1, (y - crest) / Math.max(1, foot - crest)))
    const lo = fallbackFaceKm(name, s.kmLo, fraction(bottom, s.crestLo, s.footLo))
    const hi = fallbackFaceKm(name, s.kmHi, fraction(top, s.crestHi, s.footHi))
    return top <= s.crestHi + FACE_EPSILON ? [Math.min(lo, s.kmLo), Math.max(hi, s.kmHi)] : [lo, hi]
  }
  const { crestLo, crestHi, kmLo, kmHi, points } = s
  const crests = [crestLo, crestHi]
  for (const y of [top, bottom, ...points.map((p) => p.y)]) {
    const skip = y - FACE_EPSILON
    if (skip >= crestLo && skip <= crestHi) crests.push(skip, Math.max(crestLo, skip - 1e-9))
  }
  let min = Infinity, max = -Infinity
  for (const crest of crests) {
    // For fixed crest, depth is linear between DEM knots. Within each crest branch the first segment's
    // interpolation is monotone in crest y and crest distance, which are bounded independently above.
    min = Math.min(min, measuredFaceAt(points, kmLo, crest, top).km, measuredFaceAt(points, kmLo, crest, bottom).km)
    max = Math.max(max, measuredFaceAt(points, kmHi, crest, top).km, measuredFaceAt(points, kmHi, crest, bottom).km)
    if (top <= crest + FACE_EPSILON && bottom > crest + FACE_EPSILON) {
      min = Math.min(min, kmLo)
      max = Math.max(max, kmHi)
    }
  }
  for (const p of points) if (p.y >= top && p.y <= bottom && p.y > crestLo + FACE_EPSILON) {
    min = Math.min(min, p.km)
    max = Math.max(max, p.km)
  }
  return [min, max]
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
    const crestLo = Math.min(cy0, cy1)
    return { right, left, points: faceColumnAt(columns, mid)?.points ?? [], crestLo, crestHi: Math.max(cy0, cy1),
      // Far foot = min(sheet, max(near crest + 3, far crest)). The unclamped lines can cross within a strip.
      footLo: front.length < 2 ? Math.min(fy0, fy1)
        : Math.min(fy0, fy1, Math.max(crestLo, Math.min(lineAt(front, left), lineAt(front, right)) + 3)),
      footHi: Math.max(fy0, fy1), kmLo: Math.min(k0, k1), kmHi: Math.max(k0, k1),
      cover: coverRuns[Math.round(mid / SCENE_W * Math.max(0, rays - 1))] }
  })
  return (box: Footprint, accepts: CoverCheck, limits?: AreaLimit) => {
    const [x0, top, x1, bottom] = box
    let low = 0, high = strips.length
    while (low < high) {
      const mid = (low + high) >> 1
      if (strips[mid].right < x0) low = mid + 1
      else high = mid
    }
    for (let i = low; i < strips.length && strips[i].left <= x1; i++) {
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
}
