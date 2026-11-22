import { altitudeOf, groundRangeAt } from '../../world/field/project'
import type { FieldLayer } from '../../world/field/types'
import type { SkyGeom } from './sky'

const RAD = Math.PI / 180

interface Grid {
  xs: number[]
  ys: number[]
  ranges: number[]
  east: number[]
  north: number[]
  alpha: number[]
  tone: number[]
  tau: number[]
  texture: number[]
  weights: number[]
  path: number[]
  slant: number[]
  detail: number[]
  expected: number[]
  point: number[]
  fade: number[]
  facing: number[]
}

const scratch = new Map<string, Grid>()

export function gridFor(place: string, layer: FieldLayer, geom: SkyGeom, height: number) {
  const key = `${place}:${layer.lattice}`
  let grid = scratch.get(key)
  if (!grid) {
    grid = {
      xs: [], ys: [], ranges: [], east: [], north: [], alpha: [], tone: [],
      tau: [], texture: [], weights: [], path: [], slant: [], detail: [], expected: [], point: [], fade: [], facing: [],
    }
    if (scratch.size >= 32) scratch.delete(scratch.keys().next().value!)
    scratch.set(key, grid)
  }
  const { xs, ys, ranges, east, north, alpha, tone } = grid
  const cols = Math.max(40, Math.min(64, Math.ceil(geom.width / 8) + 1))
  xs.length = east.length = north.length = cols
  for (let i = 0; i < cols; i++) {
    const x = xs[i] = i * geom.width / (cols - 1)
    const az = geom.azimuthAt(x) * RAD
    east[i] = Math.sin(az)
    north[i] = Math.cos(az)
  }

  const far = groundRangeAt(height, 0)
  const near = groundRangeAt(height, geom.domeAltitudeAt(0))
  let upper = geom.horizon
  let gap = Math.min(12, Math.max(1.5, geom.horizon / 100))
  ys[0] = upper
  let count = 1
  ranges[0] = far
  // Start with equal ground-range steps. Merge intervals at the horizon and subdivide large gaps overhead.
  const step = (far - near) / 39
  let range = far
  while (upper > 0) {
    const candidate = geom.dome(altitudeOf(height, Math.max(near, range - step)))
    const nextGap = Math.min(12, gap * 1.14, Math.max(gap, upper - candidate))
    gap = nextGap
    ys[count++] = upper -= gap
    if (upper > 0) range = groundRangeAt(height, geom.domeAltitudeAt(upper))
  }
  const scale = geom.horizon / (geom.horizon - upper)
  for (let i = 1; i < count - 1; i++) {
    ys[i] = (ys[i] - upper) * scale
    ranges[i] = groundRangeAt(height, geom.domeAltitudeAt(ys[i]))
  }
  ranges[count - 1] = near
  ys[count - 1] = 0
  ys.length = ranges.length = count
  ys.reverse()
  ranges.reverse()
  alpha.length = tone.length = count * cols
  return grid
}

export function sheetFootprint(ranges: number[], row: number, angularStep: number) {
  const range = ranges[row]
  return Math.max(range * angularStep, range - (ranges[row - 1] ?? range), (ranges[row + 1] ?? range) - range)
}
