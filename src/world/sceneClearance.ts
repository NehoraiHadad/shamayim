import { DOT_R, LETTER_H, letterWidth, type Point } from './layout'
import { SCENE_W } from './sceneBox'
import type { WorldLabels } from './types'

export interface ScreenBox { x: number; y: number; w: number; h: number }

/** The letters stay the same size in screen px as they move with the viewport. */
export function heightLabelBox({ text, x, y }: Pick<WorldLabels['height'], 'text' | 'x' | 'y'>, width: number): ScreenBox {
  const w = letterWidth(text)
  return { x: x * (width / SCENE_W) - w / 2, y, w, h: LETTER_H }
}

export function noteClearance(notes: WorldLabels['notes'], width: number): ScreenBox[] {
  const sx = width / SCENE_W
  return notes.map((note) => ({ x: note.left * sx, y: note.top, w: note.width, h: note.height }))
}

/** Nothing of the town is drawn over the spot and the notes; the height stands over the roofs and takes no room from them. */
export function sceneClearance({ notes }: Pick<WorldLabels, 'notes'>, dot: Point, width: number): ScreenBox[] {
  const x = dot.x * (width / SCENE_W)
  return [{ x: x - DOT_R, y: dot.y - DOT_R, w: 2 * DOT_R, h: 2 * DOT_R }, ...noteClearance(notes, width)]
}

export const hits = (clear: readonly ScreenBox[], left: number, top: number, right: number, bottom: number) =>
  clear.some((b) => left < b.x + b.w && right > b.x && top < b.y + b.h && bottom > b.y)
