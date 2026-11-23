import type { OutsideBox } from './outsideView'

/** Cull roofs hidden across their full screen span by nearer rows. */
export function visible(boxes: OutsideBox[], width: number): OutsideBox[] {
  const cover = new Float64Array(Math.ceil(width) + 8).fill(Infinity)
  const kept: OutsideBox[] = []
  for (const box of [...boxes].sort((a, b) => b.near - a.near)) {
    const from = Math.max(0, Math.floor(box.x - box.w / 2)), to = Math.min(cover.length, Math.ceil(box.x + box.w / 2))
    let shows = false
    for (let px = from; px < to; px++) if (box.top < cover[px] - .25) shows = true
    if (!shows) continue
    kept.push(box)
    for (let px = from; px < to; px++) cover[px] = Math.min(cover[px], box.top)
  }
  return kept
}

/** The pre-frontage footprint used to identify prominent towers. Preserve its legacy house representatives. */
export class SkylineFootprint {
  private boxes: OutsideBox[] = []
  private houses = new Map<string, { box: OutsideBox; off: number }>()

  add(box: OutsideBox, houseWidth: number, height: number) {
    if (box.w >= houseWidth) { this.boxes.push(box); return }
    // Historical representative spacing. These buckets are only used to recover the prominence footprint.
    const slotW = houseWidth * 1.1, slotH = Math.max(1.2, .6 * height)
    const x = Math.round(box.x / slotW), y = Math.round(box.foot / slotH)
    const off = Math.hypot((box.x - x * slotW) / slotW, (box.foot - y * slotH) / slotH)
    const key = `${x}:${y}`
    const held = this.houses.get(key)
    if (!held || held.off > off) this.houses.set(key, { box: { ...box, w: houseWidth }, off })
  }

  index(width: number) {
    for (const { box } of this.houses.values()) this.boxes.push(box)
    return new MassIndex(visible(this.boxes, width))
  }
}

/** Index the projected footprint, using exact widths after a column lookup. */
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
