import { smoothstep } from '../../domain/smoothstep'
import type { RGB } from '../model/types'
import type { CloudSprite } from './clouds/sprite'
import { rng } from './core'
import { css, mix, type Ctx2D } from './hand'

/*
 * A tower (Cu con, Cb) in the sheets' soft hand (the owner's call, 22 Nov: soft and translucent, not cardboard): a
 * column of soft round puffs, each a radial wash lit on the light's side, the column narrowing as it climbs, greyer at
 * its base, a soft flat anvil on a Cb's top, its underside a shaded wash. No outlines, no filter; seeded by the cell.
 * Pure: the sprite and its place, nothing else.
 */

/** Puffs per level of the column, and the column's height per level as a share of its width. */
const PER_LEVEL = 3, LEVEL = 0.32
/** The column's width at its top against its base (towers narrow as they climb), and a Cb anvil's spread. */
const TOP_WIDTH = 0.7, ANVIL = 1.25
/** Opacity of the thickest tower; optical depth over which a thin one comes up to it. */
const OPACITY = 0.9, TAU_FULL = 6

export function paintTower(c: Ctx2D, s: CloudSprite, x: number, y: number): void {
  if (s.w < 0.5 || s.share <= 0.005) return
  const r = rng(s.seed)
  const alpha = OPACITY * (1 - Math.exp(-s.tau / TAU_FULL * 3)) * Math.min(1, s.share)
  const [tx, ty] = s.toward ?? [0, -1]
  const lit = mix(s.body, s.lit, Math.min(1, s.litA))
  const base = s.rains ? mix(s.shade, [0.2, 0.23, 0.27], 0.35) : s.shade
  const under = mix(base, s.lit, 0.6 * s.glow)
  if (s.under > 0.5) wash(c, x, y + s.under / 2, s.w / 2, Math.max(1, s.under / 2), under, under, alpha, 0, 0)
  const levels = Math.max(2, Math.min(16, Math.round(s.tall / (s.w * LEVEL))))
  const anvil = s.genus === 'cb'
  for (let i = 0; i < levels; i++) {
    const t = i / (levels - 1)
    const width = s.w * (1 - (1 - TOP_WIDTH) * t)
    const cy = y - t * s.tall * (anvil ? 0.88 : 0.92)
    const tone = mix(base, s.body, smoothstep(0, 0.45, t))
    const puffLit = mix(tone, lit, 0.4 + 0.6 * t)
    for (let k = 0; k < PER_LEVEL; k++) {
      const rx = width * (0.3 + 0.12 * r())
      const ox = (k - (PER_LEVEL - 1) / 2) * width * 0.28 + (r() - 0.5) * width * 0.12 + s.lean * t * s.tall * 0.3
      wash(c, x + ox, cy - rx * 0.1 * r(), rx, rx * 0.9, puffLit, tone, alpha, tx, ty)
    }
  }
  if (anvil) {
    const top = y - s.tall
    wash(c, x + s.lean * s.tall * 0.3, top + s.w * 0.08, s.w * ANVIL * 0.5, Math.max(1.5, s.w * 0.12), lit, s.body, alpha,
      tx, ty)
  }
  if (s.silver > 0.05) rim(c, s, x, y, alpha)
}

/** A soft elliptical wash: `lit` toward the light, `body` across it, nothing at its edge. */
function wash(c: Ctx2D, cx: number, cy: number, rx: number, ry: number, lit: RGB, body: RGB, alpha: number, tx: number,
  ty: number) {
  c.save()
  c.translate(cx, cy)
  c.scale(1, ry / rx)
  const g = c.createRadialGradient(tx * rx * 0.35, (ty * rx * 0.35 * rx) / ry, 0, 0, 0, rx)
  g.addColorStop(0, css(lit, alpha))
  g.addColorStop(0.55, css(body, alpha * 0.85))
  g.addColorStop(1, css(body, 0))
  c.fillStyle = g
  c.beginPath()
  c.arc(0, 0, rx, 0, Math.PI * 2)
  c.fill()
  c.restore()
}

/** The silver lining: the thin top and the side toward a sun behind, a light wash laid over the column's crown. */
function rim(c: Ctx2D, s: CloudSprite, x: number, y: number, alpha: number) {
  const [tx, ty] = s.toward ?? [0, -1]
  const cx = x + tx * s.w * 0.3, cy = y - s.tall * 0.8 + ty * s.w * 0.15
  c.save()
  c.globalCompositeOperation = 'lighter'
  wash(c, cx, cy, s.w * 0.45, s.w * 0.35, s.lit, s.lit, 0.35 * s.silver * alpha, 0, 0)
  c.restore()
}
