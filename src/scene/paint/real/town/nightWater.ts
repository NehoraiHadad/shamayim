import type { OutsideItem, SeaDesc } from '../../../model/types'
import { rng } from '../../shared/base/core'
import { css, outline, type Ctx2D } from '../../shared/base/hand'
import { paintPass } from '../../shared/base/paintPass'
import { litStand, type NightLight } from './nightTown'

/** How far above the water's far edge a light may stand and still lie on it, px. */
const SHORE = 14

/** Where the water's far edge lies at `x`; null off the sea. */
function farEdge({ points }: SeaDesc, x: number): number | null {
  let top: number | null = null
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[j], [bx, by] = points[i]
    if (ax <= x === bx <= x) continue
    const y = ay + (by - ay) * (x - ax) / (bx - ax)
    if (top === null || y < top) top = y
  }
  return top
}

/** The lit streets beyond the water and near it, drawn down it in broken strokes that shimmer over the strip's loop (`t` 0…1). */
export function paintNightWater(ctx: Ctx2D, sea: SeaDesc, items: readonly OutsideItem[], light: NightLight, t: number): void {
  const near = items.flatMap((item) => {
    const stand = litStand(item), top = stand && farEdge(sea, stand.x)
    return top !== null && stand!.foot >= top - SHORE && stand!.foot <= top + 2 ? [{ ...stand!, top }] : []
  })
  if (!near.length) return
  paintPass(ctx, 'emission', () => {
    ctx.save()
    outline(ctx, sea.points)
    ctx.clip()
    ctx.globalCompositeOperation = 'lighter'
    for (const b of near) {
      const r = rng(b.seed ^ 0x3e5)
      if (r() < .25) continue
      const x = b.x + (r() - .5) * b.w, reach = 4 + 14 * r(), top = Math.max(b.top, b.foot)
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
