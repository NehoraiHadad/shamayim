import type { FabricSite } from './fabricSlots'
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

/** The bodies in front are looked up by columns this wide (px). */
const COLUMN = 8
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

/** The roofs that stand all across strips of this many px, up to so many a strip: what stands in front, at the least. */
const STRIP = .5, HELD = 4

class Strips {
  private readonly from: number
  private readonly near: Float64Array
  private readonly top: Float64Array
  private readonly held: Uint8Array

  constructor(blocks: readonly FabricSite[]) {
    let left = 0, right = 0
    for (const { body } of blocks) { left = Math.min(left, body.x - body.w / 2); right = Math.max(right, body.x + body.w / 2) }
    this.from = Math.floor(left / STRIP)
    const strips = Math.ceil(right / STRIP) - this.from + 1
    this.near = new Float64Array(strips * HELD)
    this.top = new Float64Array(strips * HELD)
    this.held = new Uint8Array(strips)
  }

  add({ x, w, near, top }: OutsideBox) {
    const to = Math.floor((x + w / 2) / STRIP) - this.from
    for (let s = Math.ceil((x - w / 2) / STRIP) - this.from; s < to; s++) {
      const end = s * HELD + this.held[s]
      let at = end, hidden = false
      for (let i = s * HELD; i < end && !hidden; i++) {
        hidden = this.near[i] >= near && this.top[i] <= top
        if (this.near[i] <= near && this.top[i] >= top) at = i
      }
      if (hidden || at === (s + 1) * HELD) continue
      this.near[at] = near
      this.top[at] = top
      if (at === end) this.held[s]++
    }
  }

  /** At least what shows of `body` over them, counted no further than `LEAST_SHOWN_PX`. */
  mostShown(body: OutsideBox) {
    const left = body.x - body.w / 2, right = body.x + body.w / 2, { near, foot } = body
    let shown = 0
    for (let s = Math.floor(left / STRIP); s * STRIP < right && shown < LEAST_SHOWN_PX; s++) {
      const at = (s - this.from) * HELD, end = at + this.held[s - this.from]
      let roof = foot
      for (let i = at; i < end; i++) if (this.near[i] >= near && this.top[i] < roof) roof = this.top[i]
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

/** The bodies painted last first: by a number of their place and their turn (an order of numbers alone), then exactly. */
function paintedLastFirst(blocks: readonly FabricSite[]) {
  let low = Infinity, high = -Infinity
  const y = Float64Array.from(blocks, ({ body }) => rowY(body))
  for (const at of y) { low = Math.min(low, at); high = Math.max(high, at) }
  const step = high > low ? 2 ** 32 / (high - low) : 0
  const turn = y.map((at, i) => Math.floor((high - at) * step) * 2 ** 20 + i).sort()
  return Array.from(turn, n => blocks[n % 2 ** 20]).sort((a, b) => frontFirst(a.body, b.body))
}

/**
 * The blocks that show, painted last first: one drawn wider than its site is left out only where the nearer of those leave
 * less than `LEAST_SHOWN_PX` of it to be seen. Most are hidden whole strips wide, so only the rest are measured.
 */
export function shownBlocks(blocks: readonly FabricSite[]): OutsideBox[] {
  const shown: OutsideBox[] = [], strips = new Strips(blocks), columns = new Columns()
  for (const { box, body } of paintedLastFirst(blocks)) {
    if (body.w > box.w) {
      if (strips.mostShown(body) < LEAST_SHOWN_PX - 1e-6 || shownWidth(body, columns.over(body)) < LEAST_SHOWN_PX) continue
      strips.add(body)
      columns.add(body)
    }
    shown.push(body)
  }
  return shown
}
