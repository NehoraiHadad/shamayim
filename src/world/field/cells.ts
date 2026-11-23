import { spanDeg } from '../../domain/camera'
import { rimReach } from './cellRim'
import { maxRadius, meanRadius } from './lattice'
import { altitudeOf, groundRangeAt } from './project'
import { visitDay, type Emit } from './visitDay'
import { dayStart, greedyPairs, HALF_WINDOW, handover, nearestMidnight } from './handover'
import type { CloudField, FieldCell, FieldLayer, Lattice } from './types'

/** Drawn individual-cell and panorama ranges in km. */
export const RANGES = {
  low: [10, 50], tower: [80, 80], mid: [40, 110], high: [120, 250],
} as const

export const CELLULAR_COLUMNS = 144
export const CELLULAR_LOW_ROWS = 12
export const CELLULAR_LOW_EDGE = 5
export const CELLULAR_LOW_POWER = 1 / 3

/** Shared Sc/Ac horizon cutoff at two texels per mean element diameter. */
export function cellularRasterRange(layer: FieldLayer) {
  const height = layer.baseKm + layer.meanVKm / 2
  const radius = meanRadius(layer.lattice, layer.g)
  // Reference camera spans 250°. Radially, use the horizon-side texel at the
  // 5° join of the cellular grid, where its densely packed middle band ends.
  // Linear angular spacing bounds the gap for the concave relief projection.
  const azimuthStep = spanDeg() * Math.PI / (180 * (CELLULAR_COLUMNS - 1))
  const elevationStep = CELLULAR_LOW_EDGE * (1 - (1 - 1 / CELLULAR_LOW_ROWS) ** CELLULAR_LOW_POWER)
  let low = 0, high = Math.min(radius / azimuthStep, groundRangeAt(height, 0), RANGES[layer.lattice][1])
  const radialStep = (range: number) => groundRangeAt(height, altitudeOf(height, range) - elevationStep) - range
  if (radialStep(high) <= radius) return high
  // One metre is well below the lattice bin size and keeps the cutoff conservative.
  while (high - low > 0.001) {
    const range = (low + high) / 2
    if (radialStep(range) <= radius) low = range
    else high = range
  }
  return low
}

/** Visit occupied sites whose centres lie within radiusKm, at the exact motion keyframe. */
export function visitCells(field: CloudField, lattice: Lattice, x: number, y: number, radiusKm: number,
  dtMin: number, emit: Emit) {
  const t = field.t + dtMin
  const midnight = nearestMidnight(t)
  const layer = field.layers.find(candidate => candidate.lattice === lattice)
  if (layer?.dayMotion && layer.Q > 0 && Math.abs(t - midnight) < HALF_WINDOW) {
    for (const cell of midnightCells(field, layer, x, y, radiusKm, t, midnight).cells) {
      if ((cell.x - x) ** 2 + (cell.y - y) ** 2 > radiusKm ** 2) continue
      if (emit(0, 0, cell.x, cell.y, cell.r, cell.baseKm, cell.vKm, cell.tau0, cell.share,
        cell.seed, cell.genus, cell.rank, cell.axis, cell) === false) return
    }
    return
  }
  const motion = layer?.dayMotion?.(t, dayStart(t))
  visitDay(field, lattice, x, y, radiusKm, dtMin, emit, motion)
}

/** Enumerate occupied centres within the layer's individual range, in km. */
export function cellsAround(field: CloudField, lattice: Lattice, x: number, y: number, radiusKm: number,
  dtMin = 0): FieldCell[] {
  return collect(field, lattice, x, y, Math.min(radiusKm, RANGES[lattice][0]), dtMin)
}

function collect(field: CloudField, lattice: Lattice, x: number, y: number, radiusKm: number, dtMin: number) {
  const cells: FieldCell[] = []
  const day = field.layers.find(layer => layer.lattice === lattice)?.dayMotion ? dayStart(field.t + dtMin) : undefined
  visitCells(field, lattice, x, y, radiusKm, dtMin, (i, j, east, north, r, base, v, tau, share, seed, genus, rank, axis, cell) => {
    cells.push(cell ?? fieldCell(lattice, i, j, east, north, r, base, v, tau, share, seed, genus, rank, axis, field.rain, day))
  })
  return cells
}

type DayMatch = { outgoing: FieldCell[]; incoming: FieldCell[]; pairs: ReturnType<typeof greedyPairs> }
const dayMatches = new Map<string, DayMatch>()

export function midnightCells(field: CloudField, layer: CloudField['layers'][number],
  x: number, y: number, radius: number, t: number, midnight: number) {
  const { lattice, g, Q, cover } = layer
  const reach = maxRadius(lattice) * g
  // Share the reference domain across near-range queries. Pad for overlapping neighbours
  // and the greatest possible travel between the reference minute and a window edge.
  const travel = HALF_WINDOW * 250 / 60
  const search = Math.max(RANGES[lattice][0] + reach, radius + Math.hypot(x, y)) + 6 * reach + travel
  const collectDay = (minute: number, day: number, extent: number, retainEmpty = false, motion = layer.dayMotion!(minute, day)) => {
    const cells: FieldCell[] = []
    visitDay(field, lattice, 0, 0, extent, minute - field.t,
      (i, j, east, north, r, base, v, tau, share, seed, genus, rank, axis) => {
        cells.push(fieldCell(lattice, i, j, east, north, r, base, v, tau, share, seed, genus, rank, axis, field.rain, day))
      }, motion, retainEmpty)
    return cells
  }
  const previous = midnight - 1440
  const a = layer.dayMotion!(midnight, previous), b = layer.dayMotion!(midnight, midnight)
  const key = JSON.stringify([field.placeId, lattice, midnight, search, Q, g, layer.form,
    layer.lowBaseKm ?? layer.baseKm, field.rain, a, b])
  let match = dayMatches.get(key)
  if (!match) {
    const outgoing = collectDay(midnight, previous, search, false, a)
    const incoming = collectDay(midnight, midnight, search, false, b)
    match = { outgoing, incoming, pairs: greedyPairs(outgoing, incoming, reach) }
    if (dayMatches.size === 16) dayMatches.delete(dayMatches.keys().next().value!)
    dayMatches.set(key, match)
  }
  const { outgoing, incoming, pairs } = match
  const extent = radius + Math.hypot(x, y) + 2 * reach
  const local = (cell: FieldCell) => cell.x ** 2 + cell.y ** 2 <= extent ** 2
  const before = t === midnight ? outgoing.filter(local) : collectDay(t, previous, extent, true)
  const after = t === midnight ? incoming.filter(local) : collectDay(t, midnight, extent, true)
  return { cells: handover(before, after, pairs, Q, cover, t - midnight), outgoing, incoming, pairs }
}

/** Materialize the primitive values from a visit for drawing or exact sampling. */
export function fieldCell(lattice: Lattice, i: number, j: number, x: number, y: number, r: number,
  baseKm: number, vKm: number, tau0: number, share: number, seed: number, genus: FieldCell['genus'],
  rank: number, axis: number | undefined, rain?: CloudField['rain'], day?: number): FieldCell {
  // Pack two signed 25-bit site coordinates and a two-bit lattice tag into an exact JS integer.
  const side = 2 ** 25, bias = side / 2
  const id = i >= -bias && i < bias && j >= -bias && j < bias
    ? ((i + bias) * side + j + bias) * 4 + latticeTag[lattice]
    : `${lattice}:${i}:${j}`
  return { id: day === undefined ? id : `${day}:${id}`, lattice, x, y, r, baseKm, vKm, tau0, share, seed, genus, rank, axis,
    rainWeight: rainPotential(genus, lattice, share, rain),
    rMinor: axis === undefined ? undefined : r / 3 }
}

const latticeTag = { low: 0, tower: 1, mid: 2, high: 3 }

/** Enumerate all occupied centres that could cover the query point, in km. */
export function cellsAt(field: CloudField, lattice: Lattice, x: number, y: number): FieldCell[] {
  const g = field.layers.find(layer => layer.lattice === lattice)?.g ?? 1
  return collect(field, lattice, x, y, rimReach(lattice) * maxRadius(lattice) * g, 0)
}

function rainPotential(genus: FieldCell['genus'], lattice: Lattice, share: number, rain: CloudField['rain']) {
  if (!rain || rain.rate <= 0) return 0
  const level = lattice === 'tower' ? 'low' : lattice
  if (rain.midWeight === undefined ? level !== rain.level
    : level === 'high' || (level === 'low' ? rain.midWeight === 1 : rain.midWeight === 0)) return 0
  // Ns and mature Cb sustain precipitation across their occupied footprint.
  if (genus === 'ns' || genus === 'cb') return share
  // Growing congestus: at most a light shower; the rain falls under the mature Cb cores.
  if (genus === 'cg') return 0.25 * share
  // Shallow Sc and St contribute drizzle when the low layer is raining.
  if (genus === 'sc' || genus === 'st') return 0.3 * share
  return 0
}
