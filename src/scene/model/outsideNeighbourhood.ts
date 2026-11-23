import type { OutsideItem } from './types'

/** Compact kernel around each foot in reference scene units. The x-sorted search
 * only limits the distance checked, so crossing its boundary cannot change the shade. */
export function neighbourhood(items: readonly OutsideItem[], sx: number) {
  const boxes = items.filter(item => item.kind === 'box').sort((a, b) => a.x - b.x)
  const weights = boxes.map(box => Math.min(1, (box.foot - box.top) / 3))
  const shade = new Float64Array(boxes.length)
  const radius = 8 * sx
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]
    for (let j = i + 1; j < boxes.length; j++) {
      const other = boxes[j], dx = (other.x - box.x) / radius
      if (dx >= 1) break
      const dy = (other.foot - box.foot) / 5
      const weight = Math.max(0, 1 - dx * dx - dy * dy) ** 2
      shade[i] += weight * weights[j]
      shade[j] += weight * weights[i]
    }
    box.neighbours = 1 - Math.exp(-shade[i] / 2.6)
  }
}
