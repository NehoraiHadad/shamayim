import { BAND_WIDTH, COLUMN_COUNT, COLUMN_WIDTH, cityOffset } from './columns'
import { LAT_STEP, LON_STEP } from './grid'
import { decodeForm } from './form'
import type { BuiltSquare, Cluster, Extent } from './clusterTypes'
import type { PlaceRow } from './types'
import type { Coordinate } from '../landmarks/project'

function componentColumns(squares: BuiltSquare[], toKm: (x: number) => number) {
  const bins = new Map<number, { share: number; measured: number; levels: number; upper: number; count: number }>()
  for (const { x, meta, upper } of squares) {
    const index = Math.floor(BAND_WIDTH * (.5 + toKm(x) / 24) / COLUMN_WIDTH)
    if (index < 0 || index >= COLUMN_COUNT) continue
    const bin = bins.get(index) ?? { share: 0, measured: 0, levels: 0, upper: 0, count: 0 }
    const share = meta >> 4, levels = meta & 15
    bin.share += share
    bin.count++
    if (levels) {
      bin.measured += share
      bin.levels += share * levels
    }
    bin.upper = Math.max(bin.upper, upper)
    bins.set(index, bin)
  }
  return new Map([...bins].map(([index, bin]) => [index, {
    built: bin.share / (15 * bin.count), measured: bin.measured / (15 * bin.count),
    levels: bin.measured ? bin.levels / bin.measured : 3, upper: bin.upper,
  }]))
}

function runs(columns: number[], toKm: (x: number) => number): Extent[] {
  const merged: Extent[] = []
  for (const x of [...new Set(columns)].sort((a, b) => a - b)) {
    const last = merged.at(-1)
    if (last && last[1] === x - .5) last[1] = x + .5
    else merged.push([x - .5, x + .5])
  }
  return merged.map(([left, right]) => [toKm(left), toKm(right)])
}

export function describeCluster(place: Coordinate, component: BuiltSquare[], node?: PlaceRow): Cluster {
  const squares = [...component].sort((a, b) => a.y - b.y || a.x - b.x)
  const first = squares[0]
  const { dx: width, dy: height } = cityOffset(place, { lat: place.lat + LAT_STEP, lon: place.lon + LON_STEP })
  const { dx: baseX, dy: baseY } = cityOffset(place, first)
  const toKm = (x: number) => baseX + (x - first.x) * width
  const top = squares.at(-1)!.y, depth = (top - first.y + 1) * height
  const count = depth < .35 ? 1 : depth < .8 ? 2 : 3
  const bands = Array.from({ length: count }, () => ({ columns: [] as number[], sheds: [] as number[] }))
  let shareSum = 0, measured = 0, weightedLevels = 0, measuredShare = 0, upper = 0
  let big = 0, pitched = 0, flat = 0, tagged = 0, evidence = 0, nearest = Infinity, cx = 0, cy = 0
  const sizes: number[] = []
  for (const square of squares) {
    const { x, y, meta } = square
    const share = meta >> 4, levels = meta & 15
    const dx = toKm(x), dy = baseY + (y - first.y) * height
    nearest = Math.min(nearest, Math.hypot(dx, dy))
    shareSum += share
    cx += dx * share
    cy += dy * share
    const band = bands[Math.floor((top - y + .5) * count / (top - first.y + 1))]
    band.columns.push(x)
    if (!levels && !square.upper && !square.form) continue
    measured++
    measuredShare += share
    weightedLevels += levels * share
    upper = Math.max(upper, square.upper)
    const form = decodeForm(square.form)
    if (form.size) sizes.push(form.size)
    // Quantized classes indicate rank, not an exact area fraction. Count squares at >=40%.
    if (form.big >= 2) { big++; band.sheds.push(x) }
    if (form.roof & 1) pitched++
    if (form.roof & 2) flat++
    if (form.roof) tagged++
    if (form.evidence) evidence++
  }
  const xs = squares.map(square => square.x).sort((a, b) => a - b)
  // Trim whole outlier squares at each tail and include the half-square to the outer edge.
  const trim = Math.floor(xs.length * .02)
  const dx: Extent = [toKm(xs[trim] - .5), toKm(xs[xs.length - 1 - trim] + .5)]
  const dy: Extent = [baseY - height / 2, baseY + depth - height / 2]
  const urban = dx[1] - dx[0] > 5.3 || squares.length > 400
  const denominator = measured || 1
  sizes.sort((a, b) => a - b)
  // Hash the actual southernmost square, breaking ties westward, independent of the viewer.
  const id = (Math.imul(first.x, 73856093) ^ Math.imul(first.y, 19349663)) >>> 0
  return { id, dx, dy, centre: { dx: cx / shareSum, dy: cy / shareSum }, nearest,
    squares: squares.length, measured, shareSum, levels: measuredShare ? weightedLevels / measuredShare : 0, upper,
    form: { size: sizes[Math.floor((sizes.length - 1) / 2)] ?? 0, big: big / denominator,
      pitched: pitched / denominator, flat: flat / denominator, evidence: evidence / denominator, tagged },
    bands: bands.map(({ columns, sheds }, i) => ({
      dy: dy[1] - (i + .5) * depth / count, runs: runs(columns, toKm), big: runs(sheds, toKm),
    })),
    place: node && { kind: node[2], faith: node[3], name: node[5] },
    urban, ...(urban && { columns: componentColumns(squares, toKm) }) }
}
