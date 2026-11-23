import type { RGB, Tones } from '../model/types'
import { css, mix, type Ctx2D } from './hand'
import type { BodyTones } from './townDetail'

/** A side face's tone: turned from the eye (less sky), deeper as the direct light leaves it, lit by its share. */
export function sideTone(front: RGB, t: Tones, lit: RGB, k: number, on: number): RGB {
  return mix(mix(front, t.shade, (0.3 + 0.35 * on) * (1 - k)), lit, k)
}

/**
 * A standing body, its left face, front and right face across it, with an edge `soft` px to each side of its outline (0:
 * crisp): coverage along the sides by the fill itself, over the top in one half-covered strip.
 */
export function paintBody(ctx: Ctx2D, x: number, top: number, w: number, h: number, face: number, soft: number, f: BodyTones) {
  const span = w + 2 * soft
  const g = ctx.createLinearGradient(x - soft, top, x + w + soft, top)
  const at = (px: number) => Math.min(1, Math.max(0, (px + soft) / span))
  const turn = Math.min(soft, face * 0.5)
  g.addColorStop(0, css(f.left, 0))
  g.addColorStop(at(soft), css(f.left))
  g.addColorStop(at(Math.max(soft, face - turn)), css(f.left))
  g.addColorStop(at(Math.max(soft, face + turn)), css(f.front))
  g.addColorStop(at(Math.min(w - soft, w - face - turn)), css(f.front))
  g.addColorStop(at(Math.min(w - soft, w - face + turn)), css(f.right))
  g.addColorStop(at(w - soft), css(f.right))
  g.addColorStop(1, css(f.right, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - soft, top + soft, span, h - soft)
  if (soft < 0.05) return
  ctx.globalAlpha = 0.5
  ctx.fillRect(x - soft, top - soft, span, 2 * soft)
  ctx.globalAlpha = 1
}
