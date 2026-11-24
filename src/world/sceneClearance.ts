import { DOT_R, type Point } from './layout'
import { SCENE_W } from './sceneBox'

export interface ScreenBox { x: number; y: number; w: number; h: number }

/** What nothing of the town is drawn over: the place's exact spot, whose clearing keeps its size in screen px. */
export function sceneClearance(dot: Point, width: number): ScreenBox[] {
  return [{ x: dot.x * width / SCENE_W - DOT_R, y: dot.y - DOT_R, w: 2 * DOT_R, h: 2 * DOT_R }]
}

export const hits = (clear: readonly ScreenBox[], left: number, top: number, right: number, bottom: number) =>
  clear.some((b) => left < b.x + b.w && right > b.x && top < b.y + b.h && bottom > b.y)
