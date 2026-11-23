import type { LayerOf } from '../../../model/types'
import { rng } from '../base/core'
import type { Ctx2D, PaintEnv } from '../base/hand'
import { soft } from '../base/softEllipse'

/**
 * Smoke and steam: puffs rising along the plume, old to young, growing and thinning as they go; the frame's phase moves
 * each puff one place along over the strip's loop (so the last frame runs into the first), the wobble a function of the
 * place along the plume alone. The top of each puff catches the light.
 */
export function paintSmoke(ctx: Ctx2D, desc: LayerOf<'smoke'>, env: PaintEnv): void {
  const frames = desc.animated?.frames
  const loop = frames ? frames.count / frames.fps : 1
  const p = ((env.phase / loop) % 1 + 1) % 1
  for (const plume of desc.plumes) {
    const r = rng(plume.seed)
    const wob = r() * Math.PI * 2, wobAmp = 0.6 + 1.2 * r()
    for (let k = plume.puffs - 1; k >= 0; k--) {
      const u = (k + p) / plume.puffs
      const along = u ** 0.85
      const px = plume.x + plume.dx * along + Math.sin(u * 9 + wob) * wobAmp * u
      const py = plume.y + plume.dy * u
      const rad = plume.r0 + (plume.r1 - plume.r0) * u ** 0.7
      const a = plume.alpha * (1 - u) ** 1.3 * Math.min(1, u / 0.1)
      soft(ctx, px, py, rad, rad * 0.85, plume.rgb, a)
      soft(ctx, px, py - rad * 0.3, rad * 0.7, rad * 0.55, plume.lit, a * 0.6)
    }
  }
}
