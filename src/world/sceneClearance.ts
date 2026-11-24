import { DOT_R, type Point } from './layout'
import { SCENE_W } from './sceneBox'
import type { WorldLabels } from './types'

export interface ScreenBox { x: number; y: number; w: number; h: number }

/** What nothing of the town is drawn over: the place's exact spot and the notes, whose boxes keep their size in screen px. */
export function sceneClearance({ notes }: Pick<WorldLabels, 'notes'>, dot: Point, width: number): ScreenBox[] {
  const sx = width / SCENE_W
  return [{ x: dot.x * sx - DOT_R, y: dot.y - DOT_R, w: 2 * DOT_R, h: 2 * DOT_R },
    ...notes.map((note) => ({ x: note.left * sx, y: note.top, w: note.width, h: note.height }))]
}

export const hits = (clear: readonly ScreenBox[], left: number, top: number, right: number, bottom: number) =>
  clear.some((b) => left < b.x + b.w && right > b.x && top < b.y + b.h && bottom > b.y)
