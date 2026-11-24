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
  const rise = (roof: number) => Math.min(1, Math.max(0, Math.min(roof, body.foot) - body.top))
  // The highest roof in front decides at each px, so they are laid highest first on what is still open behind them. One a px
  // or more under the body's own roof takes nothing of it.
  const roofs = front.filter(f => f.top < body.top + 1).sort((a, b) => a.top - b.top)
  let open: [number, number][] = [[body.x - body.w / 2, body.x + body.w / 2]], shown = 0
  for (const f of roofs) {
    const left = f.x - f.w / 2, right = f.x + f.w / 2
    open = open.flatMap(([from, to]): [number, number][] => {
      const start = Math.max(from, left), end = Math.min(to, right)
      if (start >= end) return [[from, to]]
      shown += (end - start) * rise(f.top)
      return [...(from < start ? [[from, start] as [number, number]] : []), ...(end < to ? [[end, to] as [number, number]] : [])]
    })
    if (!open.length) break
  }
  for (const [from, to] of open) shown += (to - from) * rise(body.foot)
  return shown
}

/**
 * The blocks drawn wider than their sites (`widened`) that show: one is left out only where the nearer of them leave less
 * than `LEAST_SHOWN_PX` of it to be seen.
 */
export function shownBlocks(widened: readonly OutsideBox[]): Set<OutsideBox> {
  const shown = new Set<OutsideBox>()
  const columns = new Map<number, OutsideBox[]>()
  const columnOf = (x: number) => Math.floor(x / COLUMN)
  for (const body of [...widened].sort(frontFirst)) {
    const from = columnOf(body.x - body.w / 2), to = columnOf(body.x + body.w / 2)
    const front: OutsideBox[] = []
    for (let c = from; c <= to; c++) {
      for (const other of columns.get(c) ?? []) {
        const first = c === Math.max(from, columnOf(other.x - other.w / 2))
        if (first && other.near >= body.near) front.push(other)
      }
    }
    if (shownWidth(body, front) < LEAST_SHOWN_PX) continue
    shown.add(body)
    for (let c = from; c <= to; c++) {
      const column = columns.get(c)
      if (column) column.push(body)
      else columns.set(c, [body])
    }
  }
  return shown
}
