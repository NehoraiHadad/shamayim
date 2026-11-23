import { seeded } from '../../../../src/data/landmarks/hash'
import type { ReceiverBrush, ReceiverInk } from '../../../../src/scene/paint/shared/land/receiverBrush'

/*
 * A crown as the eye sees it from afar: no outline and no lobes, a mass of small leaf clumps, dark inside and under, lit on
 * the light's side, its edge broken. Three passes, dark to light. Pure: a place, a size and a seed.
 */

/** A crown's inks: its underside, its body and its lit leaves. */
export interface Leaf { dark: ReceiverInk; body: ReceiverInk; lit: ReceiverInk }

const FULL_AT = 2.4

/** `side` is the light's side across the picture (−1 left … 1 right), `alpha` the crown's own cover. */
export function crown(brush: ReceiverBrush, cx: number, cy: number, rx: number, ry: number, seed: number, leaf: Leaf, side: number, alpha: number): void {
  const r = seeded(seed), size = Math.max(rx, ry)
  if (size < 0.7) {
    const path = brush.path()
    path.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    brush.fill(leaf.body, 0.9 * alpha)
    return
  }
  const clumps = Math.round(5 + 13 * Math.min(1, size / FULL_AT / 2))
  const pass = (ink: ReceiverInk, a: number, count: number, reach: number, dab: number, dx: number, dy: number) => {
    const path = brush.path()
    for (let n = 0; n < count; n++) {
      const turn = r() * Math.PI * 2, out = Math.sqrt(r()) * reach
      const x = cx + dx * rx + Math.cos(turn) * out * rx
      const y = cy + dy * ry + Math.sin(turn) * out * ry * (Math.sin(turn) > 0 ? 0.75 : 1)
      const w = Math.max(0.35, dab * rx * (0.6 + 0.7 * r())), h = w * (0.65 + 0.25 * r())
      path.moveTo(x + w, y)
      path.ellipse(x, y, w, h, 0, 0, Math.PI * 2)
    }
    brush.fill(ink, a)
  }
  pass(leaf.dark, 0.95 * alpha, clumps, 0.64, 0.36, -0.08 * side, 0.16)
  pass(leaf.body, 0.8 * alpha, Math.round(clumps * 1.4), 0.66, 0.27, 0.08 * side, -0.08)
  if (size < 0.9) return
  pass(leaf.lit, 0.62 * alpha, clumps, 0.54, 0.2, 0.22 * side, -0.28)
  pass(leaf.lit, 0.55 * alpha, Math.round(clumps * 0.5), 0.34, 0.14, 0.34 * side, -0.42)
}

/** The crown's soft shade on the ground, away from the light. */
export function underShade(brush: ReceiverBrush, x: number, y: number, rx: number, side: number, alpha: number): void {
  for (const [k, a] of [[1.25, 0.1], [0.95, 0.14], [0.6, 0.16]] as const) {
    const path = brush.path()
    path.ellipse(x - side * rx * 0.35, y + 0.2, rx * k, Math.max(0.3, rx * 0.26 * k), 0, 0, Math.PI * 2)
    brush.fill([[0.02, 0.03, 0.03]], a * alpha)
  }
}
