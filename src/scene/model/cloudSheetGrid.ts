import { groundRangeAt } from '../../world/field/project'
import { unit } from '../../world/field/genus'
import { transmitAlong, type FieldSnapshot } from '../../world/field/transmit'
import type { FieldLayer, Genus } from '../../world/field/types'
import type { WorldState } from '../../world/types'
import type { SkyGeom } from './sky'

const RAD = Math.PI / 180

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
  point: number[]
  swept: number[]
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
      tau: [], texture: [], weights: [], path: [], slant: [], detail: [], expected: [], point: [], swept: [], fade: [], facing: [],
    }
    if (scratch.size >= 32) scratch.delete(scratch.keys().next().value!)
    scratch.set(key, grid)
  }
  const { xs, ys, altitudes, ranges, east, north, alpha, tone } = grid
  // Broad St/Cs structures need half the angular resolution of cellular Sc/Ac.
  const broad = genus === 'st' || genus === 'cs'
  const cols = broad ? 24 : 48
  const targetRows = broad ? 12 : genus === 'sc' || genus === 'ac' ? 36 : 24
  xs.length = east.length = north.length = cols
  for (let i = 0; i < cols; i++) {
    const x = xs[i] = i * geom.width / (cols - 1)
    const az = geom.azimuthAt(x) * RAD
    east[i] = Math.sin(az)
    north[i] = Math.cos(az)
  }

  let upper = geom.horizon
  // Geometric spacing puts twice as many rays in the lower half, where the
  // same horizontal structures project into narrower bands.
  const count = targetRows + 1
  const ratio = 4 ** (1 / targetRows)
  let gap = geom.horizon * (ratio - 1) / 3
  for (let i = count - 1; i >= 0; i--) {
    const y = ys[i] = i ? upper : 0
    const altitude = altitudes[i] = geom.domeAltitudeAt(y)
    ranges[i] = groundRangeAt(height, altitude)
    upper -= gap
    gap *= ratio
  }
  ys.length = altitudes.length = ranges.length = count
  alpha.length = tone.length = count * cols
  return grid
}

export function sheetFootprint(ranges: number[], row: number, angularStep: number) {
  const range = ranges[row]
  return Math.max(range * angularStep, range - (ranges[row - 1] ?? range), (ranges[row + 1] ?? range) - range)
}

// Filter cross-ray detail in azimuth. Radial undersampling is handled
// separately by the transition from resolved cells to ensemble transmission.
export const textureFootprint = (range: number, angularStep: number) => range * angularStep

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
