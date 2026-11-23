import type { WaterSpan } from '../../data/water/waterInView'
import { SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { WorldState } from '../../world/types'
import type { Pt, SceneBox } from './types'

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0
/** A light 1-2-1 smoothing along the span, as the SVG's water has (the DEM's and the mask's steps out of the edge). */
const smooth = (values: number[]) => values.map((v, i) =>
  (values[Math.max(0, i - 1)] + 2 * v + values[Math.min(values.length - 1, i + 1)]) / 4)

/** A span's surface in the box: x along it, its far and near edges smoothed (as the SVG's `waterPath`). */
export interface Shape {
  xs: number[]; farY: number[]; nearY: number[]
  points: Pt[]; far: Pt[]; top: number; bottom: number
  /** Medians over the far edge: depression (deg, + below eye level) and distance (km). */
  far0: { dep: number; km: number }
}

const shapes = new WeakMap<WaterSpan, Map<number, Shape>>()

/** The altitude (deg) drawn at a y of the land (the relief is odd and rising: bisection). */
export function angleAt(world: WorldState, y: number): number {
  let lo = -30, hi = 30
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2
    if (world.relief.y(mid) > y) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function shapeOf(span: WaterSpan, box: SceneBox): Shape {
  let byWidth = shapes.get(span)
  if (!byWidth) shapes.set(span, byWidth = new Map())
  const cached = byWidth.get(box.width)
  if (cached) return cached
  const sx = box.width / SCENE_W
  const { edges } = span
  const xs = edges.map((edge, i) => (i === 0 ? span.from : i === edges.length - 1 ? span.to : edge.x) * sx)
  const farY = smooth(edges.map((edge) => edge.farY))
  const nearY = smooth(edges.map((edge) => edge.nearY)).map((y, i) => Math.max(y, farY[i]))
  const far: Pt[] = xs.map((x, i) => [x, farY[i]])
  const points: Pt[] = [...far, ...xs.map((x, i): Pt => [x, nearY[i]]).reverse()]
  const shape: Shape = {
    xs, farY, nearY, points, far, top: Math.min(...farY), bottom: Math.max(...nearY),
    far0: { dep: -median(edges.map((e) => e.farAngle)), km: median(edges.map((e) => e.farKm)) },
  }
  byWidth.set(box.width, shape)
  return shape
}

/** The land standing over a span's far edge, the crest standing highest in each direction: its angle (deg) and distance. */
function landOver(world: WorldState, span: WaterSpan): { angle: number; km: number } {
  const { near: nearPlane, far: farPlane } = world.terrain
  const over = span.edges.map((edge) => {
    const ny = nearPlane.points.length > 1 ? lineAt(nearPlane.points, edge.x) : Infinity
    const fy = farPlane.points.length > 1 ? lineAt(farPlane.points, edge.x) : Infinity
    const plane = fy < ny ? farPlane : nearPlane
    const i = Math.max(0, plane.points.findIndex(([px]) => px >= edge.x))
    return { y: Math.min(ny, fy), km: (plane.hazeKm ?? plane.distanceKm)[i] ?? span.distanceKm }
  })
  const landY = median(over.map((o) => o.y))
  return { angle: Number.isFinite(landY) ? angleAt(world, landY) : -90, km: median(over.map((o) => o.km)) }
}

/**
 * What the water shows at a row of the screen, shared by every span (both planes), so water at one height is one tone
 * however the spans split it: its distance there (the spans' edges binned by row, farther never lower on screen) and the
 * land standing over the far shores (the median over all spans: its angle and distance).
 */
interface Surface { kmAt: (y: number) => number; land: { angle: number; km: number } }
/** By the drawn land and its spans: the near plane is drawn anew as a place's data arrives, the spans stay. */
const surfaces = new WeakMap<WorldState['terrain'], WeakMap<readonly WaterSpan[], Surface>>()

export function surfaceOf(world: WorldState): Surface {
  const spans = world.water.spans
  let bySpans = surfaces.get(world.terrain)
  if (!bySpans) surfaces.set(world.terrain, bySpans = new WeakMap())
  const cached = bySpans.get(spans)
  if (cached) return cached
  const bins = new Map<number, number[]>()
  const add = (y: number, km: number) => {
    const row = Math.round(y)
    bins.set(row, [...bins.get(row) ?? [], km])
  }
  for (const span of spans) for (const e of span.edges) { add(e.farY, e.farKm); add(e.nearY, e.nearKm) }
  const rows = [...bins.keys()].sort((a, b) => b - a)
  // From the nearest row up: the median distance of each row, never nearer than the row below it.
  const known: [number, number][] = []
  let floor = 0
  for (const row of rows) {
    floor = Math.max(floor, median(bins.get(row)!))
    known.push([row, floor])
  }
  known.reverse()
  const kmAt = (y: number) => {
    if (!known.length) return 0
    if (y <= known[0][0]) return known[0][1]
    for (let i = 1; i < known.length; i++) {
      const [y1, k1] = known[i]
      if (y <= y1) { const [y0, k0] = known[i - 1]; return lerp(k0, k1, (y - y0) / ((y1 - y0) || 1)) }
    }
    return known.at(-1)![1]
  }
  const lands = spans.map((span) => landOver(world, span))
  const surface = { kmAt, land: { angle: median(lands.map((l) => l.angle)), km: median(lands.map((l) => l.km)) } }
  bySpans.set(spans, surface)
  return surface
}

/** The surface's far and near edge at an x inside it. */
export function edgeAt(shape: Shape, x: number): [number, number] {
  const { xs, farY, nearY } = shape
  let i = 1
  while (i < xs.length - 1 && xs[i] < x) i++
  const t = clamp01((x - xs[i - 1]) / ((xs[i] - xs[i - 1]) || 1))
  return [lerp(farY[i - 1], farY[i], t), lerp(nearY[i - 1], nearY[i], t)]
}
