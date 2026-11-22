import type { RGB } from '../model/types'
import type { CloudSprite } from './clouds/sprite'
import { rng } from './core'
import { css, mix, type Ctx2D, type PaintEnv } from './hand'

/*
 * A tower (Cu con, Cg, Cb) in the sheets' soft hand (the owner's call, 22 Nov: soft and translucent, not cardboard). Two
 * steps on a scratch sheet, as the light lies on a mass and not on its parts: first the silhouette, soft puffs scattered up
 * a narrowing column (a cauliflower crown, a flat anvil on a Cb), alpha only; then the colour laid once over all of it
 * (`source-in`): greyer at the base, the body above, the light's side lit, the crown silvered against a sun behind.
 * No outlines, no filter; seeded by the cell. Pure: the sprite, its place and the scratch surface from `env`.
 */

/** Puffs per column width of height; the column's top width against its base; a Cb anvil's spread. */
const PUFFS = 5, TOP_WIDTH = 0.75, ANVIL = 1.3
/** Opacity of the thickest tower; optical depth over which a thin one comes up to it. */
const OPACITY = 0.92, TAU_FULL = 6

export function paintTower(c: Ctx2D, s: CloudSprite, x: number, y: number, env: PaintEnv): void {
  if (s.w < 0.5 || s.share <= 0.005 || s.tall < 0.5) return
  const alpha = OPACITY * (1 - Math.exp(-s.tau / TAU_FULL * 3)) * Math.min(1, s.share)
  const spread = s.genus === 'cb' ? ANVIL : 0.8
  const box = { x: -s.w * spread, y: -s.tall - s.w * 0.25, w: s.w * spread * 2, h: s.tall + s.w * 0.25 + s.under + 2 }
  const k = env.scale
  const w = Math.max(1, Math.ceil(box.w * k)), h = Math.max(1, Math.ceil(box.h * k))
  const sheet = env.canvas(w, h)
  const sc = sheet.ctx
  sc.setTransform(k, 0, 0, k, -box.x * k, -box.y * k)
  silhouette(sc, s)
  colour(sc, s, box)
  c.save()
  c.globalAlpha *= alpha
  c.drawImage(sheet.canvas as CanvasImageSource, x + box.x, y + box.y, box.w, box.h)
  c.restore()
}

/** The tower's alpha: soft puffs, larger and rounder toward the crown, over a flat soft base. */
function silhouette(c: Ctx2D, s: CloudSprite) {
  const r = rng(s.seed)
  const n = Math.max(6, Math.min(90, Math.round((s.tall / s.w) * PUFFS) + 4))
  puff(c, 0, s.under * 0.3, s.w * 0.5, Math.max(1, s.under * 0.5 + s.w * 0.06), 0.9)
  for (let i = 0; i < n; i++) {
    const t = Math.sqrt(r()) // more puffs high up: the crown is where a tower's turrets are
    const half = (s.w / 2) * (1 - (1 - TOP_WIDTH) * t)
    const rx = half * (0.45 + 0.35 * r()) * (0.8 + 0.4 * t)
    const cx = (r() * 2 - 1) * (half - rx * 0.6)
    const cy = -t * (s.tall - rx * 0.7)
    puff(c, cx, cy, rx, rx * (0.85 + 0.15 * r()), 0.75 + 0.25 * r())
  }
  if (s.genus === 'cb') {
    // The anvil: a thick soft cap spread wider than the column, thinning toward its edges.
    const top = -s.tall + s.w * 0.22
    for (let i = 0; i < 5; i++) {
      const u = i / 4 - 0.5
      const rx = s.w * (0.55 - 0.25 * Math.abs(u))
      puff(c, u * s.w * (ANVIL - 0.4), top + Math.abs(u) * s.w * 0.1, rx, rx * (0.45 + 0.1 * r()), 0.9)
    }
  }
}

function puff(c: Ctx2D, cx: number, cy: number, rx: number, ry: number, a: number) {
  if (rx <= 0 || ry <= 0) return
  c.save()
  c.translate(cx, cy)
  c.scale(1, ry / rx)
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, `rgba(255,255,255,${a})`)
  g.addColorStop(0.5, `rgba(255,255,255,${a * 0.8})`)
  g.addColorStop(0.8, `rgba(255,255,255,${a * 0.3})`)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = g
  c.beginPath()
  c.arc(0, 0, rx, 0, Math.PI * 2)
  c.fill()
  c.restore()
}

/** The colour, once over the whole mass: base to body up the column, then the light's side, then the silver crown. */
function colour(c: Ctx2D, s: CloudSprite, box: { x: number; y: number; w: number; h: number }) {
  const base: RGB = s.rains ? mix(s.shade, [0.2, 0.23, 0.27], 0.35) : s.shade
  const under = mix(base, s.lit, 0.6 * s.glow)
  c.globalCompositeOperation = 'source-in'
  const up = c.createLinearGradient(0, s.under, 0, -s.tall)
  up.addColorStop(0, css(under))
  up.addColorStop(0.12, css(mix(under, s.body, 0.35)))
  up.addColorStop(0.5, css(s.body))
  up.addColorStop(1, css(s.body))
  c.fillStyle = up
  c.fillRect(box.x, box.y, box.w, box.h)
  c.globalCompositeOperation = 'source-atop'
  const [tx, ty] = s.toward ?? [0, -1]
  if (s.litA > 0.02) {
    const reach = Math.max(s.w, s.tall) * 0.6, mid = -s.tall * 0.55
    const side = c.createLinearGradient(-tx * reach, mid - ty * reach, tx * reach, mid + ty * reach)
    side.addColorStop(0, css(s.lit, 0))
    side.addColorStop(0.55, css(s.lit, 0.25 * s.litA))
    side.addColorStop(1, css(s.lit, 0.85 * Math.min(1, s.litA)))
    c.fillStyle = side
    c.fillRect(box.x, box.y, box.w, box.h)
  }
  if (s.silver > 0.05) {
    const cx = tx * s.w * 0.3, cy = -s.tall * 0.85
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, s.w * 0.6)
    g.addColorStop(0, css(s.lit, 0.6 * s.silver))
    g.addColorStop(1, css(s.lit, 0))
    c.fillStyle = g
    c.fillRect(box.x, box.y, box.w, box.h)
  }
  c.globalCompositeOperation = 'source-over'
}
