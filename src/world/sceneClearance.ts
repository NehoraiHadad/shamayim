import { BACKING_PAD, DOT_R, LABEL_PX, textWidth, type Point } from './layout'
import { SCENE_W } from './sceneBox'
import type { WorldLabels } from './types'

export interface ScreenBox { x: number; y: number; w: number; h: number }

/** Text and backing stay the same size in screen px as the label moves with the viewport. */
export function heightLabelBox(height: WorldLabels['height'], width: number): ScreenBox {
  const caption = height.caption
  if (caption) return { x: caption.x * (width / SCENE_W) - caption.w / 2, y: caption.y, w: caption.w, h: caption.h }
  const pad = height.backed ? BACKING_PAD : 0
  const w = textWidth(height.text, LABEL_PX) + 2 * pad
  return { x: height.x * (width / SCENE_W) - w / 2, y: height.y - pad, w, h: LABEL_PX + 2 * pad }
}

export function sceneClearance({ height, notes }: WorldLabels, dot: Point, width: number): ScreenBox[] {
  const sx = width / SCENE_W
  return [
    dotClearance(dot, width),
    // The backed label lies over the town. Marks receive the backing separately from the fabric.
    ...(height.backed ? [] : [heightLabelBox(height, width)]),
    ...notes.map((note) => ({ x: note.left * sx, y: note.top, w: note.width, h: note.height })),
  ]
}

export function dotClearance(dot: Point, width: number): ScreenBox {
  return { x: dot.x * (width / SCENE_W) - DOT_R, y: dot.y - DOT_R, w: 2 * DOT_R, h: 2 * DOT_R }
}

export const hits = (clear: readonly ScreenBox[], left: number, top: number, right: number, bottom: number) =>
  clear.some((b) => left < b.x + b.w && right > b.x && top < b.y + b.h && bottom > b.y)
