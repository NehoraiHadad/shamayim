import type { OutsideItem, SeaDesc } from '../../../model/types'
import { rng } from '../../shared/base/core'
import { css, outline, type Ctx2D } from '../../shared/base/hand'
import { paintPass } from '../../shared/base/paintPass'
import { standOf, type NightLight } from './nightTown'

/** How far above the water's far edge a light may stand and still lie on it, px. */
const SHORE = 14

/** The lights nearest the sea, drawn down it in broken strokes that shimmer over the strip's loop (`t` 0…1). */
export function paintNightWater(ctx: Ctx2D, sea: SeaDesc, items: readonly OutsideItem[], light: NightLight, t: number): void {
  const near = items.flatMap((item) => {
    const stand = standOf(item)
    return stand && stand.foot >= sea.top - SHORE ? [stand] : []
  })
  if (!near.length) return
  paintPass(ctx, 'emission', () => {
    ctx.save()
    outline(ctx, sea.points)
    ctx.clip()
    ctx.globalCompositeOperation = 'lighter'
    for (const b of near) {
      const r = rng(b.seed ^ 0x3e5)
      if (r() < .5) continue
      const x = b.x + (r() - .5) * b.w, reach = 4 + 14 * r(), top = Math.max(sea.top, Math.min(b.foot, sea.top + 2))
      for (let y = top; y < top + reach; y += .8 + .5 * r()) {
        const fade = 1 - (y - top) / reach, w = .6 + 2.2 * (1 - fade)
        const shimmer = .8 + .2 * Math.sin(2 * Math.PI * (t + r()))
        ctx.fillStyle = css(light.rgb, .22 * light.street * fade * (.3 + .7 * r()) * shimmer)
        ctx.fillRect(x - w / 2 + (r() - .5) * .8, y, w, .45)
      }
    }
    ctx.restore()
  })
}
