import type { PlantWind } from '../model/landWind'
import type { Lift, PlaneVegetation } from '../model/types'
import { css, type Ctx2D } from './hand'
import { treeBend, treeCrownAnchor, tuftBend, TUFT_CROWN_BEND } from './landVegPose'

/** Visibility tiers for batched catchlight ellipses so faded marks never outlast the underlying form. */
const LIFT_TIERS = [[0.08, 0.42, 0.28], [0.42, 0.76, 0.62], [0.76, 1.01, 1.0]] as const

export function paintVegLight(ctx: Ctx2D, vegetation: PlaneVegetation, lift: Lift, wind?: PlantWind, time = 0): void {
  const { trees, treeMeta, tufts, tuftMeta, seed } = vegetation
  if (trees.length) {
    for (const [lo, hi, wVis] of LIFT_TIERS) {
      let drawn = false
      ctx.beginPath()
      for (let i = 0; i < trees.length; i += 6) {
        const idx = i / 6, vis = (treeMeta[idx * 3 + 2] ?? 255) / 255
        const r = trees[i + 2]
        if (r < 0.9 || vis < lo || vis >= hi) continue
        const kind = treeMeta[idx * 3], h = trees[i + 3], phase = trees[i + 4]
        const bend = treeBend(kind, h, vis, phase, wind, time)
        const a = treeCrownAnchor(trees[i], trees[i + 1], r, h, phase, kind, bend)
        const cx = a.cx + lift.dx * a.rx * 0.28, cy = a.cy + lift.dy * a.ry * 0.30
        const rx = a.rx * 0.50, ry = a.ry * 0.42
        ctx.moveTo(cx + rx, cy)
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        drawn = true
      }
      if (drawn) { ctx.fillStyle = css(lift.rgb, lift.alpha * 0.40 * wVis); ctx.fill() }
    }
  }
  if (tufts.length) {
    for (const [lo, hi, wVis] of LIFT_TIERS) {
      let drawn = false
      ctx.beginPath()
      for (let i = 0; i < tufts.length; i += 4) {
        const r = tufts[i + 2], vis = tufts[i + 3]
        if (r < 0.8 || vis < lo || vis >= hi) continue
        const bend = tuftBend(seed, tufts[i], tufts[i + 1], tuftMeta[i / 2], r, vis, wind, time)
        const cx = tufts[i] + bend * TUFT_CROWN_BEND + lift.dx * r * 0.28, cy = tufts[i + 1] - r * 0.22 + lift.dy * r * 0.30
        const rx = r * 0.46, ry = r * 0.32
        ctx.moveTo(cx + rx, cy)
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        drawn = true
      }
      if (drawn) { ctx.fillStyle = css(lift.rgb, lift.alpha * 0.48 * wVis); ctx.fill() }
    }
  }
}
