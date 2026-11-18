import { groundFn } from '../landmarks/seat'
import { AZ_LEFT, AZ_RIGHT, azimuthAt, FAR_KM, RAY_DISTANCES } from '../terrain/panorama'
import { RIDGE_WIDTH } from '../terrain/ridgeProjection'
import type { SceneTerrain } from '../terrain/terrain'
import { COLUMN_WIDTH } from './columns'
import { FAR_COLS, FAR_LAT_STEP, FAR_LON_STEP, FAR_ROWS, FAR_SOUTH, FAR_WEST } from './farGrid'
import { bearingOf, type Coordinate } from '../landmarks/project'
import { cellSpans, type RayGrid } from './rayWalk'

export interface PlainPatch {
  left: number
  right: number
  top: number
  bottom: number
  km: number
  built: number
  area: number
}

export type PlainTerrain = Pick<SceneTerrain, 'seenAt' | 'nearPoints' | 'farPoints'>
const SCENE_RADIANS = (AZ_LEFT - AZ_RIGHT) * Math.PI / 180
const SHEET_TOP = 114
const FAR_GRID: RayGrid = {
  toGrid: (lat, lon) => [(lon - FAR_WEST) / FAR_LON_STEP, (lat - FAR_SOUTH) / FAR_LAT_STEP],
  bounds: [FAR_COLS, FAR_ROWS],
}

export function plainPatches(place: Coordinate, width: number, grid: Uint8Array,
  { seenAt, nearPoints, farPoints }: PlainTerrain, fromKm = RAY_DISTANCES[0]): PlainPatch[] {
  if (!seenAt || !(width > 0) || !Number.isFinite(width)) return []
  const patches: PlainPatch[] = []
  const nearY = groundFn(nearPoints, width), farY = groundFn(farPoints, width)
  const ridgeXs = [...nearPoints, ...farPoints].map(([x]) => x * width / RIDGE_WIDTH)
  const angularBounds = new Map<number, [number, number]>()
  for (let left = 0; left < width; left += COLUMN_WIDTH) {
    const right = Math.min(left + COLUMN_WIDTH, width)
    const fraction = (left + right) / (2 * width)
    const x = fraction * RIDGE_WIDTH
    const edges = [left, ...ridgeXs.filter(px => px > left && px < right), right]
    const ceiling = Math.max(...edges.map(farY))
    const floor = Math.min(SHEET_TOP, ...edges.map(nearY))
    if (floor <= ceiling) continue
    let run: { index: number; start: number; end: number; top: number; bottom: number } | undefined
    const flush = () => {
      if (!run) return
      let bounds = angularBounds.get(run.index)
      if (!bounds) {
        const row = Math.floor(run.index / FAR_COLS), col = run.index % FAR_COLS
        const xs = [row, row + 1].flatMap(r => [col, col + 1].map(c => {
          const corner = bearingOf(place, { lat: FAR_SOUTH + r * FAR_LAT_STEP, lon: FAR_WEST + c * FAR_LON_STEP })
          return corner ? corner.x * width / RIDGE_WIDTH : fraction < .5 ? 0 : width
        }))
        bounds = [Math.min(...xs), Math.max(...xs)]
        angularBounds.set(run.index, bounds)
      }
      const a = Math.max(left, bounds[0]), b = Math.min(right, bounds[1])
      const y = (run.top + run.bottom) / 2
      const half = Math.min(1.5, Math.max(.5, (run.bottom - run.top) / 2))
      const top = Math.max(ceiling, y - half), bottom = Math.min(floor, y + half)
      const km = (run.start + run.end) / 2
      if (bottom > top && b > a) {
        // Column wedges get wider with distance. Intersect with the cell's angular footprint and cap its area.
        const radians = (b - a) / width * SCENE_RADIANS
        const latitude = FAR_SOUTH + (Math.floor(run.index / FAR_COLS) + .5) * FAR_LAT_STEP
        const cellArea = .5 * Math.cos(latitude * Math.PI / 180) / Math.cos(31.5 * Math.PI / 180)
        const area = Math.min(radians * km * (run.end - run.start), cellArea * (b - a) / (bounds[1] - bounds[0]))
        patches.push({ left: a, right: b, top, bottom, km, built: (grid[run.index] >> 4) / 15, area })
      }
      run = undefined
    }
    for (const span of cellSpans(place, azimuthAt(fraction), fromKm, FAR_KM, FAR_GRID)) {
      const index = span.row * FAR_COLS + span.col
      if (!(grid[index] >> 4)) continue
      // A cell can straddle a shadow. Resolve the seen portion within the cell, keeping its actual foreshortening.
      const count = Math.ceil((span.end - span.start) / .125)
      const step = (span.end - span.start) / count
      for (let i = 0; i < count; i++) {
        const start = span.start + i * step, end = start + step
        const point = seenAt(x, (start + end) / 2)
        if (!point || point.y < ceiling || point.y >= floor) continue
        if (!run || run.index !== index || start - run.end > 1e-8) {
          flush()
          run = { index, start, end, top: point.y, bottom: point.y }
        }
        const a = seenAt(x, start)?.y ?? point.y, b = seenAt(x, end)?.y ?? point.y
        run.end = end
        run.top = Math.min(run.top, a, b, point.y)
        run.bottom = Math.max(run.bottom, a, b, point.y)
      }
    }
    flush()
  }
  return patches
}
