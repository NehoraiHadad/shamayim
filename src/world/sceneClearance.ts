import { DOT_R, LABEL_H, LABEL_PX, textWidth, type Point } from './layout'
import { SCENE_W } from './sceneBox'
import type { WorldLabels } from './types'

/** CSS px around the backed height label (SceneOverlay.module.css). */
export const BACKING_PAD = 2.5

/** A glyph avoids every zone. The overlaid dot and backed badge can sit over scenery. */
export interface ScreenBox { x: number; y: number; w: number; h: number; overFabric?: true }

/** Text and backing stay the same size in screen px as the label moves with the viewport. */
export function heightLabelBox(height: Pick<WorldLabels['height'], 'x' | 'y' | 'text' | 'backed'>, width: number): ScreenBox {
  const pad = height.backed ? BACKING_PAD : 0
  const w = textWidth(height.text, LABEL_PX) + 2 * pad
  return { x: height.x * (width / SCENE_W) - w / 2, y: height.y - pad, w, h: LABEL_H + 2 * pad }
}

export function sceneClearance({ height, notes }: WorldLabels, dot: Point, width: number): ScreenBox[] {
  const sx = width / SCENE_W
  return [
    { x: dot.x * sx - DOT_R, y: dot.y - DOT_R, w: 2 * DOT_R, h: 2 * DOT_R, overFabric: true },
    { ...heightLabelBox(height, width), ...(height.backed ? { overFabric: true as const } : {}) },
    ...notes.map((note) => ({ x: note.left * sx, y: note.top, w: note.width, h: note.height })),
  ]
}

export const hits = (clear: readonly ScreenBox[], left: number, top: number, right: number, bottom: number) =>
  clear.some((b) => left < b.x + b.w && right > b.x && top < b.y + b.h && bottom > b.y)
