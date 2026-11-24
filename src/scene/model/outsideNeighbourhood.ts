import { N } from '../../data/city/tune.tmp'
import type { OutsideItem } from './types'

/** Compact kernel around each foot in reference scene units. The x-sorted search
 * only limits the distance checked, so crossing its boundary cannot change the shade. */
export function neighbourhood(items: readonly OutsideItem[], sx: number) {
  const boxes = items.filter(item => item.kind === 'box').sort((a, b) => a.x - b.x)
  const weights = boxes.map(box => Math.min(1, (box.foot - box.top) / 3) * (N('enc') && !box.roof ? Math.max(1, box.w / (N('enc') === 2 ? 2.5 : 5)) : 1))
  const shade = new Float64Array(boxes.length)
  const radius = 8 * sx, inverseRadius = 1 / radius
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]
    for (let j = i + 1; j < boxes.length; j++) {
      const other = boxes[j], gap = other.x - box.x
      if (gap >= radius) break
      const dx = gap * inverseRadius, dy = (other.foot - box.foot) * .2
      const weight = 1 - dx * dx - dy * dy
      if (weight <= 0) continue
      const influence = weight * weight
      shade[i] += influence * weights[j]
      shade[j] += influence * weights[i]
    }
    box.neighbours = 1 - Math.exp(-shade[i] / 2.6)
  }
}
