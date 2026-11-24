import type { FabricSite } from './fabricSlots'
import { highestFirst } from './numberOrder'
import type { OutsideBox } from './outsideView'

/** Where a body comes in its row's painting (far first): its foot, and its depth where feet are level. */
export const rowY = (box: OutsideBox) => box.foot - .001 * box.near
/** Blocks painted last first (`rowY`), level ones by where they stand: the same for any order they come in. */
const siteRowY = ({ body }: FabricSite) => rowY(body)
const beside = ({ body: a }: FabricSite, { body: b }: FabricSite) => a.x - b.x || (a.seed ?? 0) - (b.seed ?? 0)

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
const NONE: OutsideBox[] = []

const rise = (body: OutsideBox, roof: number) => Math.min(1, Math.max(0, Math.min(roof, body.foot) - body.top))

/** The px of width over which `body` shows a whole px of wall over the bodies in front (their true spans and roofs). */
export function shownWidth(body: OutsideBox, front: readonly OutsideBox[]) {
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

/** By strips of this many px, the highest roof that stands all across each: what stands in front, at the least. */
const STRIP = 1

class Strips {
  private readonly roofs = new Map<number, OutsideBox>()

  add(body: OutsideBox) {
    const to = Math.floor((body.x + body.w / 2) / STRIP)
    for (let s = Math.ceil((body.x - body.w / 2) / STRIP); s < to; s++) {
      const held = this.roofs.get(s)
      if (!held || body.top < held.top) this.roofs.set(s, body)
    }
  }

  /** No more than this shows of `body` over them, counted no further than `LEAST_SHOWN_PX`. */
  mostShown(body: OutsideBox) {
    const left = body.x - body.w / 2, right = body.x + body.w / 2
    let shown = 0
    for (let s = Math.floor(left / STRIP); s * STRIP < right && shown < LEAST_SHOWN_PX; s++) {
      const held = this.roofs.get(s)
      const roof = held && held.near >= body.near ? held.top : body.foot
      shown += (Math.min(right, (s + 1) * STRIP) - Math.max(left, s * STRIP)) * rise(body, roof)
    }
    return shown
  }
}

/** The bodies by column, and those of them that take something of another, none farther than it (a roof a px or more under its own takes nothing). */
class Columns {
  private readonly columns = new Map<number, OutsideBox[]>()

  add(body: OutsideBox) {
    for (let c = Math.floor((body.x - body.w / 2) / COLUMN); c <= Math.floor((body.x + body.w / 2) / COLUMN); c++) {
      const column = this.columns.get(c)
      if (column) column.push(body)
      else this.columns.set(c, [body])
    }
  }

  over(body: OutsideBox) {
    const left = body.x - body.w / 2, right = body.x + body.w / 2, over: OutsideBox[] = []
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

/** No less than this shows of `body` over `front`: what each takes of it, as if none stood before another. */
function leastShown(body: OutsideBox, front: readonly OutsideBox[]) {
  const left = body.x - body.w / 2, right = body.x + body.w / 2, whole = rise(body, body.foot)
  let shown = body.w * whole
  for (const f of front) shown -= (Math.min(right, f.x + f.w / 2) - Math.max(left, f.x - f.w / 2)) * (whole - rise(body, f.top))
  return shown
}

/** Whether `LEAST_SHOWN_PX` of `body` show over `front`: measured only where the least that can show is less. */
const shows = (body: OutsideBox, front: readonly OutsideBox[]) =>
  leastShown(body, front) > LEAST_SHOWN_PX + SLACK || shownWidth(body, front) >= LEAST_SHOWN_PX

/**
 * The blocks that show, painted last first: one drawn wider than its site is left out only where the nearer of those leave
 * less than `LEAST_SHOWN_PX` of it to be seen. Most are hidden whole strips wide, so only the rest are measured.
 */
export function shownBlocks(blocks: readonly FabricSite[]): OutsideBox[] {
  const shown: OutsideBox[] = [], strips = new Strips(), columns = new Columns()
  for (const { box, body } of highestFirst(blocks, siteRowY, beside)) {
    if (body.w > box.w) {
      if (strips.mostShown(body) < LEAST_SHOWN_PX - SLACK || !shows(body, columns.over(body))) continue
      strips.add(body)
      columns.add(body)
    }
    shown.push(body)
  }
  return shown
}
