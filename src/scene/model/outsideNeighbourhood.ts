import type { OutsideItem } from './types'

/** Compact kernel around each foot in reference scene units. The x-sorted search
 * only limits the distance checked, so crossing its boundary cannot change the shade. */
export function neighbourhood(items: readonly OutsideItem[], sx: number) {
  const boxes = items.filter(item => item.kind === 'box').sort((a, b) => a.x - b.x)
  for (const [i, box] of boxes.entries()) {
    let shade = 0
    for (const step of [-1, 1]) {
      for (let j = i + step; j >= 0 && j < boxes.length; j += step) {
        const other = boxes[j], dx = (other.x - box.x) / (8 * sx)
        if (Math.abs(dx) >= 1) break
        const dy = (other.foot - box.foot) / 5
        const weight = Math.max(0, 1 - dx * dx - dy * dy)
        shade += weight * weight * Math.min(1, (other.foot - other.top) / 3)
      }
    }
    box.neighbours = 1 - Math.exp(-shade / 2.6)
  }
}
