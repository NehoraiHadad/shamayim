import { DOT_R, type Point } from '../../world/layout'
import type { ScreenBox } from '../../world/sceneClearance'
import { SCENE_W } from '../../world/sceneBox'

export interface HeightLeader { x1: number; y1: number; x2: number; y2: number }

export function heightLeader(dot: Point, badge: ScreenBox, width: number): HeightLeader | null {
  const x = dot.x * (width / SCENE_W)
  const x2 = Math.max(badge.x, Math.min(x, badge.x + badge.w))
  const y2 = Math.max(badge.y, Math.min(dot.y, badge.y + badge.h))
  const dx = x2 - x, dy = y2 - dot.y
  const radius = Math.hypot(dx, dy)
  // A gap of at most 12 CSS px reads as adjacent without a line (label brief).
  return radius - DOT_R <= 12 ? null : { x1: x + dx * DOT_R / radius, y1: dot.y + dy * DOT_R / radius, x2, y2 }
}
