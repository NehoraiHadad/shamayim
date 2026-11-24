import { waterLayer } from '../../data/water/glint'
import type { WaterSpan } from '../../data/water/waterInView'
import type { CoastalSea } from '../types'
import type { DrawnHouse } from './drawn'

/** Whether a spot (km from the place) is on water as it is drawn. */
export type WaterAt = (dx: number, dy: number) => boolean

/**
 * Whether a house as drawn stands on no water: its middle and both ends of its front, at the width it is drawn at
 * (`enlarge` times its own), as far as the eye sees them: across, east and west.
 */
export function standsDry({ dx, dy, frontM }: Pick<DrawnHouse, 'dx' | 'dy' | 'frontM'>, enlarge: number, waterAt: WaterAt): boolean {
  const half = frontM * enlarge / 2000
  return ![0, -half, half].some(side => waterAt(dx + side, dy))
}

/** Whether a spot of the screen lies on the coastal sea as drawn. */
export function onSea(sea: CoastalSea, x: number, y: number): boolean {
  if (y < sea.horizon) return false
  const i = sea.coast.findIndex(([, at]) => at >= y)
  if (i <= 0) return false
  const [x0, y0] = sea.coast[i - 1], [x1, y1] = sea.coast[i]
  const coast = y1 > y0 ? x0 + (x1 - x0) * (y - y0) / (y1 - y0) : x1
  return sea.side === 'left' ? x < coast : x > coast
}

/** Whether a spot of the screen (`x375`: at the reference width) lies on a stretch of water in view. */
export function onLake({ from, to, edges }: WaterSpan, x375: number, y: number): boolean {
  if (x375 < from || x375 > to) return false
  const at = edges.reduce((best, edge) => Math.abs(edge.x - x375) < Math.abs(best.x - x375) ? edge : best)
  return y > at.farY && y < at.nearY
}

/** Whether a spot of the screen is on the water in front of the land, as drawn. */
export function drawnWater(sea: CoastalSea | null, spans: readonly WaterSpan[] | undefined, width: number): (x: number, y: number) => boolean {
  const lakes = (spans ?? []).filter(span => waterLayer(span) === 'near')
  return (x, y) => (sea !== null && onSea(sea, x, y)) || lakes.some(span => onLake(span, x * 375 / width, y))
}