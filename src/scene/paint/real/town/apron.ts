import type { RGB, Shine, Tones } from '../../../model/types'
import { css, type Ctx2D } from '../../shared/base/hand'

/*
 * The shadow a body throws toward the eye when the light is ahead of the town (behind its houses): on the ground before
 * its foot, as deep as its run toward the eye (`Shine.cast.run` × `toward`) seen at the slant the ground lies at, leaning as the light's side leans it,
 * at the strength of the body's own cast (`castShadow` lays the run across). Under the bodies: a nearer body stands over
 * the shadow of the one behind it. Screen px; geometry from the body and the light alone. Pure.
 */

/** How much a run toward the eye shrinks on the screen (the ground's slant); the deepest it goes, of the body's width. */
const SLANT = .35, DEEPEST = .6
/** Where its strength starts to fall (of its depth), and the least depth (px) worth laying. */
const FALL = .55, LEAST = .2

/**
 * The ground in a body's shadow: the place's own lit ground (`ground`, the outside land's tone) under the sky's light
 * alone, its share of the whole light read from the walls' (`shade` of `lit`), so the shadow is the ground's own dark, not
 * a wall's blue grey laid over it. Without the ground, the walls' shade.
 */
export function shadowedGround(t: Pick<Tones, 'shade' | 'lit'>, ground: RGB | undefined): RGB {
  if (!ground) return t.shade
  const k = (c: number) => Math.min(1, t.shade[c] / Math.max(1e-3, t.lit[c]))
  return [ground[0] * k(0), ground[1] * k(1), ground[2] * k(2)]
}

export function apron(ctx: Ctx2D, x: number, foot: number, w: number, h: number, shadow: RGB,
  cast: Shine['cast'], alpha: number) {
  const toward = cast.toward ?? 0, strong = alpha * cast.alpha
  if (strong <= 0 || toward <= 0) return
  const deep = Math.min(DEEPEST * w, (cast.run ?? cast.length) * h * toward * SLANT)
  if (deep < LEAST) return
  // Its far edge leans with the light's side: the run across over the run toward the eye, foreshortened, at most a width.
  const lean = Math.max(-w, Math.min(w, cast.dx / Math.max(.2, toward) * deep / SLANT * .5))
  const g = ctx.createLinearGradient(0, foot, 0, foot + deep)
  g.addColorStop(0, css(shadow, strong))
  g.addColorStop(FALL, css(shadow, strong * .8))
  g.addColorStop(1, css(shadow, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x - w / 2, foot - .2); ctx.lineTo(x + w / 2, foot - .2)
  ctx.lineTo(x + w / 2 + lean, foot + deep); ctx.lineTo(x - w / 2 + lean, foot + deep)
  ctx.closePath()
  ctx.fill()
}
