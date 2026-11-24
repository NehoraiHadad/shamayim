import type { FabricSite, SiteBox } from './fabricSlots'
import { highestFirst } from './numberOrder'

/** Where a body comes in its row's painting (far first): its foot, and its depth where feet are level. */
export const rowY = (box: Pick<SiteBox, 'foot' | 'near'>) => box.foot - .001 * box.near
/** Blocks painted last first (`rowY`), level ones by where they stand: the same for any order they come in. */
const beside = (a: FabricSite, b: FabricSite) => a.x - b.x || a.cell.seed - b.cell.seed

/**
 * The least of itself a body must show: this many px of its width with a whole px of wall over what stands in front (a
 * lower strip counts by its share of a px, so a sliver beside a wall and one over a roof are measured alike). It is the
 * narrowest body the painters draw as a building (`LEAST_W` in `drawn/townBlocks.ts`; the photographic one has no window
 * under 1.6): less of one reads as a spike or a bright line.
 */
export const LEAST_SHOWN_PX = 2.2

/** The bodies in front are looked up by columns this wide (px). */
const COLUMN = 4
/** The bounds of what shows are taken only this far (px) from the limit, so their rounding never decides. */
const SLACK = 1e-6
const NONE: SiteBox[] = []

const rise = (body: SiteBox, roof: number) => Math.min(1, Math.max(0, Math.min(roof, body.foot) - body.top))

/** The px of width over which `body` shows a whole px of wall over the bodies in front (their true spans and roofs). */
export function shownWidth(body: SiteBox, front: readonly SiteBox[]) {
  // The highest roof in front decides at each px, so they are laid highest first on what is still open behind them.
  const roofs = [...front].sort((a, b) => a.top - b.top)
  let open: [number, number][] = [[body.x - body.w / 2, body.x + body.w / 2]], shown = 0
  for (const f of roofs) {
    const left = f.x - f.w / 2, right = f.x + f.w / 2, roof = rise(body, f.top), behind: [number, number][] = []
    for (const span of open) {
      const [from, to] = span, start = Math.max(from, left), end = Math.min(to, right)
      if (start >= end) { behind.push(span); continue }
      shown += (end - start) * roof
      if (from < start) behind.push([from, start])
      if (end < to) behind.push([end, to])
    }
    open = behind
    if (!open.length) break
  }
  for (const [from, to] of open) shown += (to - from) * rise(body, body.foot)
  return shown
}

/** The bodies in front by strips of this many px: the highest roof all across each, and the highest over any of it. */
const STRIP = .5

class Strips {
  private readonly from: number
  private readonly across: Float64Array
  private readonly near: Float64Array
  private readonly over: Float64Array

  constructor(bodies: readonly SiteBox[]) {
    let left = Infinity, right = -Infinity
    for (const { x, w } of bodies) { left = Math.min(left, x - w / 2); right = Math.max(right, x + w / 2) }
    this.from = Math.floor(left / STRIP)
    const n = bodies.length ? Math.floor(right / STRIP) - this.from + 1 : 0
    this.across = new Float64Array(n).fill(Infinity)
    this.near = new Float64Array(n).fill(-Infinity)
    this.over = new Float64Array(n).fill(Infinity)
  }

  add({ x, w, top, near }: SiteBox) {
    const left = x - w / 2, right = x + w / 2
    for (let s = Math.floor(left / STRIP); s * STRIP <= right; s++) {
      const i = s - this.from
      if (top < this.over[i]) this.over[i] = top
      if (top < this.across[i] && s * STRIP >= left && (s + 1) * STRIP <= right) { this.across[i] = top; this.near[i] = near }
    }
  }

  /** Whether `LEAST_SHOWN_PX` of `body` show over them, where what they take at the least or at the most settles it. */
  shows(body: SiteBox): boolean | undefined {
    const left = body.x - body.w / 2, right = body.x + body.w / 2
    let least = 0, most = 0
    for (let s = Math.floor(left / STRIP); s * STRIP < right && least <= LEAST_SHOWN_PX + SLACK; s++) {
      const i = s - this.from, px = Math.min(right, (s + 1) * STRIP) - Math.max(left, s * STRIP)
      least += px * rise(body, this.over[i])
      most += px * rise(body, this.near[i] >= body.near ? this.across[i] : body.foot)
    }
    return least > LEAST_SHOWN_PX + SLACK ? true : most < LEAST_SHOWN_PX - SLACK ? false : undefined
  }
}

/** The bodies by column, and those of them that take something of another, none farther than it (a roof a px or more under its own takes nothing). */
class Columns {
  private readonly columns = new Map<number, SiteBox[]>()

  add(body: SiteBox) {
    for (let c = Math.floor((body.x - body.w / 2) / COLUMN); c <= Math.floor((body.x + body.w / 2) / COLUMN); c++) {
      const column = this.columns.get(c)
      if (column) column.push(body)
      else this.columns.set(c, [body])
    }
  }

  over(body: SiteBox) {
    const left = body.x - body.w / 2, right = body.x + body.w / 2, over: SiteBox[] = []
    const from = Math.floor(left / COLUMN), to = Math.floor(right / COLUMN)
    for (let c = from; c <= to; c++) {
      for (const f of this.columns.get(c) ?? NONE) {
        if (f.near < body.near || f.top >= body.top + 1 || f.x + f.w / 2 <= left || f.x - f.w / 2 >= right) continue
        if (c === Math.max(from, Math.floor((f.x - f.w / 2) / COLUMN))) over.push(f)
      }
    }
    return over
  }
}

/**
 * The blocks that show, painted last first: one drawn wider than its site is left out only where the nearer of those leave
 * less than `LEAST_SHOWN_PX` of it to be seen. The strips settle most of them, so only the rest are measured.
 */
export function shownBlocks(blocks: readonly FabricSite[]): FabricSite[] {
  const shown: FabricSite[] = [], strips = new Strips(blocks), columns = new Columns()
  for (const body of highestFirst(blocks, blocks.map(rowY), beside)) {
    if (body.w > body.siteW) {
      if (!(strips.shows(body) ?? shownWidth(body, columns.over(body)) >= LEAST_SHOWN_PX)) continue
      strips.add(body)
      columns.add(body)
    }
    shown.push(body)
  }
  return shown
}
