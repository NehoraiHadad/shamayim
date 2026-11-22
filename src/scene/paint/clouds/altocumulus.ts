import { css, mix, type Ctx2D } from '../hand'
import { lobed, padFrame, trace, type Rand } from './contour'
import type { CloudSprite } from './sprite'

/*
 * Altocumulus (track D, SPEC §6), after Stieglitz's *Equivalents* (1925–34) and the WMO Ac stratiformis perlucidus
 * plates. A patch of small rounded elements ("sheep") on a loose quincunx, blue between them. Each element has a shaded
 * underside and a lit edge. At the patch's edge they shrink, thin and fray. Seen low on the dome the rows close up into
 * bands (the patch's own foreshortening, `under` against `w`).
 * Order: element by element, back rows (top of the sprite) to front.
 */
export function paintAltocumulus(c: Ctx2D, s: CloudSprite, r: Rand): void {
  const h = Math.max(2, s.under + s.tall)
  const top = s.under - h
  // Element pitch: a patch holds 6–12 across (elements 0.1–0.35 km in a 3–15 km patch); rows by the patch's depth.
  const across = Math.max(3, Math.round(5 + 4 * r()))
  const pitch = s.w / across
  const flat = Math.min(1, h / s.w)
  const rowH = Math.max(2.4, pitch * Math.max(0.45, flat))
  const rows = Math.max(1, Math.round(h / rowH))
  for (let j = 0; j < rows; j++) {
    const y = top + (j + 0.5) * (h / rows)
    const shiftX = (j % 2) * pitch * 0.5
    for (let i = 0; i < across; i++) {
      const x = -s.w / 2 + (i + 0.5) * pitch + shiftX + (r() - 0.5) * pitch * 0.35
      // How far in the patch: the edge elements are smaller, thinner and fewer.
      const u = Math.hypot((x / (s.w / 2)), (y - (top + h / 2)) / (h / 2))
      if (u > 1.05 || r() < 0.12 + 0.5 * Math.max(0, u - 0.6)) continue
      const size = 1 - 0.55 * Math.max(0, u - 0.4)
      const ew = pitch * (0.75 + 0.3 * r()) * size, eh = Math.max(ew * 0.45, rowH * (0.7 + 0.2 * r())) * size
      element(c, s, r, x, y, ew, eh, 1 - 0.6 * Math.max(0, u - 0.5))
    }
  }
}

function element(c: Ctx2D, s: CloudSprite, r: Rand, x: number, y: number, w: number, h: number, alpha: number) {
  if (w < 0.8) return
  const edge = w > 4 ? lobed(padFrame(x, y, w, h, r, 8), r, [w * 0.2, w * 0.4], 0.2, -1, 1) : padFrame(x, y, w, h, r, 8)
  const [tx, ty] = s.toward ?? [0, -1]
  // Lit edge toward the light, shaded underside away from it: a gradient across the element along the light.
  const g = c.createLinearGradient(x + tx * w * 0.5, y + ty * h * 0.5, x - tx * w * 0.5, y - ty * h * 0.5 + h * 0.3)
  g.addColorStop(0, css(mix(s.body, s.lit, 0.6 * s.litA), alpha))
  g.addColorStop(0.5, css(s.body, alpha))
  g.addColorStop(1, css(mix(s.body, s.shade, 0.6), alpha))
  trace(c, edge)
  c.fillStyle = g
  c.fill()
}
