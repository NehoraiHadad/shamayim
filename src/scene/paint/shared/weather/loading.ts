import { smoothstep } from '../../../../domain/smoothstep'
import type { LayerOf } from '../../../model/types'
import { fractal } from '../base/core'
import { css, type Ctx2D, type PaintEnv } from '../base/hand'
import { mistBands, soft } from './weather'

/*
 * The land not known yet (stage C8), after the anidoodle skill's craft notes (`realism-and-craft.md`: no filter, soft
 * edges by stacked copies and gradients, marks sized to what they draw; `craft-bar.md`: thick-thin strokes, lost edges;
 * `motion-grammar.md`: marks are made, never faded in from nothing, and two copies of one thing are never dissolved).
 * Real reference, from life: a valley filling with morning fog seen from a ridge road, the far side a grey bank with
 * the crest of the hills opposite just showing through it as a soft darker line, lost in places, with the mass of the
 * hill a breath darker beneath; at a low sun the tops of the bank catch its colour. MEDIUM: the scene's soft hand, no
 * outlines. ORDER: the bank's body, its wisps, the lit tops; the ridge's mass, then its line, heaviest where it shows.
 *
 * Nothing here moves: the bank is a tile the compositor drifts, the line a canvas the compositor lays from the place
 * outward (`anim.ts` `revealAt`), breathing and fading by its alpha.
 */

/** The four strengths a line's runs are stroked at, so a run's weight is a choice of path, not a stroke per segment. */
const STEPS = [0.25, 0.5, 0.75, 1]

export function paintLoading(ctx: Ctx2D, desc: LayerOf<'loading'>, env: PaintEnv): void {
  if (desc.part === 'mist') return paintBank(ctx, desc)
  paintRidge(ctx, desc, env)
}

/** The bank: C7's mist bands (body, then the puffs on its top), then the light a low sun lays on the tops of the puffs. */
function paintBank(ctx: Ctx2D, desc: Extract<LayerOf<'loading'>, { part: 'mist' }>) {
  mistBands(ctx, desc.bands, desc.bounds)
  const litAlpha = desc.litAlpha * smoothstep(0, 0.02, desc.litAlpha)
  const { x: bx, w } = desc.bounds
  for (const band of desc.bands) {
    for (const p of band.puffs) {
      for (const dx of [-w, 0, w]) {
        const x = bx + p.x + dx
        if (x + p.rx < bx || x - p.rx > bx + w) continue
        // The lit cap: a smaller soft ellipse riding the puff's top.
        soft(ctx, x, p.y - p.ry * 0.45, p.rx * 0.7, p.ry * 0.55, desc.lit, litAlpha * p.alpha * band.alpha, true)
      }
    }
  }
}

/**
 * A ridge glimpsed through the mist: its mass a breath darker under the line (stacked strips, lighter downward), then
 * the line itself, thick-thin and lost in places along its run (seeded noise along the crest), over a faint halo.
 */
function paintRidge(ctx: Ctx2D, desc: Extract<LayerOf<'loading'>, { part: 'ridge' }>, env: PaintEnv) {
  const { line, rgb, alpha, mass, seed } = desc
  if (line.length < 2) return
  const hair = Math.max(0.5, 1 / env.scale)
  // The mass: strips hanging from the line, each a little fainter, so the dark melts into the mist below.
  const strips = 14
  for (let k = 0; k < strips; k++) {
    const y0 = (mass * k) / strips, y1 = (mass * (k + 1)) / strips
    ctx.beginPath()
    line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + y0) : ctx.moveTo(x, y + y0)))
    for (let i = line.length - 1; i >= 0; i--) ctx.lineTo(line[i][0], line[i][1] + y1)
    ctx.closePath()
    ctx.fillStyle = css(rgb, alpha * 0.55 * (1 - k / strips) ** 1.8)
    ctx.fill()
  }
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  // The halo: the line's soft edge, one wide faint stroke.
  ctx.beginPath()
  line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.lineWidth = 3.2
  ctx.strokeStyle = css(rgb, alpha * 0.14)
  ctx.stroke()
  // The line: each short run at the strength the noise along the crest gives it (lost where it is faint), heavier where
  // it is strong.
  const strength = line.map(([x]) => {
    const n = fractal(seed, x, 0, 1 / 70, 1, 3)
    return Math.min(1, Math.max(0, (n - 0.3) / 0.45))
  })
  STEPS.forEach((step) => {
    ctx.beginPath()
    let any = false
    for (let i = 1; i < line.length; i++) {
      const k = (strength[i - 1] + strength[i]) / 2
      if (k > step || k <= step - 0.25) continue
      ctx.moveTo(line[i - 1][0], line[i - 1][1])
      ctx.lineTo(line[i][0], line[i][1])
      any = true
    }
    if (!any) return
    ctx.lineWidth = Math.max(hair, 0.55 + 1.05 * step)
    ctx.strokeStyle = css(rgb, alpha * (0.2 + 0.8 * (step - 0.125)))
    ctx.stroke()
  })
}
