import type { FallMark, LayerOf } from '../../../model/types'
import { css, type Ctx2D, type PaintEnv } from '../base/hand'
import { STEPS } from './steps'

/*
 * The weather in the enriched hand (stage C7), after the anidoodle skill's craft notes (`realism-and-craft.md`: no
 * filter, soft edges by stacked copies and gradients, marks sized to what they draw; `craft-bar.md`: no even scatter, lost
 * edges). Real reference, from life and photographs of the Galilee and the coast in winter: rain shafts under a cumulus
 * line seen 5–20 km off (dark fibrous curtains leaning downwind, densest under the base, thinning toward the ground, the
 * far ridge showing through); near rain as thin bright streaks against dark ground and grey streaks against the sky;
 * valley fog lying level after a wet night with the ridges standing out of it; a cooling tower's plume bending over in
 * the wind; wet limestone and roads sending back the sky in short level glints; crepuscular rays fanning from a low sun
 * through gaps in a broken deck. MEDIUM: the scene's soft hand, no outlines. ORDER: a curtain's body, then its strands;
 * a fog's body, then the puffs on its top; a plume's puffs old to young.
 *
 * Animation is never painted per frame: falling tiles and drifting bands are laid by the compositor; a strip (smoke) is
 * painted once per frame of its loop at `env.phase`, and its motion is periodic over the loop.
 */

/** Each mark of a tile, and its copies across the tile's edges (the tile repeats as a pattern). */
function wrapped(marks: readonly FallMark[], w: number, h: number, reach: number, each: (m: FallMark, x: number, y: number) => void) {
  for (const m of marks) {
    for (const dx of [-w, 0, w]) {
      for (const dy of [-h, 0, h]) {
        const x = m.x + dx, y = m.y + dy
        if (x < -reach || x > w + reach || y < -reach || y > h + reach) continue
        each(m, x, y)
      }
    }
  }
}

/**
 * A falling tile: rain as streaks along the slant (a bright head and a fainter tail: motion seen in one glance), snow as
 * soft flakes, batched by strength. The compositor lays it as a moving pattern inside the areas it falls in.
 */
export function paintFall(ctx: Ctx2D, desc: LayerOf<'fall'>, env: PaintEnv): void {
  const { w, h } = desc.bounds
  const hair = Math.max(0.5, 1 / env.scale)
  if (desc.precip === 'rain') {
    const len = Math.hypot(desc.slant, 1)
    const ux = desc.slant / len, uy = 1 / len
    ctx.lineCap = 'round'
    STEPS.forEach((step, k) => {
      for (const [part, width, a] of [[1, 1, 0.45], [0.55, 1.15, 1]] as const) {
        ctx.beginPath()
        let any = false
        wrapped(desc.marks, w, h, 24, (m, x, y) => {
          if (m.alpha > step || m.alpha <= step - 0.25) return
          // Head at (x, y); the tail runs back up the slant.
          ctx.moveTo(x, y)
          ctx.lineTo(x - ux * m.len * part, y - uy * m.len * part)
          any = true
        })
        if (!any) continue
        ctx.lineWidth = hair * (m0(desc.marks) > 10 ? 1.2 : 1) * width
        ctx.strokeStyle = css(desc.rgb, (step - 0.125) * a * (k === 3 ? 1 : 0.9))
        ctx.stroke()
      }
    })
    return
  }
  STEPS.forEach((step) => {
    for (const [grow, a] of [[1.8, 0.3], [1, 0.85]] as const) {
      ctx.beginPath()
      let any = false
      wrapped(desc.marks, w, h, 4, (m, x, y) => {
        if (m.alpha > step || m.alpha <= step - 0.25) return
        const r = Math.max(hair * 0.6, m.r * grow)
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
        any = true
      })
      if (!any) continue
      ctx.fillStyle = css(desc.rgb, (step - 0.125) * a)
      ctx.fill()
    }
  })
}
const m0 = (marks: readonly FallMark[]) => marks.reduce((max, m) => Math.max(max, m.len), 0)
