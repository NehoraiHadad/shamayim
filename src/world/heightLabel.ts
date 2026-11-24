import { DOT_R, LABEL_H, VISIBLE_BOTTOM, type Box, type Point } from './layout'
import { SCENE_W } from './sceneBox'
import { heightLabelBox } from './sceneClearance'

export interface HeightLeader { x1: number; y1: number; x2: number; y2: number }
export interface LabelObstacle extends Box { weight?: number }

// Figure inset, maximum tether and threshold for drawing it, in CSS px (label brief).
const INSET = 2
const MAX_LEADER = 34
const MIN_LEADER = 12

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export function coveredArea(a: Box, b: Box) {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
    * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
}

/** Search at CSS-pixel resolution and include exact roof, side and base edges. */
export function besideDot(dot: Point, text: string, width: number, obstacles: readonly LabelObstacle[]) {
  const badge = heightLabelBox({ x: 0, y: 0, text, backed: true }, SCENE_W)
  const half = badge.w / 2
  const pad = -badge.y
  const badgeBottom = badge.y + badge.h
  const reach = DOT_R + MAX_LEADER
  const level = dot.y - LABEL_H / 2
  const left = Math.max(INSET + half, dot.x - reach - half)
  const right = Math.min(width - INSET - half, dot.x + reach + half)
  const top = Math.max(INSET + pad, dot.y - reach - badgeBottom)
  const bottom = Math.min(VISIBLE_BOTTOM - INSET - badgeBottom, dot.y + reach + pad)
  const near = obstacles.filter((o) => o.right > left - half && o.left < right + half &&
    o.bottom > top - pad && o.top < bottom + badgeBottom)
  let best: { x: number; y: number; leader: HeightLeader | null; cover: number; distance: number } | undefined

  function consider(x: number, y: number) {
    if (x < left || x > right || y < top || y > bottom) return
    const box = { left: x - half, right: x + half, top: y - pad, bottom: y + badgeBottom }
    const x2 = clamp(dot.x, box.left, box.right)
    const y2 = clamp(dot.y, box.top, box.bottom)
    const dx = x2 - dot.x, dy = y2 - dot.y
    const radius = Math.hypot(dx, dy)
    // Match the figure inset with two pixels of air outside the ring.
    if (radius < DOT_R + INSET || radius > reach) return
    let cover = 0
    for (const obstacle of near) {
      cover += coveredArea(box, obstacle) * (obstacle.weight ?? 1)
      if (best && cover > best.cover) return
    }
    const distance = Math.hypot(x - dot.x, y - level)
    if (best && (cover > best.cover || (cover === best.cover && distance >= best.distance))) return
    const leader = radius - DOT_R > MIN_LEADER
      ? { x1: dot.x + dx * DOT_R / radius, y1: dot.y + dy * DOT_R / radius, x2, y2 }
      : null
    best = { x, y, leader, cover, distance }
  }

  const aligned = clamp(dot.x, left, right)
  consider(aligned, dot.y - DOT_R - INSET - badgeBottom)
  consider(aligned, dot.y + DOT_R + INSET + pad)
  for (const side of [1, -1]) consider(dot.x + side * (half + DOT_R + INSET), level)
  for (const o of near) {
    consider(aligned, o.top - badgeBottom)
    consider(aligned, o.bottom + pad)
    consider(o.left - half, level)
    consider(o.right + half, level)
  }
  // Exact candidates handle clear roof and side edges. Sample only when none is free.
  if (best?.cover === 0) return { x: best.x, y: best.y, leader: best.leader }
  for (let x = left; x <= right; x += 1) {
    consider(x, bottom)
    for (let y = top; y <= bottom; y += 1) consider(x, y)
  }
  if (best) return { x: best.x, y: best.y, leader: best.leader }
  return { x: clamp(dot.x, INSET + half, width - INSET - half),
    y: clamp(level, INSET + pad, VISIBLE_BOTTOM - INSET - badgeBottom), leader: null }
}
