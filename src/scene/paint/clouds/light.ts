import { css, mix, type Ctx2D, type PaintEnv, type Scratch } from '../hand'
import type { CloudSprite } from './sprite'

/*
 * The light on a painted cell (track D), laid on its whole mass after its form.
 * - Thin edges: the rim of every cell is thin cloud (its thickness falls to nil at the edge, SPEC §1.4), so it is
 *   translucent. The sky shows through it, and toward a sun behind or beside the cell it is the brightest part
 *   (forward scattering, the silver lining).
 * - A low sun's glow along the underside.
 * Pure: the sheets come from `env`.
 */

/** Device px of the mass at scale `k`: the sheet the sprite was painted on, and its size. */
export interface Mass { sheet: Scratch; w: number; h: number; k: number }

/** The mass eroded by `d` device px (the four shifted copies' intersection): what is not rim. */
function eroded(m: Mass, env: PaintEnv, d: number): Scratch {
  const e = env.canvas(m.w, m.h)
  e.ctx.drawImage(m.sheet.canvas as CanvasImageSource, 0, 0)
  e.ctx.globalCompositeOperation = 'destination-in'
  for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) e.ctx.drawImage(m.sheet.canvas as CanvasImageSource, dx, dy)
  e.ctx.globalCompositeOperation = 'source-over'
  return e
}

/** The rim alone (mass less its erosion), in one colour. */
function rimOf(m: Mass, env: PaintEnv, d: number, rgb: readonly [number, number, number], dx = 0, dy = 0): Scratch {
  const inner = eroded(m, env, d)
  const rim = env.canvas(m.w, m.h)
  rim.ctx.fillStyle = css(rgb as [number, number, number])
  rim.ctx.fillRect(0, 0, m.w, m.h)
  rim.ctx.globalCompositeOperation = 'destination-in'
  rim.ctx.drawImage(m.sheet.canvas as CanvasImageSource, 0, 0)
  rim.ctx.globalCompositeOperation = 'destination-out'
  rim.ctx.drawImage(inner.canvas as CanvasImageSource, dx, dy)
  return rim
}

/** The edges, the silver and the glow, on the mass (device px, no transform). */
export function lightMass(m: Mass, s: CloudSprite, env: PaintEnv): void {
  const c = m.sheet.ctx
  c.setTransform(1, 0, 0, 1, 0, 0)
  const span = Math.max(s.w, s.tall + s.under) * m.k
  const thin = Math.exp(-s.tau / 25)
  // Translucent rims: thickness falls to nil at the edge, so the outer band thins in steps (a graded fall-off, no hard
  // inner line): each step removes a little of what lies within `d·i` of the edge.
  const d = Math.max(1, Math.round(span * 0.012))
  const loss = 0.12 + 0.14 * thin
  for (let i = 1; i <= 3; i++) {
    const keep = env.canvas(m.w, m.h)
    keep.ctx.drawImage(m.sheet.canvas as CanvasImageSource, 0, 0)
    keep.ctx.globalCompositeOperation = 'destination-out'
    keep.ctx.drawImage(eroded(m, env, d * i).canvas as CanvasImageSource, 0, 0)
    c.globalCompositeOperation = 'destination-out'
    c.globalAlpha = loss
    c.drawImage(keep.canvas as CanvasImageSource, 0, 0)
  }
  c.globalAlpha = 1
  c.globalCompositeOperation = 'source-atop'
  // The silver lining: the rim toward the light, thrown inward from the side it comes from.
  if (s.toward && (s.silver > 0.02 || s.litA > 0.05)) {
    const [tx, ty] = s.toward
    const w = Math.max(1.5, span * 0.05)
    const bright = mix(s.lit, [1, 1, 1], 0.45 * s.silver)
    const rim = rimOf(m, env, Math.round(w), bright, -tx * w * 1.6, -ty * w * 1.6)
    c.globalAlpha = Math.min(1, Math.max(0.5 * s.litA * (0.5 + thin), 0.95 * s.silver))
    c.drawImage(rim.canvas as CanvasImageSource, 0, 0)
    c.globalAlpha = 1
  }
  // A low sun under the base: warm light up the underside.
  if (s.glow > 0.02) {
    const g = c.createLinearGradient(0, m.h * 0.35, 0, m.h)
    g.addColorStop(0, css(s.lit, 0))
    g.addColorStop(1, css(s.lit, Math.min(0.85, 0.8 * s.glow)))
    c.fillStyle = g
    c.fillRect(0, 0, m.w, m.h)
  }
  c.globalCompositeOperation = 'source-over'
}

/** Clears a sheet for reuse. */
export function clear(c: Ctx2D, w: number, h: number) {
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.globalCompositeOperation = 'source-over'
  c.globalAlpha = 1
  c.clearRect(0, 0, w, h)
}
