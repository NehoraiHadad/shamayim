import type { RGB } from '../../../model/types'
import { css, type Ctx2D } from '../../shared/base/hand'
import type { PlaneTexelCtx } from '../../shared/land/planeTexel'
import type { ReceiverInk } from '../../shared/land/receiverBrush'
import { pigment, valued } from '../kit/palette'
import { cellAt, type Ground } from './pots'
import { bandAt, type Shading } from './shadeBlock'

/** The ink a place of the ground was laid in, on each target; the clear air in front of it; its light against the plane's mean. */
export interface GroundInk { key: number; ink: ReceiverInk; air: number; light: number }

/** Both blocks printed: every pot in its base ink, then again in each level's ink within the level's outline. */
export function printGround(targets: readonly Ctx2D[], t: PlaneTexelCtx, { pots }: Ground, { levels }: Shading): void {
  const { x, y, w, h } = t.bounds
  targets.forEach((ctx, k) => {
    for (const level of levels) {
      if (!level) continue
      ctx.save()
      if (level.path) ctx.clip(level.path)
      pots.forEach(({ shapes }, p) => {
        const wipe = ctx.createLinearGradient(0, y, 0, y + h), bands = level.inks[k][p]
        bands.forEach((rgb, b) => wipe.addColorStop((b + 0.5) / bands.length, css(rgb)))
        ctx.fillStyle = wipe
        if (p) ctx.fill(shapes)
        else ctx.fillRect(x, y, w, h)
      })
      ctx.restore()
    }
  })
}

export type InkAt = (x: number, y: number) => GroundInk

/** What a place was printed in. */
export function inkAt(t: PlaneTexelCtx, { label, pots }: Ground, { levels, levelAt, light }: Shading): InkAt {
  return (x, y) => {
    const n = cellAt(t, x, y), b = bandAt(t, n), p = label[n], v = levels[levelAt[n]] ? levelAt[n] : 0
    const level = levels[v]!, [lit, shade] = level.inks.map((byPot) => byPot[p][b])
    return { key: (v * pots.length + p) * 8 + b, ink: [lit, shade], air: level.air[b], light: light[n] }
  }
}

/** An ink a step of value away, through the air in front of it. */
export function stepped({ ink: [lit, shade], air }: GroundInk, by: number, turn: number): ReceiverInk {
  const step = (rgb: RGB) => pigment(valued(rgb, by * air), turn, 1.05)
  return [step(lit), shade && step(shade)]
}
