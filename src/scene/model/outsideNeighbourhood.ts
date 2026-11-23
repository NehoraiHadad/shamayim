//# allFunctionsCalledOnLoad
import type { OutsideItem } from './types'

/** Compact kernel around each foot in reference scene units. Evaluate each
 * symmetric pair once, adding contributions in ascending x order for both feet. */
export function neighbourhood(items: readonly OutsideItem[], sx: number) {
  const boxes = items.filter(item => item.kind === 'box').sort((a, b) => a.x - b.x)
  const weights = boxes.map(box => Math.min(1, (box.foot - box.top) / 3))
  const shade = new Float64Array(boxes.length)
  const radius = 8 * sx, inverseRadius = 1 / radius
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]
    const { x, foot } = box
    const ownWeight = weights[i]
    let sum = shade[i]
    for (let j = i + 1; j < boxes.length; j++) {
      const other = boxes[j], gap = other.x - x
      if (gap >= radius) break
      const dy = (other.foot - foot) * .2
      const dySquared = dy * dy
      if (dySquared >= 1) continue // The vertical term alone is outside the compact kernel.
      const dx = gap * inverseRadius
      const weight = 1 - dx * dx - dySquared
      if (!(weight > 0)) continue
      const influence = weight * weight
      sum += influence * weights[j]
      shade[j] += influence * ownWeight
    }
    box.neighbours = 1 - Math.exp(-sum / 2.6)
  }
}
