import { noteBoxes, type SceneNote } from '../data/terrain/sceneNotes'
import { DOT_R, LABEL_H, VISIBLE_BOTTOM, type Box, type Point } from './layout'
import { SCENE_W } from './sceneBox'
import { heightLabelBox } from './sceneClearance'
import { coverageRaster } from './labelCoverage'

export interface LabelObstacle extends Box {
  priority?: 'note' | 'mark'
  fixed?: 'left' | 'center'
  overhang?: number
}

// CSS-pixel inset and the brief's 34 px tether measured from the dot's rim.
const INSET = 2
const REACH = DOT_R + 34
const WIDTHS = [320, SCENE_W, 520] as const
const square = (n: number) => n * n

function coverage(region: Box, inputs: readonly LabelObstacle[], scale: number, reference: number) {
  const marks = coverageRaster(region), fabric = coverageRaster(region)
  const protectedZones: Box[] = []
  const zoom = scale * reference
  for (const o of inputs) {
    const anchor = o.fixed === 'center' ? (o.left + o.right) / 2 : o.left
    const shift = anchor * (zoom - 1)
    const pad = o.overhang ?? 0
    const box = { left: (o.fixed ? o.left + shift : o.left * zoom) - pad,
      right: (o.fixed ? o.right + shift : o.right * zoom) + pad, top: o.top, bottom: o.bottom }
    // Protected offsets keep their sign under horizontal scaling. A fixed-left
    // note or scaled datum clear at both endpoints stays clear between them.
    if (o.priority === 'note') {
      if (box.right > region.left && box.left < region.right
        && box.bottom > region.top && box.top < region.bottom) protectedZones.push(box)
    } else (o.priority === 'mark' ? marks : fabric).fill(box)
  }
  fabric.integrate(marks.cells)
  marks.integrate()
  return { marks, fabric, protectedZones, scale }
}

/** Badge width W and height H bound each of six rasters by
 * (ceil(2×REACH + 2W)+1) × (ceil(2×REACH + 2H)+1) cells, plus a prefix border.
 * At most (floor((2×REACH + W)/(520/375))+1) × (floor(2×REACH + H)+1)
 * lattice points need up to six four-read sums and intersections with local protected zones.
 */
export function besideDot(dot: Point, text: string, width: number, obstacles: readonly LabelObstacle[],
  notes: readonly SceneNote[] = []) {
  const reference = SCENE_W / width, center = dot.x * reference
  const inputs = [...obstacles, ...noteBoxes(notes).map(box => ({
    ...box, priority: 'note' as const, fixed: 'left' as const,
  }))]
  const badge = heightLabelBox({ x: 0, y: 0, text, below: false, backed: true }, SCENE_W)
  const half = badge.w / 2, pad = -badge.y, foot = badge.y + badge.h
  const narrow = WIDTHS[0] / SCENE_W, wide = WIDTHS[2] / SCENE_W
  const span = (half + REACH) / wide
  const left = Math.ceil(Math.max((INSET + half) / narrow - center, -span))
  const right = Math.floor(Math.min(SCENE_W - (INSET + half) / narrow - center, span))
  const top = Math.ceil(Math.max(INSET + pad - dot.y, -REACH - foot))
  const bottom = Math.floor(Math.min(VISIBLE_BOTTOM - INSET - foot - dot.y, REACH + pad))
  if (left > right || top > bottom) return null

  const scales = WIDTHS.map(width => {
    const scale = width / SCENE_W
    const region = { left: (center + left) * scale - half, right: (center + right) * scale + half,
      top: dot.y + top - pad, bottom: dot.y + bottom + foot }
    return coverage(region, inputs, scale, reference)
  })
  const rows = Array.from({ length: bottom - top + 1 }, (_, i) => {
    const offset = i + top
    const y = dot.y + offset, upper = y - pad, lower = y + foot
    return { y, upper, lower, gap: square(Math.max(upper - dot.y, dot.y - lower, 0)),
      distance: square(offset + LABEL_H / 2),
      bounds: scales.map(({ marks }) => [marks.top(upper), marks.bottom(lower)] as const) }
  }).sort((a, b) => a.distance - b.distance)
  const offsets = Array.from({ length: right - left + 1 }, (_, i) => left + i)
    .sort((a, b) => Math.abs(a) - Math.abs(b))
  let bestX = center, bestY = dot.y
  let bestNotes = Infinity, bestMarks = Infinity, bestFabric = Infinity, bestDistance = Infinity
  const clearance = square(DOT_R + INSET), tether = square(REACH)
  for (const offset of offsets) {
    const x = center + offset, dx = Math.abs(offset)
    // Once all coverage is zero, farther rows and columns cannot improve the score.
    const dx2 = square(dx)
    if (bestNotes === 0 && bestMarks === 0 && bestFabric === 0 && dx2 + rows[0].distance >= bestDistance) break
    const near = square(Math.max(0, dx * narrow - half))
    const far = square(Math.max(0, dx * wide - half))
    const columns = scales.map(({ scale, marks, protectedZones }) => {
      const l = x * scale - half, r = x * scale + half
      const zones = protectedZones.flatMap(n => {
        const overlap = Math.min(r, n.right) - Math.max(l, n.left)
        return overlap > 0 ? [{ top: n.top, bottom: n.bottom, overlap }] : []
      })
      return { left: marks.left(l), right: marks.right(r), zones }
    })
    for (const row of rows) {
      const distance = dx2 + row.distance
      if (bestNotes === 0 && bestMarks === 0 && bestFabric === 0 && distance >= bestDistance) break
      if (near + row.gap < clearance || far + row.gap > tether) continue
      let note = 0, marks = 0, fabric = 0
      for (let i = 0; i < scales.length; i++) {
        const s = scales[i], c = columns[i], b = row.bounds[i]
        let overlap = 0
        for (const n of c.zones) {
          overlap += n.overlap * Math.max(0, Math.min(row.lower, n.bottom) - Math.max(row.upper, n.top))
        }
        note = Math.max(note, overlap)
        marks = Math.max(marks, s.marks.area(c.left, c.right, b[0], b[1]))
        fabric = Math.max(fabric, s.fabric.area(c.left, c.right, b[0], b[1]))
      }
      if (note > bestNotes || (note === bestNotes && (marks > bestMarks
        || (marks === bestMarks && (fabric > bestFabric
        || (fabric === bestFabric && distance >= bestDistance)))))) continue
      bestX = x
      bestY = row.y
      bestNotes = note
      bestMarks = marks
      bestFabric = fabric
      bestDistance = distance
    }
  }
  return bestDistance === Infinity ? null : {
    x: bestX, y: bestY, notes: bestNotes, marks: bestMarks, fabric: bestFabric,
  }
}
