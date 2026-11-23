import type { OutsideItem } from './types'

/** Nearby projected walls close off the sky from a box's foot. Count the solids in fixed scene-space bins
 * at its street level. This footprint proxy stays fixed through a scrub and has no per-city parameters. */
export function neighbourhood(items: readonly OutsideItem[]) {
  const cells = new Map<number, number>(), size = 5
  const at = (x: number, y: number) => y * 4096 + x
  for (const box of items) {
    if (box.kind !== 'box') continue
    const y = Math.floor(box.foot / size), x = Math.floor(box.x / size), key = at(x, y)
    cells.set(key, (cells.get(key) ?? 0) + 1)
  }
  for (const box of items) {
    if (box.kind !== 'box') continue
    const y = Math.floor(box.foot / size), x = Math.floor(box.x / size)
    const local = (cells.get(at(x, y)) ?? 1) - 1
    const sides = (cells.get(at(x - 1, y)) ?? 0) + (cells.get(at(x + 1, y)) ?? 0)
    const street = cells.get(at(x, y + 1)) ?? 0
    box.neighbours = Math.min(1, (local + .5 * sides + .8 * street) / 3)
  }
}
