import { cityOffset } from './columns'
import { LAT_STEP, LON_STEP } from './grid'
import { decodeForm } from './form'
import type { BuiltSquare, Cluster, Extent } from './clusterTypes'
import type { PlaceRow } from './types'
import type { Coordinate } from '../landmarks/project'

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
  let big = 0, pitched = 0, flat = 0, evidence = 0, nearest = Infinity, cx = 0, cy = 0
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
    if (form.evidence) evidence++
  }
  const xs = squares.map(square => square.x).sort((a, b) => a - b)
  // Trim whole outlier squares at each tail and include the half-square to the outer edge.
  const trim = Math.floor(xs.length * .02)
  const dx: Extent = [toKm(xs[trim] - .5), toKm(xs[xs.length - 1 - trim] + .5)]
  const dy: Extent = [baseY - height / 2, baseY + depth - height / 2]
  const denominator = measured || 1
  sizes.sort((a, b) => a - b)
  // Hash the actual southernmost square, breaking ties westward, independent of the viewer.
  const id = (Math.imul(first.x, 73856093) ^ Math.imul(first.y, 19349663)) >>> 0
  return { id, dx, dy, centre: { dx: cx / shareSum, dy: cy / shareSum }, nearest,
    squares: squares.length, measured, shareSum, levels: measuredShare ? weightedLevels / measuredShare : 0, upper,
    form: { size: sizes[Math.floor((sizes.length - 1) / 2)] ?? 0, big: big / denominator,
      pitched: pitched / denominator, flat: flat / denominator, evidence: evidence / denominator },
    bands: bands.map(({ columns, sheds }, i) => ({
      dy: dy[1] - (i + .5) * depth / count, runs: runs(columns, toKm), big: runs(sheds, toKm),
    })),
    place: node && { kind: node[2], faith: node[3], name: node[5] },
    urban: dx[1] - dx[0] > 5.3 || squares.length > 400 }
}
