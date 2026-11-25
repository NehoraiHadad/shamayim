import type { OutsideItem } from '../../../model/types'

/**
 * A key naming an item list's geometry: the layer's form key (the place and its shape) and a checksum of every body's
 * and tree's place and size, so an answer cached by it is the same list's, whichever object holds it (a new hour gives a
 * new list of the same bodies; a list cut down for a check gives another key). Pure.
 */
export function itemsKey(items: readonly OutsideItem[], form: string): string {
  let sum = items.length
  for (const i of items) {
    const g = i.kind === 'box' ? i.x * 3 + i.w * 5 + i.foot * 7 + i.top * 11
      : i.kind === 'tower' ? i.x * 3 + i.w * 5 + i.base * 7 + i.h * 11
        : i.kind === 'tree' ? i.tree.x * 3 + i.tree.w * 5 + i.tree.base * 7 + i.tree.h * 11 : 13
    sum = (sum * 31 + Math.round(g * 64)) % 2147483647
  }
  return `${form}:${items.length}:${sum}`
}
