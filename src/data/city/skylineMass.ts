import type { SiteBox } from './fabricSlots'

/** Near to far: a box whose top is under the nearer boxes' tops all across it is hidden. */
export function visible<B extends SiteBox>(boxes: readonly B[], width: number): B[] {
  const cover = new Float64Array(Math.ceil(width) + 8).fill(Infinity)
  const kept: B[] = []
  for (const box of [...boxes].sort((a, b) => b.near - a.near)) {
    const from = Math.max(0, Math.floor(box.x - box.w / 2)), to = Math.min(cover.length, Math.ceil(box.x + box.w / 2))
    let shown = from
    while (shown < to && !(box.top < cover[shown] - .25)) shown++
    if (shown >= to) continue
    kept.push(box)
    for (let px = from; px < to; px++) if (box.top < cover[px]) cover[px] = box.top
  }
  return kept
}

/** The mass's top at x (the highest box over it), boxes bucketed by the px columns they span (the same answer, faster). */
export class MassIndex {
  private columns = new Map<number, SiteBox[]>()
  constructor(boxes: readonly SiteBox[]) { for (const box of boxes) this.add(box) }
  add(box: SiteBox) {
    for (let px = Math.floor(box.x - box.w / 2); px <= Math.floor(box.x + box.w / 2); px++) {
      const list = this.columns.get(px)
      if (list) list.push(box)
      else this.columns.set(px, [box])
    }
  }
  top(x: number) {
    let top = Infinity
    for (const box of this.columns.get(Math.floor(x)) ?? []) if (Math.abs(box.x - x) <= box.w / 2) top = Math.min(top, box.top)
    return top
  }
}
