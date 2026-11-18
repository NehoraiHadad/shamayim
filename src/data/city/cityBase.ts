import { seat } from '../landmarks/seat'

export function cityBase(ground: (x: number) => number, floor: number, row: number, x: number, w: number) {
  if (row === 1) return seat(ground, x, w, 0, true)!.baseY
  // In SVG the lower edge has the largest y. Seat on that edge so the downhill side cannot float.
  const ridge = Math.max(ground(x - w / 2), ground(x), ground(x + w / 2))
  if (row === 0) return ridge - 1
  const front = Math.min(5, floor - ridge)
  return front < 2 ? null : ridge + front
}
