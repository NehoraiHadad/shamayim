import { css, mix, type Ctx2D } from '../hand'
import { crownFrame, lobed, padFrame, shift, trace, type Pt, type Rand } from './contour'
import { paintAnvil } from './anvil'
import type { CloudSprite } from './sprite'

/*
 * Cumulus, congestus, cumulonimbus (track D, SPEC §6). After Constable's Hampstead cumulus studies (1821–22) and the WMO
 * Cloud Atlas cumulus plates.
 * - Form: a hard, flat base on the cell's level line, with turrets heaped on it. The tallest turret is off centre and
 *   leans downwind; each turret's edge is lobed in two orders (cauliflower).
 * - Order of marks:
 *   1. The underside, seen in perspective.
 *   2. The turrets, back (tallest) to front. Each first casts its shade on what is already there (self-shadow in the
 *      clefts), then is laid in its own light: the lit side toward the source, falling to shade away from it.
 *   3. The base darkened by its depth.
 *   4. The lee edge torn into wisps.
 * - The thin rims, the silver and the translucency are the sprite's (`light.ts`), laid after on the whole mass.
 */

interface Turret { cx: number; foot: number; w: number; h: number; edge: Pt[] }

/** One dome: a crown standing on `foot` (y, up is −), its edge lobed in two orders, lobes sized to the dome. */
function dome(cx: number, foot: number, w: number, h: number, lean: number, r: Rand): Turret {
  const crown = crownFrame(cx, w, h, lean, 1.7 + 0.6 * r()).map(([x, y]) => [x, y + foot] as Pt)
  return { cx, foot, w, h, edge: lobed(crown, r, [w * 0.14, w * 0.3], 0.3, 1) }
}

/**
 * The heap as domes, never fingers: a dome is never much taller than wide (h ≤ 0.9 w). A cumulus is one row of them on
 * its base; a congestus or cumulonimbus stacks tiers, each narrower, the column's axis sheared downwind by `lean`.
 * Back to front: the upper tiers first (they stand behind), the base row last.
 */
function turretsOf(s: CloudSprite, r: Rand): Turret[] {
  const tall = Math.max(s.tall, 1)
  const crownX = ((r() - 0.5) * 0.3 + 0.1 * s.lean) * s.w
  const out: Turret[] = []
  const rowH = Math.min(tall, s.w * 0.42)
  const tiers = Math.max(1, Math.round(tall / rowH))
  for (let k = tiers - 1; k >= 0; k--) {
    const foot = -(k / tiers) * tall * 0.92
    const span = s.w * (1 - 0.55 * (k / Math.max(1, tiers - 1)) ** 0.8) * (tiers > 1 ? 1 : 0.95)
    const axis = crownX * (k / tiers) + s.lean * (-foot) * 0.35
    const n = Math.max(1, Math.round(span / (rowH * 1.1) + r()))
    const row: Turret[] = []
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1)
      const w = (span / n) * (1.35 + 0.35 * r())
      const cx = axis + (t - 0.5) * (span - w * 0.7) + (r() - 0.5) * w * 0.15
      const near = 1 - Math.min(1, Math.abs(cx - axis) / (span * 0.6))
      const h = Math.min(w * 0.9, (tall / tiers) * (0.75 + 0.55 * near) * (0.85 + 0.3 * r()) + (k === tiers - 1 ? 0 : rowH * 0.3))
      row.push(dome(cx, foot + (k > 0 ? h * 0.25 : 0), w, h, s.lean, r))
    }
    out.push(...row.sort((a, b) => b.h - a.h))
  }
  return out
}

/** The whole heap on `c` (sprite px, origin at the near base's middle), at full alpha: `light.ts` models it after. */
export function paintCumulus(c: Ctx2D, s: CloudSprite, r: Rand): void {
  const [tx, ty] = s.toward ?? [0, -1]
  const baseTone = mix(s.shade, s.body, 0.45 + 0.55 * Math.exp(-s.tau / 12))
  // 1. The underside: a flat pad from the near edge back to the far one, darker as the cell is thicker.
  if (s.under > 0.5) {
    const pad = lobed(padFrame(0, s.under / 2, s.w * 0.98, s.under, r), r, [s.w * 0.05, s.w * 0.12], 0.18, -1, 1)
    trace(c, pad)
    c.fillStyle = css(baseTone)
    c.fill()
  }
  if (s.tall < 0.5) return
  // 2. The turrets.
  const d = Math.max(1.5, s.w * 0.05)
  for (const t of turretsOf(s, r)) {
    const shape = [[t.cx - t.w / 2, t.foot] as Pt, ...t.edge, [t.cx + t.w / 2, t.foot] as Pt]
    // Its shade on what stands behind it, thrown away from the light.
    c.save()
    c.globalCompositeOperation = 'source-atop'
    trace(c, shift(shape, -tx * d, -ty * d * 0.6))
    c.fillStyle = css(s.shade, 0.55)
    c.fill()
    c.restore()
    // The turret in its light: lit toward the source, its own shade away from it and toward its foot.
    const my = t.foot - t.h * 0.5
    const g = c.createLinearGradient(t.cx + tx * t.w * 0.5, my + ty * t.h * 0.6, t.cx - tx * t.w * 0.5, my - ty * t.h * 0.4 + t.h * 0.3)
    g.addColorStop(0, css(mix(s.body, s.lit, 0.55 * s.litA)))
    g.addColorStop(0.45, css(s.body))
    g.addColorStop(1, css(mix(s.body, s.shade, 0.75)))
    trace(c, shape)
    c.fillStyle = g
    c.fill()
  }
  if (s.genus === 'cb') paintAnvil(c, s, r, s.lean * s.tall * 0.35)
  // 3. The base: the cell's depth darkens its lower part, darkest where it rains.
  c.save()
  c.globalCompositeOperation = 'source-atop'
  const foot = Math.min(s.tall * 0.45, s.w * 0.25)
  const g = c.createLinearGradient(0, -foot, 0, s.under + 1)
  g.addColorStop(0, css(baseTone, 0))
  g.addColorStop(0.7, css(baseTone, 0.8))
  g.addColorStop(1, css(s.rains ? mix(baseTone, [0.12, 0.14, 0.18], 0.45) : baseTone, 1))
  c.fillStyle = g
  c.fillRect(-s.w, -foot, 2 * s.w, foot + s.under + 2)
  c.restore()
  // 4. The lee side torn: small bites out of the downwind edge, and the wisps it sheds.
  tear(c, s, r)
}

/** Evaporating fringe on the downwind side: a few wisps dragged off the edge (no holes punched in the body). */
function tear(c: Ctx2D, s: CloudSprite, r: Rand) {
  const side = s.lean >= 0 ? 1 : -1
  c.save()
  c.lineCap = 'round'
  for (let i = 0; i < 4; i++) {
    const y = -Math.min(s.tall, s.w * 0.4) * (0.1 + 0.5 * r())
    const x = side * s.w * (0.42 + 0.08 * r())
    const len = s.w * (0.08 + 0.12 * r())
    c.strokeStyle = css(s.body, 0.25 + 0.2 * r())
    c.lineWidth = Math.max(0.6, s.w * 0.015)
    c.beginPath()
    c.moveTo(x, y)
    c.quadraticCurveTo(x + side * len * 0.6, y - len * 0.08, x + side * len, y + len * 0.1)
    c.stroke()
  }
  c.restore()
}
