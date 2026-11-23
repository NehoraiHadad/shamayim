import { groundRangeAt } from '../../world/field/project'
import { CELLULAR_COLUMNS, CELLULAR_LOW_EDGE, CELLULAR_LOW_POWER, CELLULAR_LOW_ROWS } from '../../world/field/cells'
import { unit } from '../../world/field/genus'
import { transmitAlong, type FieldSnapshot } from '../../world/field/transmit'
import type { FieldLayer, Genus } from '../../world/field/types'
import type { WorldState } from '../../world/types'
import type { SkyGeom } from './sky'
import type { LayerOf } from './types'

const RAD = Math.PI / 180

/** As painted, the sheet interpolates between ray centres on non-uniform elevation rows. */
export function sheetAlphaAt({ xs, ys, alpha }: LayerOf<'cloudSheet'>, x: number, y: number) {
  if (x < xs[0] || x > xs[xs.length - 1] || y < ys[0] || y > ys[ys.length - 1]) return 0
  const column = (x - xs[0]) / (xs[1] - xs[0])
  const col = Math.min(xs.length - 2, Math.floor(column))
  const row = ys.findIndex(centre => centre >= y && centre > ys[0]) - 1
  const fx = column - col, fy = (y - ys[row]) / (ys[row + 1] - ys[row])
  const at = (r: number) => {
    const i = r * xs.length + col
    return ((1 - fx) * Math.round(255 * alpha[i]) + fx * Math.round(255 * alpha[i + 1])) / 255
  }
  const top = at(row)
  return top + fy * (at(row + 1) - top)
}

interface Grid {
  xs: number[]
  ys: number[]
  altitudes: number[]
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
  fade: number[]
  facing: number[]
}

const scratch = new Map<string, Grid>()

export function gridFor(place: string, layer: FieldLayer, geom: SkyGeom, height: number, genus: Genus) {
  const key = `${place}:${layer.lattice}`
  let grid = scratch.get(key)
  if (!grid) {
    grid = {
      xs: [], ys: [], altitudes: [], ranges: [], east: [], north: [], alpha: [], tone: [],
      tau: [], texture: [], weights: [], path: [], slant: [], detail: [], expected: [], fade: [], facing: [],
    }
    if (scratch.size >= 32) scratch.delete(scratch.keys().next().value!)
    scratch.set(key, grid)
  }
  const { xs, ys, altitudes, ranges, east, north, alpha, tone } = grid
  // Broad St/Cs structures need half the angular resolution of cellular Sc/Ac.
  const broad = genus === 'st' || genus === 'cs'
  const cellular = genus === 'sc' || genus === 'ac'
  // N3h resolves Sc/Ac elements with 144 azimuth rays and 72 elevation intervals.
  const cols = cellular ? CELLULAR_COLUMNS : broad ? 24 : 48
  const targetRows = cellular ? 72 : broad ? 12 : 24
  xs.length = east.length = north.length = cols
  for (let i = 0; i < cols; i++) {
    const x = xs[i] = i * geom.width / (cols - 1)
    const az = geom.azimuthAt(x) * RAD
    east[i] = Math.sin(az)
    north[i] = Math.cos(az)
  }

  const count = targetRows + 1
  if (cellular) {
    // Pack two thirds of the rows into 5–30°. Compress towards 5°,
    // where one scene pixel covers a larger radial distance.
    const lowEdge = geom.dome(CELLULAR_LOW_EDGE)
    const bands = [[0, geom.dome(30), 12, 1], [geom.dome(30), lowEdge, 48, 3],
      [lowEdge, geom.horizon, CELLULAR_LOW_ROWS, CELLULAR_LOW_POWER]]
    let row = 0
    for (const [top, bottom, intervals, power] of bands) {
      for (let i = 0; i < intervals; i++) ys[row++] = bottom - (bottom - top) * (1 - i / intervals) ** power
    }
    ys[0] = 0
    ys[count - 1] = geom.horizon
  } else {
    // Broad decks retain the established geometric spacing.
    const ratio = 4 ** (1 / targetRows)
    let gap = geom.horizon * (ratio - 1) / 3
    ys[count - 1] = geom.horizon
    for (let i = count - 2; i > 0; i--) {
      ys[i] = ys[i + 1] - gap
      gap *= ratio
    }
    ys[0] = 0
  }
  for (let i = 0; i < count; i++) {
    const altitude = altitudes[i] = geom.domeAltitudeAt(ys[i])
    ranges[i] = groundRangeAt(height, altitude)
  }
  ys.length = altitudes.length = ranges.length = count
  alpha.length = tone.length = count * cols
  return grid
}

export function sheetFootprint(ranges: number[], row: number, angularStep: number) {
  const range = ranges[row]
  return Math.max(range * angularStep, range - (ranges[row - 1] ?? range), (ranges[row + 1] ?? range) - range)
}

export function solarTexel(world: WorldState, geom: SkyGeom, snapshot: FieldSnapshot[number], grid: Grid, angularStep: number) {
  const { xs, altitudes, east, north, facing, path } = grid
  const { azimuth, altitude } = world.bodies.sun
  const sunEast = Math.sin(azimuth * RAD), sunNorth = Math.cos(azimuth * RAD)
  let col = 0, row = 0
  for (let i = 0; i < xs.length; i++) {
    // A broad cosine lobe models the visible forward-scattering lift.
    facing[i] = unit(0.5 + 0.5 * (sunEast * east[i] + sunNorth * north[i])) ** 6
    if (facing[i] > facing[col]) col = i
  }
  const field = world.cloudField?.field
  if (!field || !(altitude > 0)) return null
  for (let i = 1; i < altitudes.length; i++) {
    if (Math.abs(altitudes[i] - altitude) < Math.abs(altitudes[row] - altitude)) row = i
  }
  if (!path[row]) return null
  const sampledAltitude = altitudes[row]
  const angle = Math.acos(2 * unit(0.5 + 0.5 * (sunEast * east[col] + sunNorth * north[col])) - 1)
  const neighbor = altitudes[row + (altitude > sampledAltitude ? -1 : 1)]
  const spacing = Math.abs(sampledAltitude - (neighbor ?? altitudes[row + 1] ?? altitudes[row - 1]))
  const offset = Math.abs(sampledAltitude - altitude)
  // Feather the resolved chord within half a texel, so crossing a grid
  // boundary fades out one solar sample before fading in its neighbor.
  const weight = unit(1 - 2 * angle / angularStep) * (offset ? unit(1 - 2 * offset / spacing) : 1)
  return weight ? { index: row * xs.length + col, weight,
    opacity: 1 - transmitAlong(field, [snapshot], geom.azimuthAt(xs[col]), sampledAltitude) } : null
}
