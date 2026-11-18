import { groundFn } from '../landmarks/seat'
import { AZ_LEFT, AZ_RIGHT, azimuthAt, destination, FAR_KM, RAY_DISTANCES } from '../terrain/panorama'
import { RIDGE_WIDTH } from '../terrain/ridgeProjection'
import type { SceneTerrain } from '../terrain/terrain'
import { COLUMN_WIDTH } from './columns'
import { FAR_COLS, FAR_LAT_STEP, FAR_LON_STEP, FAR_ROWS, FAR_SOUTH, FAR_WEST } from './farGrid'
import { bearingOf, type Coordinate } from '../landmarks/project'

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
const gridX = (lon: number) => (lon - FAR_WEST) / FAR_LON_STEP
const gridY = (lat: number) => (lat - FAR_SOUTH) / FAR_LAT_STEP

function cutAtGridEdges(a: number, b: number, cuts: number[]) {
  for (let edge = Math.floor(Math.min(a, b)) + 1; edge < Math.max(a, b); edge++) {
    cuts.push((edge - a) / (b - a))
  }
}

/** The geodesic's chord over each kilometre is effectively straight at this raster's resolution. */
function* cellSpans(place: Coordinate, az: number, from: number, to: number) {
  const at = (km: number) => {
    const point = destination(place.lat, place.lon, km, az)
    return [gridX(point.lon), gridY(point.lat)]
  }
  let [a, b] = at(from)
  while (from < to) {
    const end = Math.min(from + 1, to)
    const [c, d] = at(end)
    const cuts = [0, 1]
    cutAtGridEdges(a, c, cuts)
    cutAtGridEdges(b, d, cuts)
    cuts.sort((x, y) => x - y)
    for (let i = 1; i < cuts.length; i++) {
      if (cuts[i] - cuts[i - 1] < 1e-9) continue
      const t = (cuts[i - 1] + cuts[i]) / 2
      const col = Math.floor(a + (c - a) * t), row = Math.floor(b + (d - b) * t)
      if (col < 0 || col >= FAR_COLS || row < 0 || row >= FAR_ROWS) continue
      yield { index: row * FAR_COLS + col, start: from + cuts[i - 1] * (end - from), end: from + cuts[i] * (end - from) }
    }
    from = end
    a = c
    b = d
  }
}

export function plainPatches(place: Coordinate, width: number, grid: Uint8Array,
  { seenAt, nearPoints, farPoints }: PlainTerrain): PlainPatch[] {
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
    for (const span of cellSpans(place, azimuthAt(fraction), RAY_DISTANCES[0], FAR_KM)) {
      if (!(grid[span.index] >> 4)) continue
      // A cell can straddle a shadow. Resolve the seen portion within the cell, keeping its actual foreshortening.
      const count = Math.ceil((span.end - span.start) / .125)
      const step = (span.end - span.start) / count
      for (let i = 0; i < count; i++) {
        const start = span.start + i * step, end = start + step
        const point = seenAt(x, (start + end) / 2)
        if (!point || point.y < ceiling || point.y >= floor) continue
        if (!run || run.index !== span.index || start - run.end > 1e-8) {
          flush()
          run = { index: span.index, start, end, top: point.y, bottom: point.y }
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
