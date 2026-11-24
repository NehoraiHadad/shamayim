import { DOT_R, LABEL_H, VISIBLE_BOTTOM, type Box, type Point } from './layout'
import { SCENE_W } from './sceneBox'
import { heightLabelBox } from './sceneClearance'
import { beyondArea, fabricArea } from './labelCoverage'
import { columnBackdrop, obstacleCoverage } from './labelObstacleCoverage'
import { backdropSteps, hasVisibleContact, type BackdropBoxes } from './labelBackdrop'

export interface LabelObstacle extends Box {
  priority?: 'note' | 'mark' | 'beyond'
  fixed?: 'left' | 'center'
  overhang?: number
  viewport?: number
}

// CSS-pixel inset and the brief's 34 px tether measured from the dot's rim.
const INSET = 2
const REACH = DOT_R + 34
export const LABEL_WIDTHS = [320, SCENE_W, 520] as const
const square = (n: number) => n * n
// Subpixel precision for note intersections in square pixels.
const NOTE_PRECISION = 1e6

export function besideDot(dot: Point, text: string, obstacles: readonly LabelObstacle[]) {
  const center = dot.x
  const badge = heightLabelBox({ x: 0, y: 0, text, below: false, backed: true }, SCENE_W)
  const half = badge.w / 2, pad = -badge.y, foot = badge.y + badge.h
  const narrow = LABEL_WIDTHS[0] / SCENE_W, wide = LABEL_WIDTHS[2] / SCENE_W
  const span = (half + REACH) / wide
  const left = Math.ceil(Math.max((INSET + half) / narrow - center, -span))
  const right = Math.floor(Math.min(SCENE_W - (INSET + half) / narrow - center, span))
  const top = Math.ceil(Math.max(INSET + pad - dot.y, -REACH - foot))
  const bottom = Math.floor(Math.min(VISIBLE_BOTTOM - INSET - foot - dot.y, REACH + pad))
  if (left > right || top > bottom) return null

  const regionTop = dot.y + top - pad, regionBottom = dot.y + bottom + foot
  const rasterTop = Math.floor(regionTop), rasterBottom = Math.ceil(regionBottom)
  const localInputs = obstacles.filter(o => o.priority === 'note'
    ? o.bottom > regionTop && o.top < regionBottom : o.bottom > rasterTop && o.top < rasterBottom)
  const scales = LABEL_WIDTHS.map(width => {
    const scale = width / SCENE_W
    const region = { left: (center + left) * scale - half, right: (center + right) * scale + half,
      top: regionTop, bottom: regionBottom }
    return obstacleCoverage(region, localInputs, width)
  })
  const hasBeyond = scales.some(s => s.fabric.hasBeyond)
  const rows = Array.from({ length: bottom - top + 1 }, (_, i) => {
    const offset = i + top
    const y = dot.y + offset, upper = y - pad, lower = y + foot
    const gap = Math.max(upper - dot.y, dot.y - lower, 0)
    return { y, upper, lower, gap, gap2: square(gap),
      preference: square(offset + LABEL_H / 2),
      bounds: scales.map(({ marks }) => [marks.top(upper), marks.bottom(lower)] as const) }
  }).sort((a, b) => a.gap - b.gap || a.preference - b.preference)
  const offsets = Array.from({ length: right - left + 1 }, (_, i) => left + i)
    .sort((a, b) => Math.abs(a) - Math.abs(b))
  // Rank notes and datum, marks, own fabric, beyond, then distance.
  let bestX = center, bestY = dot.y
  let bestNotes = Infinity, bestMarks = Infinity, bestFabric = Infinity, bestBeyond = Infinity, bestDistance = Infinity
  const clearance = square(DOT_R + INSET), tether = square(REACH)
  for (const offset of offsets) {
    const x = center + offset, dx = Math.abs(offset)
    // Once all coverage is zero, farther rows and columns cannot improve the score.
    // At reference width, add one pixel per pixel of centre offset with no dead zone.
    const gapX = square(Math.max(0, dx - half))
    const distanceTo = (gap: number) => dx + (gapX === 0 ? gap : Math.sqrt(gapX + square(gap)))
    if (bestNotes === 0 && bestMarks === 0 && bestFabric === 0 && bestBeyond === 0 && distanceTo(rows[0].gap) >= bestDistance) break
    const near = square(Math.max(0, dx * narrow - half))
    const far = square(Math.max(0, dx * wide - half))
    const columns = scales.map(({ scale, marks, backdrop, protectedZones }) => {
      const l = x * scale - half, r = x * scale + half
      const zones = protectedZones.flatMap(n => {
        const overlap = Math.min(r, n.right) - Math.max(l, n.left)
        return overlap > 0 ? [{ top: n.top, bottom: n.bottom, overlap }] : []
      })
      let clipped: BackdropBoxes | undefined
      return { left: marks.left(l), right: marks.right(r), zones,
        backdrop: () => clipped ??= columnBackdrop(backdrop, l, r) }
    })
    for (const row of rows) {
      const distance = distanceTo(row.gap)
      if (bestNotes === 0 && bestMarks === 0 && bestFabric === 0 && bestBeyond === 0 && distance >= bestDistance) break
      if (near + row.gap2 < clearance || far + row.gap2 > tether) continue
      let note = 0, marks = 0, fabric = 0, beyond = 0
      for (let i = 0; i < scales.length; i++) {
        const s = scales[i], c = columns[i], b = row.bounds[i]
        let overlap = 0
        for (const n of c.zones) {
          overlap += n.overlap * Math.max(0, Math.min(row.lower, n.bottom) - Math.max(row.upper, n.top))
        }
        note = Math.max(note, overlap)
        marks = Math.max(marks, s.marks.area(c.left, c.right, b[0], b[1]))
        const backdrop = s.fabric.area(c.left, c.right, b[0], b[1])
        fabric = Math.max(fabric, (hasBeyond ? fabricArea(backdrop) : backdrop) / s.scale)
        if (hasBeyond) beyond = Math.max(beyond, beyondArea(backdrop) / s.scale)
      }
      note = Math.round(note * NOTE_PRECISION) / NOTE_PRECISION
      fabric = backdropSteps(fabric)
      const foreground = note - bestNotes || marks - bestMarks
      if (foreground > 0 || (foreground === 0 && bestFabric === 0 && bestBeyond === 0 && distance >= bestDistance)) continue
      const visible = (rank: keyof BackdropBoxes) => columns.some((c, i) => hasVisibleContact(c.backdrop()[rank], row.upper, row.lower, scales[i].scale))
      if (fabric && !visible('fabric')) fabric = 0
      const primary = foreground || fabric - bestFabric
      if (primary > 0) continue
      beyond = backdropSteps(beyond)
      if (beyond && !visible('beyond')) beyond = 0
      if (primary === 0 && (beyond > bestBeyond || (beyond === bestBeyond && distance >= bestDistance))) continue
      bestX = x
      bestY = row.y
      bestNotes = note
      bestMarks = marks
      bestFabric = fabric
      bestBeyond = beyond
      bestDistance = distance
    }
  }
  return bestDistance === Infinity ? null : {
    x: bestX, y: bestY, notes: bestNotes, marks: bestMarks, fabric: bestFabric,
    beyond: bestBeyond,
    rasterCells: scales.reduce((sum, { marks, fabric }) => sum + marks.cells.length + fabric.cells.length, 0),
  }
}
