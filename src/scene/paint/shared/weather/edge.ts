import type { LayerOf } from '../../../model/types'
import { rng } from '../base/core'
import type { Ctx2D, PaintEnv } from '../base/hand'
import { soft } from '../base/softEllipse'
import { curtain, type Fibres } from './curtain'

/** The edge mark: a heavy bank cut by the frame's edge, its curtain leaning downwind to the horizon. */
export function paintEdge(ctx: Ctx2D, desc: LayerOf<'edge'>, env: PaintEnv, fibres: Fibres): void {
  const { x, y, w, h, side, seed } = desc
  const dir = side === 'left' ? 1 : -1
  const cx = x + dir * w * 0.35
  const r = rng(seed)
  curtain(ctx, { x: cx, top: y - h * 0.15, bottom: desc.bounds.y + desc.bounds.h, w: w * 0.75, lean: desc.lean,
    rgb: desc.curtain, alpha: desc.alpha * 0.9, seed }, desc.precip === 'snow', env, fibres)
  // The bank: a shower cloud heaped on a flat base, towering on the side toward the frame (its body grows into the view):
  // puffs of seeded sizes along a rising profile, the base's shade as flattened puffs under them, the body over.
  const n = 11
  const puffs: { x: number; y: number; r: number }[] = []
  for (let i = 0; i < n; i++) {
    const t = (i + 0.3 + 0.4 * r()) / n
    // Higher toward the view's side (t → 1 runs inward from the edge).
    const rise = Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.55 + 0.6 * t)
    const rad = h * (0.38 + 0.4 * r()) * (0.75 + 0.5 * rise)
    puffs.push({ x: x + dir * (t * w * 0.95 - w * 0.08), y: y - rad * 0.55 - h * rise * (0.45 + 0.25 * r()), r: rad })
  }
  for (let i = 0; i < 6; i++) {
    const t = (i + 0.5) / 6
    soft(ctx, x + dir * (t * w * 0.9 - w * 0.05), y - h * 0.08, w * 0.16, h * 0.2, desc.shade, desc.alpha * 0.85)
  }
  for (const p of puffs) soft(ctx, p.x, p.y + p.r * 0.25, p.r * 1.05, p.r * 0.8, desc.shade, desc.alpha * 0.7)
  for (const p of puffs) soft(ctx, p.x - dir * p.r * 0.1, p.y - p.r * 0.1, p.r, p.r * 0.85, desc.body, desc.alpha)
}
