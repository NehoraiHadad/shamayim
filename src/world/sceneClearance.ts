import { DOT_R, LETTER_H, letterWidth, type Point } from './layout'
import { SCENE_W } from './sceneBox'
import type { WorldLabels } from './types'

export interface ScreenBox { x: number; y: number; w: number; h: number }

/** The letters stay the same size in screen px as they move with the viewport. */
export function heightLabelBox({ text, x, y }: Pick<WorldLabels['height'], 'text' | 'x' | 'y'>, width: number): ScreenBox {
  const w = letterWidth(text)
  return { x: x * (width / SCENE_W) - w / 2, y, w, h: LETTER_H }
}

/** Nothing of the town is drawn over the dot, where there is one, and the notes; the height stands over the roofs and takes no room from them. */
export function sceneClearance({ notes, height }: Pick<WorldLabels, 'notes'> & { height: Pick<WorldLabels['height'], 'dotted'> }, dot: Point, width: number): ScreenBox[] {
  const sx = width / SCENE_W
  return [
    ...(height.dotted ? [{ x: dot.x * sx - DOT_R, y: dot.y - DOT_R, w: 2 * DOT_R, h: 2 * DOT_R }] : []),
    ...notes.map((note) => ({ x: note.left * sx, y: note.top, w: note.width, h: note.height })),
  ]
}

export const hits = (clear: readonly ScreenBox[], left: number, top: number, right: number, bottom: number) =>
  clear.some((b) => left < b.x + b.w && right > b.x && top < b.y + b.h && bottom > b.y)
