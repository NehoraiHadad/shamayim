import type { BackdropBoxes } from './labelBackdrop'
import { coverageRaster } from './labelCoverage'
import type { Box } from './layout'
import { SCENE_W } from './sceneBox'

export interface LabelObstacle extends Box {
  priority?: 'note' | 'mark' | 'beyond'
  fixed?: 'left' | 'center'
  overhang?: number
  viewport?: number
}

export function obstacleCoverage(region: Box, inputs: readonly LabelObstacle[], width: number) {
  const scale = width / SCENE_W
  const marks = coverageRaster(region), fabric = coverageRaster(region)
  const protectedZones: Box[] = []
  const backdrop: BackdropBoxes = { fabric: [], beyond: [] }
  const rasterLeft = Math.floor(region.left), rasterRight = Math.ceil(region.right)
  for (const o of inputs) {
    if (o.viewport !== undefined && o.viewport !== width) continue
    const anchor = o.fixed === 'center' ? (o.left + o.right) / 2 : o.left
    const shift = anchor * (scale - 1)
    const pad = o.overhang ?? 0
    const box = o.viewport !== undefined ? o : { left: (o.fixed ? o.left + shift : o.left * scale) - pad,
      right: (o.fixed ? o.right + shift : o.right * scale) + pad, top: o.top, bottom: o.bottom }
    // Protected offsets keep their sign under horizontal scaling. A fixed-left
    // note or scaled datum clear at both endpoints stays clear between them.
    // Raster coverage rounds outwards. Keep obstacles in the fractional edge cells.
    const left = o.priority === 'note' ? region.left : rasterLeft
    const right = o.priority === 'note' ? region.right : rasterRight
    if (box.right <= left || box.left >= right) continue
    if (o.priority === 'note') protectedZones.push(box)
    else if (o.priority === 'mark') marks.fill(box)
    else {
      const rank = o.priority === 'beyond' ? 'beyond' : 'fabric'
      // Clip to the tether region including its fractional edge cells, before filling either channel.
      const clipped = { left: Math.max(box.left, rasterLeft), right: Math.min(box.right, rasterRight),
        top: Math.max(box.top, Math.floor(region.top)), bottom: Math.min(box.bottom, Math.ceil(region.bottom)) }
      backdrop[rank].push(clipped)
      if (rank === 'beyond') fabric.fillBeyond(clipped)
      else fabric.fill(clipped)
    }
  }
  fabric.integrate(marks.cells)
  marks.integrate()
  return { marks, fabric, backdrop, protectedZones, scale }
}

export function columnBackdrop(boxes: BackdropBoxes, left: number, right: number): BackdropBoxes {
  const clip = (items: Box[]) => items.flatMap(box => box.left < right && box.right > left
    ? [{ ...box, left: Math.max(box.left, left), right: Math.min(box.right, right) }] : [])
  return { fabric: clip(boxes.fabric), beyond: clip(boxes.beyond) }
}
