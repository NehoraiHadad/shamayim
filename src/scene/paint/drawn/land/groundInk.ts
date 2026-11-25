import { TEXEL } from '../../../model/planeBands'
import { labOf } from '../../../model/tone'
import type { RGB } from '../../../model/types'
import { css, type Ctx2D } from '../../shared/base/hand'
import type { PlaneTexelCtx } from '../../shared/land/planeTexel'
import type { ReceiverInk } from '../../shared/land/receiverBrush'
import { pigment, valued } from '../kit/palette'
import type { Grain } from '../kit/printGrain'
import { cellAt, type Ground } from './pots'
import { SHADE, type Shading, type Wipe } from './shadeBlock'

/**
 * The ink a place of the ground was laid in, on each target; its block; the clear air in front of it; its light against
 * the plane's mean; how plainly its block shows in the sun; how far in from the shade block's edge it lies (px, below 0 outside).
 */
export interface GroundInk { key: number; ink: ReceiverInk; level: number; air: number; light: number; shown: number; inside?: number
  /** How far a shade run's bokashi has wiped its block back to the base here (0 … 1). */
  wiped?: number }

/** The shade block's own edge on its shade side: its width (px) and how much darker than the block. */
const EDGE = { wide: 0.9, dark: -0.05 } as const

/**
 * The blocks printed, each flat: every pot in the base block's ink, then each lit or shade block's ink within its outline;
 * the shade block's knife edge left a hair darker inside it.
 */
export function printGround(targets: readonly Ctx2D[], t: PlaneTexelCtx, { pots }: Ground, { levels, wipes }: Shading, grain?: Grain): void {
  const { x, y, w, h } = t.bounds
  targets.forEach((ctx, k) => {
    levels.forEach((level, v) => {
      if (!level) return
      ctx.save()
      if (level.path) ctx.clip(level.path)
      // Each block takes its plank's grain before the next is printed over it, so a place shows its own block's wood.
      pots.forEach(({ shapes }, p) => {
        ctx.fillStyle = css(level.inks[k][p])
        if (p) ctx.fill(shapes)
        else ctx.fillRect(x, y, w, h)
        grain?.(ctx, t.bounds, p ? shapes : null, v * pots.length + p)
      })
      if (v === SHADE && level.path && level.shown[k] > 0.05) {
        ctx.strokeStyle = css(valued(level.inks[k][0], EDGE.dark), 0.8 * level.shown[k])
        ctx.lineWidth = EDGE.wide
        ctx.lineJoin = 'round'
        ctx.stroke(level.path)
      }
      if (v === SHADE && level.path) wiped(ctx, t, pots, levels[0]!.inks[k], wipes)
      ctx.restore()
    })
  })
}

/**
 * The shade block's bokashi toward the foot: each run's lower part wiped back to the base block, the base's ink in every
 * pot laid over it from nothing to full, so a hillside's shade ends as the damp cloth leaves it, never closed to a point.
 */
export function wiped(ctx: Ctx2D, t: PlaneTexelCtx, pots: Ground['pots'], base: readonly RGB[], wipes: readonly Wipe[]) {
  for (const w of wipes) {
    pots.forEach(({ shapes }, p) => {
      const g = ctx.createLinearGradient(0, w.y0, 0, w.y1)
      g.addColorStop(0, css(base[p], 0))
      g.addColorStop(1, css(base[p], 1))
      ctx.fillStyle = g
      ctx.save()
      ctx.beginPath()
      ctx.rect(w.x0 - 1, w.y0, w.x1 - w.x0 + 2, w.y1 - w.y0 + 2)
      ctx.clip()
      if (p) ctx.fill(shapes)
      else ctx.fillRect(t.bounds.x, w.y0, t.bounds.w, w.y1 - w.y0 + 2)
      ctx.restore()
    })
  }
}

export type InkAt = (x: number, y: number) => GroundInk

/** What a place was printed in. */
export function inkAt(t: PlaneTexelCtx, { label, pots }: Ground, { levels, levelAt, light, inside, wipes }: Shading): InkAt {
  return (x, y) => {
    const n = cellAt(t, x, y), p = label[n], v = levels[levelAt[n]] ? levelAt[n] : 0
    const level = levels[v]!, [lit, shade] = level.inks.map((byPot) => byPot[p])
    let wiped = 0
    if (v === SHADE) for (const w of wipes) if (x >= w.x0 && x <= w.x1 && y > w.y0) wiped = Math.max(wiped, Math.min(1, (y - w.y0) / (w.y1 - w.y0)))
    return { key: v * pots.length + p, ink: [lit, shade], level: v, air: level.air, light: light[n], shown: level.shown[0], inside: insideAt(t, inside, x, y), wiped }
  }
}

/** How far in from the shade block's edge a place lies (px), read between the cells' centres. */
function insideAt({ wPx: cols, hPx: rows, bounds }: PlaneTexelCtx, inside: Float32Array, x: number, y: number): number {
  const gx = Math.min(cols - 1, Math.max(0, (x - bounds.x) / TEXEL - 0.5)), gy = Math.min(rows - 1, Math.max(0, (y - bounds.y) / TEXEL - 0.5))
  const i = Math.min(cols - 2, Math.floor(gx)), j = Math.min(rows - 2, Math.floor(gy)), fx = gx - i, fy = gy - j
  if (i < 0 || j < 0) return inside[0] * TEXEL
  const n = j * cols + i, top = inside[n] + (inside[n + 1] - inside[n]) * fx, foot = inside[n + cols] + (inside[n + cols + 1] - inside[n + cols]) * fx
  return (top + (foot - top) * fy) * TEXEL
}

/** The value (Oklab) under which a step is made smaller with the block's own, and the least share of it: no near-black on a dusk block. */
const DIM = 0.7, DIMMEST = 0.35

/** An ink a step of value away from the block's (Oklab lightness), its hue held; `turn` leans it a little warm or cool. */
export function stepped({ ink: [lit, shade] }: GroundInk, by: number, turn = 0): ReceiverInk {
  const step = (rgb: RGB) => pigment(valued(rgb, by * Math.min(1, Math.max(DIMMEST, labOf(rgb).l / DIM))), turn, 1.05)
  return [step(lit), shade && step(shade)]
}
