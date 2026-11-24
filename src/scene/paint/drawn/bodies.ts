import { smoothstep } from '../../../domain/smoothstep'
import { sunDiscAlpha } from '../../model/dustDisc'
import { labOf } from '../../model/tone'
import type { Disc, LayerOf } from '../../model/types'
import { css, mix, type Ctx2D } from '../shared/base/hand'
import { paintBodies } from '../shared/sky/bodies'
import { papered, pigment } from './kit/palette'

/*
 * The sun as the paper left bare in the ink: a flat clean disc in one thin printing of its limb's warm, and the ink wiped
 * thin over and round it, as light as the air's own glow. The moon is the shared one (its phase and seas are facts), and so
 * is the light of the sun a dusty air's filter leaves out.
 */

/** The disc against the sun's radius, and how far the paper shows in it: less the more coloured (Oklab chroma) the air makes the sun. */
const DISC = 1.06, BARE = 0.85, COLOURED = [0.03, 0.12] as const
/** The bare disc inside the warm one, how far the paper shows in the warm one against the bare, and its chroma. */
const INNER = 0.8, WARM = 0.6, GAIN = 1.7
/** The wipe: where it ends (of the sun's radius), its stops from the disc's edge to there, its strength. */
const WIPE = 2.6, STOPS = [[0, 1], [0.2, 0.6], [0.5, 0.22], [1, 0]] as const, STRONG = 0.55

export function paintDrawnBodies(ctx: Ctx2D, desc: LayerOf<'bodies'>): void {
  if (desc.sun && desc.part === 'aureole') aureole(ctx, desc.sun)
  else if (desc.sun && !desc.part) disc(ctx, desc.sun)
  else paintBodies(ctx, desc)
}

/** The wipe, one flat strength over the disc: no core of its own, so before a cloud it is a glow and no sun. */
function aureole(ctx: Ctx2D, { x, y, r, halo, aureole: strength }: Disc) {
  const end = r * WIPE, from = DISC / WIPE, fade = ctx.createRadialGradient(x, y, 0, x, y, end)
  for (const [u, a] of STOPS) fade.addColorStop(from + (1 - from) * u, css(halo, Math.min(1, STRONG * strength) * a))
  ctx.fillStyle = fade
  ctx.fillRect(x - end, y - end, 2 * end, 2 * end)
}

/** The bare paper, as much of it as the cloud and the dust in front leave; a low sun and one in dust keep their colour. */
function disc(ctx: Ctx2D, { x, y, r, core, limb, veil, flatten, coin, shown }: Disc) {
  const { a, b } = labOf(core), bare = BARE * (1 - coin) * smoothstep(COLOURED[1], COLOURED[0], Math.hypot(a, b))
  const alpha = sunDiscAlpha(veil) * shown, warm = papered(pigment(limb, 0, GAIN), WARM * bare)
  for (const [k, rgb] of [[DISC, mix(warm, core, coin)], [INNER, papered(core, bare)]] as const) {
    ctx.fillStyle = css(rgb, alpha)
    ctx.beginPath()
    ctx.ellipse(x, y, r * k, r * k * flatten, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}
