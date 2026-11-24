import { DOT_R, LABEL_H, LABEL_PX, overlaps, VISIBLE_BOTTOM, type Box, type Point } from './layout'
import { BACKING_PAD } from './sceneClearance'
import { coveredArea } from './heightLabel'

// Frozen HEAD placement: same candidate order, width estimate, and scoring. The
// caller uses the actual font width to measure what the badge painted there.
export function headHeightSpot(dot: Point, text: string, width: number, obstacles: readonly Box[]) {
  const w = text.replace(/[\u2066-\u2069]/g, '').length * LABEL_PX * .5 + 1
  const off = DOT_R + 2 + BACKING_PAD + w / 2
  const level = dot.y - LABEL_H / 2
  const tries = [...[0, -2, 2, -4, 4, -6, 6, -9, 9].map(d => [d, 0]),
    ...[4, 8, 14].flatMap(o => [0, -4, 4].map(d => [d, o])),
    ...[-12, 12, -15, 15].map(d => [d, 0])]
  const top = VISIBLE_BOTTOM - 1 - LABEL_H - BACKING_PAD
  let least = { x: dot.x + off, y: Math.min(top, level), cover: Infinity }
  for (const [dy, out] of tries) {
    for (const side of [1, -1]) {
      const x = dot.x + side * (off + out), y = Math.min(top, level + dy)
      const box = { left: x - w / 2 - BACKING_PAD, right: x + w / 2 + BACKING_PAD,
        top: y - BACKING_PAD, bottom: y + LABEL_H + BACKING_PAD }
      if (box.left < 2 || box.right > width - 2) continue
      const cover = obstacles.reduce((sum, obstacle) => sum + coveredArea(box, obstacle), 0)
      if (cover === 0 && obstacles.every(o => !overlaps(box, o, .5))) return { x, y }
      if (cover < least.cover) least = { x, y, cover }
    }
  }
  return { x: least.x, y: least.y }
}
