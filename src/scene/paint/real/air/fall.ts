import { smoothstep } from '../../../../domain/smoothstep'
import type { FallMark, LayerOf } from '../../../model/types'
import { rng } from '../../shared/base/core'
import { css, type Ctx2D, type PaintEnv } from '../../shared/base/hand'
import { wrapped } from '../../shared/weather/fall'

/*
 * Rain and snow by distance: what falls near the eye is out of focus, broad and soft, what falls far off a fine veil. The
 * model's marks, their places, lengths, sizes, strengths and slant; only the depth of each is read from its own size.
 */

/** A longest streak over this is the rain round the eye; under it, a curtain's far streaks. */
const ROUND_EYE = 10
/** A streak's light along it, from the tail: drawn out, brightest just behind the head, no hard end. */
const ALONG = [[0, 0], [0.5, 0.45], [0.86, 1], [1, 0]] as const
/** A streak across: a soft body and its core. */
const ACROSS = [[2, 0.35], [0.9, 0.9]] as const
/** A flake this large (px) is close by: a loose clump, not a speck. */
const CLOSE = 1
/** How far the largest mark reaches past the tile's edge. */
const STREAK_REACH = 24, FLAKE_REACH = 8

function paintRain(ctx: Ctx2D, desc: LayerOf<'fall'>, hair: number) {
  const { w, h } = desc.bounds
  const down = Math.hypot(desc.slant, 1), ux = desc.slant / down, uy = 1 / down
  const longest = desc.marks.reduce((max, m) => Math.max(max, m.len), 0)
  ctx.lineCap = 'butt'
  wrapped(desc.marks, w, h, STREAK_REACH, (m, x, y) => {
    // The depth: 0 far, 1 at the eye.
    const near = longest > ROUND_EYE ? smoothstep(0.62, 1, m.len / longest) : 0
    const tx = x - ux * m.len, ty = y - uy * m.len
    const strength = m.alpha * (0.55 + 0.45 * near), width = hair + 1.3 * near
    for (const [across, share] of near > 0.15 ? ACROSS : ACROSS.slice(1)) {
      const g = ctx.createLinearGradient(tx, ty, x, y)
      for (const [t, a] of ALONG) g.addColorStop(t, css(desc.rgb, a * strength * share))
      ctx.strokeStyle = g
      ctx.lineWidth = Math.max(hair, width * across)
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  })
}

/** A flake's lobes [x, y, size]: one for a small far flake, a loose clump for one close by. */
function lobes(m: FallMark): [number, number, number][] {
  if (m.r < CLOSE) return [[0, 0, 1]]
  const r = rng(Math.round(m.x * 97 + m.y * 1013))
  return Array.from({ length: 3 }, (_, i) => {
    const turn = ((i + r()) / 3) * 2 * Math.PI, out = (0.3 + 0.25 * r()) * m.r
    return [Math.cos(turn) * out, Math.sin(turn) * out, 0.6 + 0.2 * r()]
  })
}

function paintSnow(ctx: Ctx2D, desc: LayerOf<'fall'>, hair: number) {
  const { w, h } = desc.bounds
  wrapped(desc.marks, w, h, FLAKE_REACH, (m, x, y) => {
    const close = m.r >= CLOSE
    for (const [dx, dy, size] of lobes(m)) {
      // The closer the softer: a near flake melts outward from its middle, a far one is a speck.
      const r = Math.max(hair, (close ? 2.1 : 1.6) * m.r * size), a = m.alpha * (close ? 0.72 : 1)
      const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r)
      g.addColorStop(0, css(desc.rgb, a))
      g.addColorStop(0.45, css(desc.rgb, a * 0.7))
      g.addColorStop(1, css(desc.rgb, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x + dx, y + dy, r, 0, 2 * Math.PI)
      ctx.fill()
    }
  })
}

/** A falling tile, laid by the compositor as a moving pattern: painted once, its edges wrapped. */
export function paintNearFall(ctx: Ctx2D, desc: LayerOf<'fall'>, env: PaintEnv): void {
  const hair = Math.max(0.5, 1 / env.scale)
  if (desc.precip === 'rain') paintRain(ctx, desc, hair)
  else paintSnow(ctx, desc, hair)
}
