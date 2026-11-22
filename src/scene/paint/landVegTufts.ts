import { plantInk, TUFT_TONE_STRIDE } from '../model/canopyTones'
import type { PlantWind } from '../model/landWind'
import type { CanopyVegetation } from '../model/types'
import { TONE } from '../model/vegSample'
import { css, type Ctx2D } from './hand'
import { TUFT_CROWN_BEND, tuftBend } from './landVegPose'
import { h01 } from './vegInk'

/** Scattered scrub cushions (WorldCover 20) and grass tufts (WorldCover 30), clearly readable at 375 px. */
export function paintVegTufts(ctx: Ctx2D, veg: CanopyVegetation, wind?: PlantWind, time = 0, ink?: Uint8Array): void {
  const { tufts, tuftMeta, tones, seed } = veg
  const count = tufts.length / 4
  if (!count || !tones.length) return
  for (let i = 0; i < count; i++) {
    const o = i * 4, x = tufts[o], y = tufts[o + 1], r = tufts[o + 2], alpha = tufts[o + 3]
    if (alpha <= 0.02) continue
    const kind = tuftMeta[i * 2], index = tuftMeta[i * 2 + 1]
    const highlight = kind === 1 ? TONE.GRASS_LIT : TONE.SHRUB_LIT
    const rgb = ink ? plantInk(ink, i * TUFT_TONE_STRIDE) : tones[index] ?? tones[0]
    const lit = ink ? plantInk(ink, i * TUFT_TONE_STRIDE + 3) : tones[highlight] ?? rgb

    const bend = tuftBend(seed, x, y, kind, r, alpha, wind, time)
    const crownX = x + bend * TUFT_CROWN_BEND

    // Grounded soft shadow under each tuft, proportional to tuft visibility so faded tufts disappear cleanly.
    ctx.beginPath()
    ctx.ellipse(x + r * 0.14, y + r * 0.24, r * 1.05, Math.max(0.30, r * 0.28), 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgb(0 0 0 / ${(0.26 * alpha).toFixed(3)})`
    ctx.fill()

    if (kind === 1) {
      // Grass / steppe tuft: low organic tussock mound + soft short curved blades (illustrated hand, never stiff sticks).
      const lean = (h01(seed, x, y, 23) - 0.5) * r * 0.55
      const dx = (h01(seed, x, y, 31) - 0.5) * r * 0.75
      ctx.beginPath()
      ctx.ellipse(x, y - r * 0.06, r * 1.05, Math.max(0.42, r * 0.48), 0, 0, Math.PI * 2)
      ctx.moveTo(crownX + dx + r * 0.72, y - r * 0.18)
      ctx.ellipse(crownX + dx, y - r * 0.18, r * 0.72, Math.max(0.36, r * 0.40), 0, 0, Math.PI * 2)
      ctx.fillStyle = css(rgb, alpha * 0.88); ctx.fill()

      ctx.beginPath()
      ctx.ellipse(crownX - r * 0.22, y - r * 0.26, r * 0.56, Math.max(0.28, r * 0.30), 0, 0, Math.PI * 2)
      ctx.fillStyle = css(lit, alpha * 0.58); ctx.fill()

      ctx.beginPath()
      ctx.moveTo(x - r * 0.35, y - r * 0.1); ctx.quadraticCurveTo(x - r * 0.65 + bend * 0.35, y - r * 0.55, x - r * 0.82 + lean + bend, y - r * 0.72)
      ctx.moveTo(x + r * 0.05, y - r * 0.12); ctx.quadraticCurveTo(x + lean * 0.5 + bend * 0.35, y - r * 0.58, x + lean * 0.9 + bend, y - r * 0.84)
      ctx.moveTo(x + r * 0.40, y - r * 0.08); ctx.quadraticCurveTo(x + r * 0.68 + bend * 0.35, y - r * 0.48, x + r * 0.80 + lean + bend, y - r * 0.64)
      ctx.strokeStyle = css(lit, alpha * 0.72); ctx.lineWidth = Math.max(0.45, r * 0.26); ctx.lineCap = 'round'; ctx.stroke()
    } else {
      // Scrub cushion: 2-lobe organic garrigue bush + lighter upper-left crown dab.
      const dx = (h01(seed, x, y, 29) - 0.5) * r * 0.78
      ctx.beginPath()
      ctx.ellipse(x, y - r * 0.12, r * 1.16, r * 0.68, 0, 0, Math.PI * 2)
      ctx.moveTo(crownX + dx + r * 0.78, y - r * 0.34)
      ctx.ellipse(crownX + dx, y - r * 0.34, r * 0.78, r * 0.54, 0, 0, Math.PI * 2)
      ctx.fillStyle = css(rgb, alpha * 0.94); ctx.fill()

      ctx.beginPath()
      ctx.ellipse(crownX - r * 0.26, y - r * 0.38, r * 0.58, r * 0.36, 0, 0, Math.PI * 2)
      ctx.fillStyle = css(lit, alpha * 0.62); ctx.fill()
    }
  }
}
