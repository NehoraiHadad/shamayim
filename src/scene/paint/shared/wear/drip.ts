import type { LayerOf } from '../../../model/types'
import { css, type Ctx2D } from '../base/hand'

/** A drop falling from wet cloth: a bead of the cloth's water with its glint. */
export function paintWearDrip(ctx: Ctx2D, desc: LayerOf<'wearDrip'>) {
  const { x, y, r } = desc
  ctx.fillStyle = css(desc.rgb, 0.9)
  ctx.beginPath()
  ctx.moveTo(x, y - r * 1.5)
  ctx.quadraticCurveTo(x + r, y - r * 0.2, x + r, y + 0.2 * r)
  ctx.arc(x, y + 0.2 * r, r, 0, Math.PI)
  ctx.quadraticCurveTo(x - r, y - r * 0.2, x, y - r * 1.5)
  ctx.fill()
  ctx.fillStyle = css(desc.lit, 0.8)
  ctx.beginPath(); ctx.arc(x - r * 0.35, y, r * 0.3, 0, Math.PI * 2); ctx.fill()
}
