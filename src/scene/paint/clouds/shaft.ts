import { css, type Ctx2D } from '../hand'
import type { RGB } from '../../../world/types'
import type { Rand } from './contour'

/*
 * A rain shaft or virga under a raining base (track D, SPEC §5), after Turner's *Rain, Steam and Speed* sky (1844) and
 * the WMO praecipitatio / virga plates. Rain falls from the base and trails: the drops falling at ~5–9 m/s through wind
 * shear lag behind the cloud, so the shaft slants back against the motion and curves where the shear is. Virga fades
 * out above the ground (it evaporates in dry air); praecipitatio reaches it.
 * Drawn as vertical streak strokes whose density is the rain's, never one gradient rectangle.
 */
export interface Shaft {
  /** Base width (px) and how far it falls (px) before the ground or evaporation. */
  w: number
  fall: number
  /** Screen slant over the fall (px, + to the right at the bottom). */
  trail: number
  /** 0–1: how heavy (streak count and opacity). */
  rate: number
  /** Reaches the ground (true) or evaporates as virga. */
  reaches: boolean
  tone: RGB
}

/** The shaft from its base's middle (origin) downward. */
export function paintShaft(c: Ctx2D, f: Shaft, r: Rand): void {
  // Many fine streaks, each faint: rain is seen as a veil of streaks, not as ropes.
  const n = Math.round(10 + 50 * f.rate * Math.min(1, f.w / 30))
  c.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    const u = r() - 0.5
    const x0 = u * f.w * 0.9
    // Streaks from the core reach further; the edges evaporate first.
    const reach = f.fall * (f.reaches ? 0.75 + 0.25 * r() : 0.35 + 0.45 * r()) * (1 - 0.5 * Math.abs(u) * 2 * (f.reaches ? 0.3 : 1))
    const y0 = r() * f.fall * 0.08
    const bend = f.trail * (reach / f.fall)
    const a = (0.05 + 0.12 * f.rate) * (1 - 0.6 * Math.abs(u) * 2)
    const g = c.createLinearGradient(0, y0, 0, y0 + reach)
    g.addColorStop(0, css(f.tone, a))
    g.addColorStop(f.reaches ? 0.8 : 0.4, css(f.tone, a * 0.7))
    g.addColorStop(1, css(f.tone, 0))
    c.strokeStyle = g
    c.lineWidth = Math.max(0.5, f.w * (0.008 + 0.012 * r()))
    c.beginPath()
    c.moveTo(x0, y0)
    // Shear bends the lower part more: the curve sits in the lower half.
    c.quadraticCurveTo(x0 + bend * 0.35, y0 + reach * 0.6, x0 + bend, y0 + reach)
    c.stroke()
  }
}
