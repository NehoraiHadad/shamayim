import { EARTH_R_KM, RAY_DISTANCES, REFRACTION_K } from '../data/terrain/panorama'
import { groundAt as lineAt } from './sceneLight'
import type { Pt, TerrainPlanes } from './types'

/**
 * The face of a plane as the eye sees it, from the terrain data (the panorama's ground profiles, `terrain.groundAt`):
 * in each column (every `COLUMN` px of the reference width) the ground points that show between the crest and the
 * plane's foot, each with its distance, its height and how steeply the ground rises away from the eye there. The
 * gullies, terraces and scrub of the near ridge are placed on it by general rules (`scene/model/ground.ts`), never by
 * hand. Built once with the terrain's planes (`terrain.ts`), so a change of hour never redoes it.
 */
export const COLUMN = 3

/** Curvature with refraction (m per km²), as the panorama counts it (`relativeHeight`). */
const CURVATURE = 1000 * (1 - REFRACTION_K) / (2 * EARTH_R_KM)
const DEG = 180 / Math.PI

export interface FacePoint {
  y: number
  km: number
  /** Ground height relative to the eye (m). */
  h: number
  /** Rise of the ground away from the eye (m per m): + a face turned to the eye, − ground falling away. */
  slope: number
}

export interface FaceColumn {
  x: number
  /** The crest's y at x (the drawn ridge line). */
  crest: number
  /** The visible ground below the crest, top (far) to bottom (near). */
  points: FacePoint[]
}

export interface PlaneFace { columns: FaceColumn[]; contours: Contour[] }

type PlaneName = 'near' | 'far'
type Planes = Pick<TerrainPlanes, 'near' | 'far' | 'groundAt' | 'sightAt'>
/** Angle (deg) → y: the relief the land is drawn on. */
type AngleY = (angle: number) => number

/** The faces of the near and the far plane, with their contours. */
export function facesOf(terrain: Planes, y: AngleY): Record<PlaneName, PlaneFace> {
  return { near: buildFace(terrain, y, 'near'), far: buildFace(terrain, y, 'far') }
}

function buildFace(terrain: Planes, relief: AngleY, name: PlaneName): PlaneFace {
  const plane = terrain[name]
  const columns: FaceColumn[] = []
  if (plane.points.length < 2) return { columns, contours: [] }
  const x0 = plane.points[0][0], x1 = plane.points.at(-1)![0]
  for (let x = Math.ceil(x0); x <= x1; x += COLUMN) {
    const crest = lineAt(plane.points, x)
    columns.push({ x, crest, points: terrain.groundAt && terrain.sightAt ? visible(terrain, relief, name, x, crest) : [] })
  }
  return { columns, contours: contoursOf(columns) }
}

/** The ground that shows in one column: from the eye outward, each point that rises over all before it. */
function visible(terrain: Planes, relief: AngleY, name: PlaneName, x: number, crest: number): FacePoint[] {
  const sight = terrain.sightAt!(x)
  const nearCrest = lineAt(terrain.near.points, x)
  if (name === 'far' && !sight.farShows) return []
  const reach = name === 'near' ? sight.nearKm : sight.farKm
  const kms: number[] = [], hs: number[] = []
  for (const km of RAY_DISTANCES) {
    if (km > reach + 1e-6) break
    const h = terrain.groundAt!(x, km)
    if (h === null || !Number.isFinite(h)) continue
    kms.push(km)
    hs.push(h)
  }
  const out: FacePoint[] = []
  let top = Infinity
  for (let i = 0; i < kms.length; i++) {
    const km = kms[i], h = hs[i]
    const y = relief(Math.atan((h - CURVATURE * km * km) / (km * 1000)) * DEG)
    if (y >= top - 0.05) continue
    top = y
    // Only what shows: below its own crest, and for the far plane above the near ridge in front of it.
    if (y < crest || (name === 'far' && y > nearCrest - 0.5)) continue
    const a = Math.max(0, i - 1), b = Math.min(kms.length - 1, i + 1)
    const slope = b > a ? (hs[b] - hs[a]) / ((kms[b] - kms[a]) * 1000) : 0
    out.push({ y, km, h, slope })
  }
  return out.reverse()
}

/** A contour of the face: points of one height across neighbouring columns (scene px at the reference width). */
export interface Contour { h: number; points: Pt[]; slopes: number[]; kms: number[] }

/**
 * The face's contours at a height interval that gives about `levels` lines over its relief: in each column the y where
 * the visible ground crosses each height, joined to the nearest crossing of the same height in the next column.
 */
function contoursOf(columns: FaceColumn[], levels = 14): Contour[] {
  let lo = Infinity, hi = -Infinity
  for (const column of columns) for (const point of column.points) { lo = Math.min(lo, point.h); hi = Math.max(hi, point.h) }
  if (!(hi > lo)) return []
  const step = niceStep((hi - lo) / levels)
  const out: Contour[] = []
  for (let h = Math.ceil(lo / step) * step; h < hi; h += step) {
    let open: Contour[] = []
    let prevX = -Infinity
    for (const column of columns) {
      const crossings = crossingsAt(column, h)
      const next: Contour[] = []
      for (const c of crossings) {
        const joined = column.x - prevX <= COLUMN + 1e-6
          ? open.find((line) => Math.abs(line.points.at(-1)![1] - c.y) < 3.5 && !next.includes(line)) : undefined
        const line = joined ?? { h, points: [], slopes: [], kms: [] }
        line.points.push([column.x, c.y] as const)
        line.slopes.push(c.slope)
        line.kms.push(c.km)
        next.push(line)
        if (!joined) out.push(line)
      }
      open = next
      prevX = column.x
    }
  }
  return out.filter((line) => line.points.length >= 2)
}

function crossingsAt(column: FaceColumn, h: number) {
  const out: { y: number; slope: number; km: number }[] = []
  const pts = column.points
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]
    if ((a.h - h) * (b.h - h) > 0 || a.h === b.h) continue
    const t = (h - a.h) / (b.h - a.h)
    out.push({ y: a.y + (b.y - a.y) * t, slope: a.slope + (b.slope - a.slope) * t, km: a.km + (b.km - a.km) * t })
  }
  return out
}

function niceStep(raw: number) {
  const steps = [2, 5, 10, 20, 25, 50, 100, 200, 250, 500]
  return steps.find((s) => s >= raw) ?? 1000
}

/** The face's lowest visible y in a column (its foot), or the crest when nothing shows. */
export const footOf = (column: FaceColumn) => column.points.at(-1)?.y ?? column.crest
