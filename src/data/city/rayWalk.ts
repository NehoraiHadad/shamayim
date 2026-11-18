import type { Coordinate } from '../landmarks/project'
import { destination } from '../terrain/panorama'

export type RayGrid = {
  toGrid: (lat: number, lon: number) => readonly [x: number, y: number]
  bounds?: readonly [cols: number, rows: number]
}

export type CellSpan = { col: number; row: number; start: number; end: number }

function cutAtGridEdges(a: number, b: number, cuts: number[]) {
  for (let edge = Math.floor(Math.min(a, b)) + 1; edge < Math.max(a, b); edge++) {
    cuts.push((edge - a) / (b - a))
  }
}

/** Trace a geodesic in kilometre chords, cutting each chord where it crosses a raster edge. */
export function* cellSpans(place: Coordinate, az: number, from: number, to: number,
  { toGrid, bounds }: RayGrid): Generator<CellSpan> {
  const at = (km: number) => {
    const { lat, lon } = destination(place.lat, place.lon, km, az)
    return toGrid(lat, lon)
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
      if (bounds && (col < 0 || col >= bounds[0] || row < 0 || row >= bounds[1])) continue
      yield { col, row, start: from + cuts[i - 1] * (end - from), end: from + cuts[i] * (end - from) }
    }
    from = end
    a = c
    b = d
  }
}
