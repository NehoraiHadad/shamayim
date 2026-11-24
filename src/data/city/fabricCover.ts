import type { OutsideBox } from './outsideView'

/** Where a body comes in its row's painting (far first): its foot, and its depth where feet are level. */
export const rowY = (box: OutsideBox) => box.foot - .001 * box.near
/** The bodies painted last first, the same for any order they come in. */
export const frontFirst = (a: OutsideBox, b: OutsideBox) => rowY(b) - rowY(a) || a.x - b.x || (a.seed ?? 0) - (b.seed ?? 0)

/**
 * The least of itself a body must show: this many px of its width with a whole px of wall over what stands in front (a
 * lower strip counts by its share of a px, so a sliver beside a wall and one over a roof are measured alike). It is the
 * narrowest body the painters draw as a building (`LEAST_W` in `drawn/townBlocks.ts`; the photographic one has no window
 * under 1.6): less of one reads as a spike or a bright line.
 */
export const LEAST_SHOWN_PX = 2.2

/** The bodies are looked up by columns this wide (px). */
const COLUMN = 8

/** The px of width over which `body` shows a whole px of wall over the bodies in front (their true spans and roofs). */
export function shownWidth(body: OutsideBox, front: readonly OutsideBox[]) {
  const left = body.x - body.w / 2, right = body.x + body.w / 2
  const spans = front.map(f => ({ left: Math.max(left, f.x - f.w / 2), right: Math.min(right, f.x + f.w / 2), top: f.top }))
    .filter(s => s.right > s.left)
  const edges = [left, right, ...spans.flatMap(s => [s.left, s.right])].sort((a, b) => a - b)
  let shown = 0
  for (let i = 1; i < edges.length; i++) {
    const from = edges[i - 1], to = edges[i]
    if (to <= from) continue
    let roof = body.foot
    for (const s of spans) if (s.left <= from && s.right >= to && s.top < roof) roof = s.top
    shown += (to - from) * Math.min(1, Math.max(0, roof - body.top))
  }
  return shown
}

/**
 * The blocks drawn wider than their sites (`widened`) that show: one is left out only where the nearer of them leave less
 * than `LEAST_SHOWN_PX` of it to be seen.
 */
export function shownBlocks(widened: readonly OutsideBox[]): Set<OutsideBox> {
  const shown = new Set<OutsideBox>()
  const columns = new Map<number, OutsideBox[]>()
  for (const body of [...widened].sort(frontFirst)) {
    const from = Math.floor((body.x - body.w / 2) / COLUMN), to = Math.floor((body.x + body.w / 2) / COLUMN)
    const front = new Set<OutsideBox>()
    for (let c = from; c <= to; c++) for (const other of columns.get(c) ?? []) if (other.near >= body.near) front.add(other)
    if (shownWidth(body, [...front]) < LEAST_SHOWN_PX) continue
    shown.add(body)
    for (let c = from; c <= to; c++) {
      const column = columns.get(c)
      if (column) column.push(body)
      else columns.set(c, [body])
    }
  }
  return shown
}
