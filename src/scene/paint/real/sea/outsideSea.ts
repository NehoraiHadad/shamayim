import type { SeaDesc, Shine } from '../../../model/types'
import { css, mix, outline, type Ctx2D } from '../../shared/base/hand'
import { glintCore, paintStreaks, running, twinkling } from '../../shared/land/water'
import { laySea } from '../../shared/town/outsideGround'
import { layShallows, layShore } from './shore'
import { layWaves, sparkle, type Water } from './waves'

/** A coastal place's sea: the model's body, its far edge lying into the air, waves, the light's path over them, and the shore. */

/** The far edge's air: how deep it lies on the water (px, and at most that share), its strength. */
const AIR_DEEP = 9, AIR_SHARE = 0.25, AIR = 0.5
/** How long a wave is of the model's ripple, far and near; its strength of the ripple's, the trough's of its crest's. */
const LONG = [18, 6] as const, STRONG = 5, TROUGH = 1
/** How far a crest's ink is taken to the sky low over the horizon, which it mirrors. */
const LOW_SKY = 0.8
/** The light path's half width at the near edge, when no spark shows it. */
const FOOT = 3

export function paintRealSea(ctx: Ctx2D, s: SeaDesc, shine: Shine, t: number, hair: number): void {
  const { horizon: hz, glint } = s, water: Water = { top: s.top, bottom: s.bottom, clear: s.clear, long: LONG }, day = 1 - 0.5 * shine.night
  laySea(ctx, s)
  ctx.save()
  outline(ctx, s.points)
  ctx.clip()
  layShallows(ctx, s)
  layWaves(ctx, water, running(s.ripples, t, s.drift ?? 0, 0), mix(s.light, hz.rgb, LOW_SKY), [s.dark, TROUGH], hair, STRONG * day)
  const deep = Math.min(AIR_DEEP, (s.bottom - s.top) * AIR_SHARE), air = ctx.createLinearGradient(0, s.top, 0, s.top + deep)
  air.addColorStop(0, css(hz.rgb, AIR * day))
  air.addColorStop(1, css(hz.rgb, 0))
  ctx.fillStyle = air
  const left = Math.min(...s.points.map(([x]) => x)), right = Math.max(...s.points.map(([x]) => x))
  ctx.fillRect(left, s.top, right - left, deep)
  if (glint) {
    const foot = glint.sparks.reduce((most, p) => Math.max(most, Math.abs(p.x + p.w / 2 - glint.x)), FOOT)
    glintCore(ctx, { ...glint, top: s.top, bottom: s.bottom }, foot)
    paintStreaks(ctx, twinkling(glint.sparks, t), glint.rgb, hair * 1.6, sparkle)
  }
  ctx.restore()
  layShore(ctx, s, shine)
}

/** Draws `paint` everywhere but on the water: no grain of the town's on the sea. */
export function offSea(ctx: Ctx2D, sea: SeaDesc | null | undefined, box: { x: number; y: number; w: number; h: number }, paint: () => void): void {
  ctx.save()
  if (sea) {
    outline(ctx, sea.points)
    ctx.rect(box.x - 9, box.y - 9, box.w + 18, box.h + 18)
    ctx.clip('evenodd')
  }
  paint()
  ctx.restore()
}
