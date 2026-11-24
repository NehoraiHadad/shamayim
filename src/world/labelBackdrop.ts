import type { Box } from './layout'

export interface BackdropBoxes { fabric: Box[]; beyond: Box[] }

// A 2 × 2 patch in the reference scene is the smallest visible coverage change.
const VISIBLE_AREA_PX2 = 4
export const backdropSteps = (area: number) => Math.floor(area / VISIBLE_AREA_PX2)

/** The prefix grids round outwards. Resolve their zero-area step from clipped
 * geometry so a subpixel graze cannot count as a visible patch.
 */
export function hasVisibleContact(boxes: readonly Box[], upper: number, lower: number, scale: number) {
  const visible = VISIBLE_AREA_PX2 * scale
  let sum = 0
  const contacts: Box[] = []
  for (const box of boxes) {
    const top = Math.max(box.top, upper), bottom = Math.min(box.bottom, lower)
    if (top >= bottom) continue
    const area = (box.right - box.left) * (bottom - top)
    if (area >= visible) return true
    sum += area
    contacts.push({ ...box, top, bottom })
  }
  if (sum < visible) return false

  // When several small contacts add up, sweep their union to avoid counting overlaps twice.
  contacts.sort((a, b) => a.top - b.top)
  const edges = [...new Set(contacts.flatMap(box => [box.left, box.right]))].sort((a, b) => a - b)
  let covered = 0
  for (let i = 1; i < edges.length; i++) {
    let bottom = upper, rows = 0
    for (const box of contacts) {
      if (box.right <= edges[i - 1] || box.left >= edges[i]) continue
      rows += Math.max(0, box.bottom - Math.max(bottom, box.top))
      bottom = Math.max(bottom, box.bottom)
    }
    covered += (edges[i] - edges[i - 1]) * rows
    if (covered >= visible) return true
  }
  return false
}
