import type { Disc, LayerOf } from '../../model/types'
import { css, type Ctx2D } from '../shared/base/hand'
import { paintBodies } from '../shared/sky/bodies'
import { papered, pigment } from './kit/palette'

/*
 * The sun as the paper left bare in the ink: a clean disc with no limb of its own, the ink wiped thin round it and one
 * fine ring in it where the sky is clear. The moon is the shared one: its phase and seas are facts.
 */

/** The disc against the sun's radius; how warm its paper is and how far the paper shows. */
const DISC = 1.04, WARM = 0.3, BARE = 0.5
/** The wipe round the disc (of the sun's radius): where it ends, its stops between the disc and there, its strength. */
const WIPE = 2.6, STOPS = [[0, 0], [0.08, 1], [0.35, 0.55], [1, 0]] as const, STRONG = 0.5
/** The ring: its place (of the radius), px and strength; the veil that takes it whole. */
const RING = { at: 1.75, wide: 0.7, alpha: 0.5, veil: 0.5 } as const

export function paintDrawnBodies(ctx: Ctx2D, desc: LayerOf<'bodies'>): void {
  if (desc.sun && desc.part === 'aureole') aureole(ctx, desc.sun)
  else if (desc.sun) disc(ctx, desc.sun)
  else paintBodies(ctx, desc)
}

/** The ink wiped thin round the disc, none of it over the disc: before a cloud there is no light but the sun's own. */
function aureole(ctx: Ctx2D, { x, y, r, halo, aureole: strength, veil, flatten }: Disc) {
  const end = r * WIPE, from = DISC / WIPE, rgb = pigment(halo, 0.5), fade = ctx.createRadialGradient(x, y, 0, x, y, end)
  for (const [u, a] of STOPS) fade.addColorStop(from + (1 - from) * u, css(rgb, STRONG * strength * a))
  ctx.fillStyle = fade
  ctx.fillRect(x - end, y - end, 2 * end, 2 * end)
  ctx.strokeStyle = css(papered(pigment(halo, 0.6), 0.8), RING.alpha * Math.min(1, strength) * Math.max(0, 1 - veil / RING.veil))
  ctx.lineWidth = RING.wide
  ctx.beginPath()
  ctx.ellipse(x, y, r * RING.at, r * RING.at * flatten, 0, 0, Math.PI * 2)
  ctx.stroke()
}

/** The bare paper, as much of it as the cloud and the dust in front leave; a disc in dust is the dust's own colour. */
function disc(ctx: Ctx2D, { x, y, r, core, veil, flatten, coin, shown }: Disc) {
  ctx.fillStyle = css(papered(pigment(core, WARM), BARE * (1 - coin)), Math.max(0.1, 1 - 0.97 * veil ** 0.7) * shown)
  ctx.beginPath()
  ctx.ellipse(x, y, r * DISC, r * DISC * flatten, 0, 0, Math.PI * 2)
  ctx.fill()
}
