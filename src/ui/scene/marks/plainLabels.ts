import type { Landmark, PlacedMark } from '../../../data/landmarks/types'
import { boxAround, markGeometry, overlaps, type Box } from './markBox'
import { DOT_R, textWidth, VISIBLE_BOTTOM, type Point } from './sceneLayout'

export interface PlainLabel extends Point { id: string; text: string }
export const PLAIN_LABEL_FONT = 9

export function plainLabels(marks: PlacedMark[], landmarks: Landmark[], width: number, ground: (x: number) => number,
  dot: Point, elevationLabel: Point, elevationText: string, obstacles: Box[]): PlainLabel[] {
  const names = new Map(landmarks.map(mark => [mark.id, mark.nameHe]))
  const labelHalf = textWidth(elevationText, 11) / 2
  const occupied = [...obstacles, boxAround(dot.x, dot.y, DOT_R), {
    left: elevationLabel.x - labelHalf, right: elevationLabel.x + labelHalf,
    top: elevationLabel.y, bottom: elevationLabel.y + 11,
  }]
  const labels: PlainLabel[] = []
  for (const mark of marks) {
    if (mark.layer !== 'plain') continue
    const text = names.get(mark.id)
    const x = mark.xPct / 100 * width
    const glyph = markGeometry(mark, x, ground)
    if (!text || !glyph) continue
    const half = textWidth(text, PLAIN_LABEL_FONT) / 2
    const y = glyph.box.top - 3
    const box = { left: x - half, right: x + half, top: y - 10, bottom: y + 2 }
    if (box.left < 4 || box.right > width - 4 || box.top < 22
      || box.bottom > Math.min(VISIBLE_BOTTOM, ground(box.left), ground(x), ground(box.right))
      || occupied.some(other => overlaps(box, other, 1))) continue
    occupied.push(box)
    labels.push({ id: mark.id, text, x, y })
  }
  return labels
}
