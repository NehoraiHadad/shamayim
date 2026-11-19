import type { Glint } from '../../data/water/glint'
import type { WaterSpan } from '../../data/water/waterInView'

const r1 = (v: number) => Math.round(v * 10) / 10

/** A light 1-2-1 smoothing along the span, as the land's lines have (the DEM's and the mask's steps out of the edge). */
const smooth = (values: number[]) => values.map((v, i) =>
  (values[Math.max(0, i - 1)] + 2 * v + values[Math.min(values.length - 1, i + 1)]) / 4)

/** A span's surface: along its far edge left to right, back along its near edge (scene px). */
export function waterPath(span: WaterSpan): string {
  const { edges } = span
  const xs = edges.map((edge, i) => i === 0 ? span.from : i === edges.length - 1 ? span.to : edge.x)
  const farY = smooth(edges.map((edge) => edge.farY))
  const nearY = smooth(edges.map((edge) => edge.nearY)).map((y, i) => Math.max(y, farY[i]))
  const far = edges.map((_, i) => `${r1(xs[i])} ${r1(farY[i])}`)
  const near = edges.map((_, i) => `${r1(xs[i])} ${r1(nearY[i])}`).reverse()
  return `M${far.join('L')}L${near.join('L')}Z`
}

/** The light's path on the water: a thin wedge under it, from the far edge widening toward the eye. */
export function glintPath({ edge, x }: Glint): string {
  const depth = Math.max(0.6, edge.nearY - edge.farY)
  const top = 0.5, foot = Math.min(4, 0.8 + depth / 8)
  return `M${r1(x - top)} ${r1(edge.farY)}L${r1(x + top)} ${r1(edge.farY)}L${r1(x + foot)} ${r1(edge.farY + depth)}`
    + `L${r1(x - foot)} ${r1(edge.farY + depth)}Z`
}
