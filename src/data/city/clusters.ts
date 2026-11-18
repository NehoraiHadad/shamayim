import { cityOffset } from './columns'
import { COLS, ROWS, squareCentre, squareOf, strideFor } from './grid'
import { describeCluster } from './clusterStats'
import type { BuiltSquare, Cluster } from './clusterTypes'
import type { PlaceRow } from './types'
import type { Coordinate } from '../landmarks/project'

const key = (x: number, y: number) => `${x}_${y}`
function pointKey(lat: number, lon: number) {
  const { cell, col, row } = squareOf(lat, lon)
  const [y, x] = cell.split('_').map(Number)
  return key(x * COLS + col, y * ROWS + row)
}

export function splitByPlace(component: BuiltSquare[], places: PlaceRow[]) {
  const occupied = new Set(component.map(({ x, y }) => key(x, y)))
  const nodes = places.filter(([lat, lon]) => occupied.has(pointKey(lat, lon)))
  if (nodes.length < 2) return [{ squares: component, node: nodes[0] }]
  const parts = new Map<PlaceRow | undefined, BuiltSquare[]>()
  for (const square of component) {
    let best: PlaceRow | undefined, min = 2
    for (const node of nodes) {
      const [lat, lon, , , reach] = node
      const { dx, dy } = cityOffset({ lat, lon }, square)
      const score = Math.hypot(dx, dy) * 10 / reach
      if (score < min || (score === min && !best)) {
        best = node
        min = score
      }
    }
    const squares = parts.get(best) ?? []
    squares.push(square)
    parts.set(best, squares)
  }
  return [...parts].map(([node, squares]) => ({ node, squares }))
}

function collect(grids: ReadonlyMap<string, Uint8Array>) {
  const remaining = new Map<string, BuiltSquare>()
  for (const [cell, bytes] of grids) {
    const [south, west] = cell.split('_').map(Number)
    const stride = strideFor(bytes)
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      const i = (row * COLS + col) * stride, meta = bytes[i]
      if (!(meta >> 4)) continue
      const x = west * COLS + col, y = south * ROWS + row
      remaining.set(key(x, y), { x, y, ...squareCentre({ cell, row, col }), meta,
        upper: bytes[i + 1], form: stride === 3 ? bytes[i + 2] : 0 })
    }
  }
  return remaining
}

export function findClusters(place: Coordinate, grids: ReadonlyMap<string, Uint8Array>, places: PlaceRow[]): Cluster[] {
  const remaining = collect(grids)
  const clusters: Cluster[] = []
  const nodes = [...places].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] ||
    a[4] - b[4] || (a[5] < b[5] ? -1 : Number(a[5] > b[5])))
  for (const [start, first] of remaining) {
    remaining.delete(start)
    const component = [first]
    for (const { x, y } of component) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const k = key(x + dx, y + dy), next = remaining.get(k)
        if (!next) continue
        remaining.delete(k)
        component.push(next)
      }
    }
    if (component.length < 4) continue
    for (const { squares, node } of splitByPlace(component, nodes)) {
      if (squares.length >= 4) clusters.push(describeCluster(place, squares, node))
    }
  }
  return clusters.sort((a, b) => a.nearest - b.nearest || a.id - b.id)
}
