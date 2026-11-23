import { seeded } from '../../../../src/data/landmarks/hash'
import type { LayerOf, OutsideItem, RGB, SeaDesc } from '../../../../src/scene/model/types'
import { css, mix, outline, type Ctx2D } from '../../../../src/scene/paint/shared/base/hand'
import { paintPass } from '../../../../src/scene/paint/shared/base/paintPass'
import type { Lamp } from '../../../../src/scene/paint/shared/town/glyphs/kit'

/*
 * A town's own light by night, from the model's share of lit windows and its window colour: a glow on the air over the
 * mass, pools along its streets, a bloom round its lights, and long broken reflections where its light meets the sea.
 * Added light, soft, no filter. Pure: the desc and its items' seeds.
 */

const STREET: RGB = [1, 0.74, 0.42]
/** How far above the water's far edge a light may stand and still lie on it, px. */
const SHORE = 14
type Body = Extract<OutsideItem, { kind: 'box' | 'tower' }>

export function nightTown(ctx: Ctx2D, desc: LayerOf<'outside'>, lamps: Lamp[]): void {
  const { night, windows } = desc.shine
  const power = Math.max(0, (night - 0.3) / 0.7) * Math.min(1, 1.6 * windows)
  const bodies = desc.items.filter((item): item is Body => item.kind === 'box' || item.kind === 'tower')
  if (power < 0.02 || !bodies.length) return
  const warm = mix(desc.tiers[bodies[0].tier].win, STREET, 0.4)
  paintPass(ctx, 'emission', () => {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    pools(ctx, bodies, warm, power)
    ctx.restore()
    if (desc.sea) reflections(ctx, desc.sea, bodies, warm, power)
  })
  for (const lamp of lamps) lamp.r *= 1 + 0.6 * power
}

const foot = (b: Body) => (b.kind === 'box' ? b.foot : b.base)
const tall = (b: Body) => (b.kind === 'box' ? b.foot - b.top : b.h)

function glow(ctx: Ctx2D, x: number, y: number, rx: number, ry: number, rgb: RGB, a: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, css(rgb, a))
  g.addColorStop(0.4, css(rgb, a * 0.42))
  g.addColorStop(1, css(rgb, 0))
  ctx.fillStyle = g
  ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx)
  ctx.restore()
}

/** Street light between the houses: a soft pool at the foot of some of them, brighter where they stand close. */
function pools(ctx: Ctx2D, bodies: readonly Body[], rgb: RGB, power: number) {
  for (const b of bodies) {
    const r = seeded(b.seed ^ 0x71a)
    if (r() < 0.45) continue
    const w = Math.max(1.6, b.w * (0.55 + 0.45 * r()))
    glow(ctx, b.x + (r() - 0.5) * b.w, foot(b) - 0.3, w, Math.max(1, 0.6 * w), rgb, 0.2 * power * (0.4 + r()))
    if (r() < 0.3) glow(ctx, b.x, foot(b) - tall(b) * 0.4, w * 4, w * 3, rgb, 0.035 * power)
  }
}

/** The lights nearest the water, drawn down it in broken strokes. */
function reflections(ctx: Ctx2D, sea: SeaDesc, bodies: readonly Body[], rgb: RGB, power: number) {
  ctx.save()
  outline(ctx, sea.points)
  ctx.clip()
  ctx.globalCompositeOperation = 'lighter'
  for (const b of bodies) {
    const r = seeded(b.seed ^ 0x3e5)
    if (r() < 0.5 || foot(b) < sea.top - SHORE) continue
    const x = b.x + (r() - 0.5) * b.w, reach = 4 + 14 * r(), top = Math.max(sea.top, Math.min(foot(b), sea.top + 2))
    for (let y = top; y < top + reach; y += 0.8 + 0.5 * r()) {
      const fade = 1 - (y - top) / reach, w = 0.6 + (1 - fade) * 2.2
      ctx.fillStyle = css(rgb, 0.22 * power * fade * (0.3 + 0.7 * r()))
      ctx.fillRect(x - w / 2 + (r() - 0.5) * 0.8, y, w, 0.45)
    }
  }
  ctx.restore()
}
