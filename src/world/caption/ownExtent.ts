import { BUILDING_ROOF, TOWER_CROWN } from '../portraitMargins'
import { SCENE_W } from '../sceneBox'
import type { OutsideView, Pt } from '../types'

/** Houses this far apart (px) still read as one settlement. */
const LINK_PX = 14
/** Half the window (px) the feet are followed over. */
const FOLLOW = 12

export interface OwnExtent {
  left: number; right: number
  /** The highest roof / the lowest foot between two columns. */
  roof(x0: number, x1: number): number
  foot(x0: number, x1: number): number
  /** A smooth line at or under every foot, from the first house to the last. */
  feet: Pt[]
}

/** The place's own houses and towers (within its own boundary), as far as they are linked to each other round its spot. */
export function ownExtent(view: Pick<OutsideView, 'skyline'>, spotX: number): OwnExtent | null {
  const top = new Float64Array(SCENE_W).fill(Infinity), foot = new Float64Array(SCENE_W).fill(-Infinity)
  const add = (x: number, w: number, roof: number, base: number) => {
    for (let c = Math.max(0, Math.floor(x - w / 2)); c < Math.min(SCENE_W, Math.ceil(x + w / 2)); c++) {
      top[c] = Math.min(top[c], roof)
      foot[c] = Math.max(foot[c], base)
    }
  }
  for (const b of view.skyline.boxes) add(b.x, b.w, b.top - BUILDING_ROOF, b.foot)
  for (const t of view.skyline.towers) add(t.x, t.w, t.baseY - t.h - TOWER_CROWN, t.baseY)
  const runs: [number, number][] = []
  for (let c = 0; c < SCENE_W; c++) {
    if (foot[c] === -Infinity) continue
    const last = runs.at(-1)
    if (last && c - last[1] <= LINK_PX) last[1] = c
    else runs.push([c, c])
  }
  const away = ([a, b]: [number, number]) => Math.max(a - spotX, spotX - b, 0)
  const run = runs.sort((a, b) => away(a) - away(b) || b[1] - b[0] - (a[1] - a[0]))[0]
  if (!run) return null
  const [left, right] = run
  const extreme = (of: Float64Array, pick: (a: number, b: number) => number, start: number) => (x0: number, x1: number) => {
    let y = start
    for (let c = Math.max(left, Math.floor(x0)); c <= Math.min(right, Math.ceil(x1)); c++) y = pick(y, of[c])
    return y
  }
  const roof = extreme(top, Math.min, Infinity), low = extreme(foot, Math.max, -Infinity)
  // The mean of the window's lowest feet is never above the foot it stands under: each of them already counted it.
  const lows = Array.from({ length: right - left + 1 }, (_, i) => low(left + i - FOLLOW, left + i + FOLLOW))
  const feet = lows.map((_, i): Pt => {
    const part = lows.slice(Math.max(0, i - FOLLOW), i + FOLLOW + 1)
    return [left + i, part.reduce((sum, y) => sum + y, 0) / part.length]
  })
  return { left, right, roof, foot: low, feet }
}
