import type { OutsideItem } from '../../../model/types'

/*
 * Where each built body of the outside view stands in front of another: the strips just outside its two edges that fall
 * on a body painted before it (behind it), as rectangles (screen px). The street between them is in shade there; the
 * ground and the sky beside a body take nothing. Geometry only, so one answer per item list (cached by it). Pure.
 */

/** The strip's width (px) beside each edge of a body. */
export const ALLEY = .9
/** The columns (px) the bodies are indexed by, for the search behind each. */
const COLUMN = 4

type Rect = readonly [number, number, number, number]
/** A body's alley rects (x, y, w, h). */
export type Alley = readonly Rect[]
const cache = new WeakMap<readonly OutsideItem[], (Alley | undefined)[]>()

/** A body's extent (x0, y0, x1, y1): a box's walls, a tower's shaft and podium. */
function extent(item: OutsideItem): Rect | null {
  if (item.kind === 'box') return [item.x - item.w / 2, item.top, item.x + item.w / 2, item.foot]
  if (item.kind !== 'tower') return null
  const podium = item.full ? 1.1 : 0
  return [item.x - item.w / 2 - podium, item.base - item.h, item.x + item.w / 2 + podium, item.base]
}

/** Per item (by index): the alley rects (x, y, w, h) on what stands behind it, or undefined. */
export function alleysOf(items: readonly OutsideItem[]): (Alley | undefined)[] {
  const cached = cache.get(items)
  if (cached) return cached
  const columns = new Map<number, Rect[]>()
  const out = items.map((item) => {
    const e = extent(item)
    if (!e) return undefined
    const [x0, top, x1, foot] = e
    const rects: Rect[] = []
    for (const [a, b] of [[x0 - ALLEY, x0], [x1, x1 + ALLEY]] as const) {
      const mid = (a + b) / 2, spans: [number, number][] = []
      for (const [bx0, by0, bx1, by1] of columns.get(Math.floor(mid / COLUMN)) ?? []) {
        if (bx0 > mid || bx1 < mid) continue
        const y0 = Math.max(by0, top + .3), y1 = Math.min(by1, foot)
        if (y1 > y0) spans.push([y0, y1])
      }
      spans.sort((p, q) => p[0] - q[0])
      let open: [number, number] | null = null
      for (const span of spans) {
        if (open && span[0] <= open[1]) open[1] = Math.max(open[1], span[1])
        else {
          if (open) rects.push([a, open[0], ALLEY, open[1] - open[0]])
          open = [...span]
        }
      }
      if (open) rects.push([a, open[0], ALLEY, open[1] - open[0]])
    }
    for (let c = Math.floor(x0 / COLUMN); c <= Math.floor(x1 / COLUMN); c++) {
      let list = columns.get(c)
      if (!list) columns.set(c, list = [])
      list.push(e)
    }
    return rects.length ? rects : undefined
  })
  cache.set(items, out)
  return out
}
