import type { OutsideBox } from './outsideView'

/** Near to far (a row's bodies by their place in it): a box whose top is under the nearer boxes' tops all across it is hidden. */
export function visible(boxes: readonly OutsideBox[], width: number): OutsideBox[] {
  const cover = new Float64Array(Math.ceil(width) + 8).fill(Infinity)
  const kept: OutsideBox[] = []
  for (const box of [...boxes].sort((a, b) => b.near - a.near || b.x - a.x || (a.seed ?? 0) - (b.seed ?? 0))) {
    const from = Math.max(0, Math.floor(box.x - box.w / 2)), to = Math.min(cover.length, Math.ceil(box.x + box.w / 2))
    let shows = false
    for (let px = from; px < to; px++) if (box.top < cover[px] - .25) shows = true
    if (!shows) continue
    kept.push(box)
    for (let px = from; px < to; px++) cover[px] = Math.min(cover[px], box.top)
  }
  return kept
}

/** The mass's top at x (the highest box over it), boxes bucketed by the px columns they span (the same answer, faster). */
export class MassIndex {
  private columns = new Map<number, OutsideBox[]>()
  constructor(boxes: readonly OutsideBox[]) { for (const box of boxes) this.add(box) }
  add(box: OutsideBox) {
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
