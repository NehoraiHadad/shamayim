import { CAPTION_FLOOR, fits, least, type Scored } from './cover'
import { AIR, INK_H, letterWidth, type CaptionScene } from './scene'
import type { Caption } from './types'

/** What stands between the name and the height. */
export const JOIN = ' · '
/** The tick from the inscription to the roofs (px): drawn only where it reaches them and is more than a speck. */
const TICK = { max: 13, min: 3 }
/** The spot's column stays this far inside the inscription (px). */
const HOLD = 8
/** What a px aside and a covered px of a far town cost, in px of height over the roofs. */
const ASIDE = .35, FAR = .05

/** Option a: the place's name and its height in one line in the air over its roofs, over the spot's column. */
export function inscription(scene: CaptionScene): Caption {
  const { spot, extent, cover, onLand } = scene
  const w = letterWidth(scene.name + JOIN + scene.height), h = INK_H
  const reach = Math.max(0, Math.floor(w / 2 - HOLD))
  const roof = Math.min(extent?.roof(spot.x - 4, spot.x + 4) ?? spot.y - 6, spot.y - 6)
  const foot = Math.max(extent?.foot(spot.x - 4, spot.x + 4) ?? spot.y + 6, spot.y + 6)
  const rows = (from: number, to: number, gap: (y: number) => number) => {
    const list: Scored<{ x: number; y: number }>[] = []
    for (let dx = -reach; dx <= reach; dx++) {
      for (let y = Math.ceil(from); y <= to; y++) {
        const at = { x: spot.x + dx, y }
        if (!fits({ ...at, w, h })) continue
        const covered = cover({ ...at, w, h }, AIR)
        list.push({ at, cover: covered, cost: Math.abs(dx) * ASIDE + gap(y) + covered.beyond * FAR })
      }
    }
    return least(list)
  }
  const above = rows(2, roof - h, y => roof - y - h)
  const free = above && above.cover.notes + above.cover.marks + above.cover.fabric === 0
  const below = free ? null : rows(foot, CAPTION_FLOOR - h, y => y - foot)
  const { x, y } = least([above, below].filter(s => s !== null))?.at ?? { x: spot.x, y: spot.y - 20 }
  const top = y + h + 2, bottom = roof - 1.5, rise = bottom - top
  return { option: 'a', name: scene.name, height: scene.height, x, y, w, h, slope: 0,
    on: onLand(x, y + h / 2) ? 'land' : 'sky', spot,
    tick: rise >= TICK.min && rise <= TICK.max ? { top, bottom } : null, line: null, markDx: null }
}
