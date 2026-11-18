export interface Point { x: number; y: number }

/**
 * Where a ray from `from` toward `to` leaves a `width` × `height` box shrunk by `inset` (so a chip centred there stays
 * inside), and its screen angle (degrees, 0 = right, 90 = down). Null when `to` is already inside that box.
 */
export function edgePointer(from: Point, to: Point, width: number, height: number, inset: { x: number; y: number }):
  (Point & { angle: number }) | null {
  const [left, right, top, bottom] = [inset.x, width - inset.x, inset.y, height - inset.y]
  if (to.x >= left && to.x <= right && to.y >= top && to.y <= bottom) return null
  const dx = to.x - from.x
  const dy = to.y - from.y
  // The smallest step along the ray that reaches one of the four edges.
  const steps = [
    dx > 0 ? (right - from.x) / dx : dx < 0 ? (left - from.x) / dx : Infinity,
    dy > 0 ? (bottom - from.y) / dy : dy < 0 ? (top - from.y) / dy : Infinity,
  ]
  const t = Math.max(0, Math.min(...steps))
  return { x: from.x + dx * t, y: from.y + dy * t, angle: (Math.atan2(dy, dx) * 180) / Math.PI }
}
