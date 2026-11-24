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

/** The bodies in front are looked up by columns this wide (px), and the roofs that stand all across a strip by strips this wide. */
const COLUMN = 8, STRIP = .5
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

/** What stands in front: the bodies by column, and by strip the roofs all across it that no nearer one overtops. */
class Front {
  private columns = new Map<number, OutsideBox[]>()
  private strips = new Map<number, OutsideBox[]>()

  add(body: OutsideBox) {
    const left = body.x - body.w / 2, right = body.x + body.w / 2
    for (let c = Math.floor(left / COLUMN); c <= Math.floor(right / COLUMN); c++) {
      const column = this.columns.get(c)
      if (column) column.push(body)
      else this.columns.set(c, [body])
    }
    for (let s = Math.ceil(left / STRIP); s < Math.floor(right / STRIP); s++) {
      const strip = this.strips.get(s) ?? NONE
      if (strip.some(f => f.near >= body.near && f.top <= body.top)) continue
      this.strips.set(s, [...strip.filter(f => f.near > body.near || f.top < body.top), body])
    }
  }

  /** At least what shows of `body` over them (up to `LEAST_SHOWN_PX`): the roofs that end inside a strip count for nothing there. */
  mostShown(body: OutsideBox) {
    const left = body.x - body.w / 2, right = body.x + body.w / 2
    let shown = 0
    for (let s = Math.floor(left / STRIP); s * STRIP < right && shown < LEAST_SHOWN_PX; s++) {
      let roof = body.foot
      for (const f of this.strips.get(s) ?? NONE) if (f.near >= body.near && f.top < roof) roof = f.top
      shown += (Math.min(right, (s + 1) * STRIP) - Math.max(left, s * STRIP)) * rise(body, roof)
    }
    return shown
  }

  /** Those no farther than `body` that take something of it: a roof a px or more under its own takes nothing. */
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

/**
 * The blocks that show, painted last first: one drawn wider than its site is left out only where the nearer of those leave
 * less than `LEAST_SHOWN_PX` of it to be seen. Most are hidden whole strips wide, so only the rest are measured.
 */
export function shownBlocks(blocks: readonly FabricSite[]): OutsideBox[] {
  const shown: OutsideBox[] = [], front = new Front()
  for (const { box, body } of [...blocks].sort((a, b) => frontFirst(a.body, b.body))) {
    if (body.w > box.w) {
      if (front.mostShown(body) < LEAST_SHOWN_PX - 1e-6 || shownWidth(body, front.over(body)) < LEAST_SHOWN_PX) continue
      front.add(body)
    }
    shown.push(body)
  }
  return shown
}
