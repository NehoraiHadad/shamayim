import type { LayerOf } from '../model/types'
import { css, type Ctx2D, type PaintEnv } from './hand'
import { TEXEL } from './landSurface'
import { preparePlaneTexels, samplePlaneTexel, shadeTexelSrgb } from './planeTexel'

/*
 * Solar cloud-shadow painter (Stage 7 round 2):
 * When paired with `desc.litPlane`, removes ONLY the direct solar term per receiver (actual normal, terrain visibility,
 * snow reflectance) BEFORE `^0.6` compression and BEFORE linear Koschmieder haze, outputting `(C_diff, a_eff)` so
 * `source-atop` produces exact `C_shadow` without ever darkening path haze, snow sky-light, water, buildings, or
 * transparent/loading pixels. Falls back to soft radial ellipses for synthetic callers without `litPlane`.
 */
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Smooth umbra + penumbra radial falloff matching the 0.53° solar disc & cloud edge. */
function blobFalloff(d2: number): number {
  if (d2 >= 1) return 0
  const d = Math.sqrt(d2)
  if (d <= 0.45) return 1 - (d / 0.45) * 0.10
  if (d <= 0.80) return 0.90 - ((d - 0.45) / 0.35) * 0.55
  return 0.35 * (1 - (d - 0.80) / 0.20)
}

export function paintCloudShadow(ctx: Ctx2D, desc: LayerOf<'cloudShadow'>, env: PaintEnv): void {
  const { blobs, rgb, bounds, litPlane } = desc
  if (!blobs.length) return
  if (litPlane && litPlane.surfaceTone.palette.length && litPlane.surfaceTone.cells.length) {
    const lp = litPlane, pBounds = lp.bounds
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    const active = blobs.filter((b) => b.alpha > 0.004 && b.x + b.rx >= 0 && b.x - b.rx <= bounds.w)
    if (!active.length) return
    for (const b of active) {
      x0 = Math.min(x0, b.x - b.rx); x1 = Math.max(x1, b.x + b.rx)
      y0 = Math.min(y0, b.y - b.ry); y1 = Math.max(y1, b.y + b.ry)
    }
    const i0 = Math.max(0, Math.floor((x0 - pBounds.x) / TEXEL))
    const j0 = Math.max(0, Math.floor((y0 - pBounds.y) / TEXEL))
    const t = preparePlaneTexels(lp.outline, pBounds, lp.surfaceTone, lp.litField, lp.grainSeed, lp.grainAmount)
    const i1 = Math.min(t.wPx - 1, Math.ceil((x1 - pBounds.x) / TEXEL))
    const j1 = Math.min(t.hPx - 1, Math.ceil((y1 - pBounds.y) / TEXEL))
    const rw = i1 - i0 + 1, rh = j1 - j0 + 1
    if (rw <= 0 || rh <= 0) return

    const scratch = env.canvas(rw, rh)
    const image = scratch.ctx.createImageData(rw, rh), data = image.data
    for (let jj = 0; jj < rh; jj++) {
      const j = j0 + jj, y = pBounds.y + (j + 0.5) * TEXEL
      for (let ii = 0; ii < rw; ii++) {
        const i = i0 + ii, x = pBounds.x + (i + 0.5) * TEXEL
        let pass = 1
        for (const b of active) {
          const dx = (x - b.x) / b.rx, dy = (y - b.y) / b.ry, d2 = dx * dx + dy * dy
          if (d2 < 1) pass *= 1 - b.alpha * blobFalloff(d2)
        }
        const a = 1 - pass
        if (a <= 0.004) continue
        const s = samplePlaneTexel(t, i, x, y)
        // Terrain already self-shadowed (`sVis === 0`) loses no additional direct sunlight.
        if (s.sVis <= 1e-4) continue
        const cLit = shadeTexelSrgb(t, s, 1)
        const cDiff = shadeTexelSrgb(t, s, 0)
        const cSh = shadeTexelSrgb(t, s, 1 - a)
        const yLit = 0.299 * cLit[0] + 0.587 * cLit[1] + 0.114 * cLit[2]
        const yDiff = 0.299 * cDiff[0] + 0.587 * cDiff[1] + 0.114 * cDiff[2]
        const ySh = 0.299 * cSh[0] + 0.587 * cSh[1] + 0.114 * cSh[2]
        const span = yLit - yDiff
        if (span <= 1e-4) continue
        const aEff = clamp01((yLit - ySh) / span)
        const o = (jj * rw + ii) * 4
        data[o] = Math.round(cDiff[0] * 255)
        data[o + 1] = Math.round(cDiff[1] * 255)
        data[o + 2] = Math.round(cDiff[2] * 255)
        data[o + 3] = Math.round(aEff * 255)
      }
    }
    scratch.ctx.putImageData(image, 0, 0)
    ctx.imageSmoothingEnabled = true
    ;(ctx as CanvasRenderingContext2D).imageSmoothingQuality = 'low'
    ctx.drawImage(scratch.canvas as CanvasImageSource, pBounds.x + i0 * TEXEL, pBounds.y + j0 * TEXEL, rw * TEXEL, rh * TEXEL)
    return
  }

  for (const b of blobs) {
    if (b.x + b.rx < 0 || b.x - b.rx > bounds.w || b.alpha <= 0) continue
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.scale(1, b.ry / b.rx)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, b.rx)
    g.addColorStop(0, css(rgb, b.alpha))
    g.addColorStop(0.45, css(rgb, b.alpha * 0.9))
    g.addColorStop(0.8, css(rgb, b.alpha * 0.35))
    g.addColorStop(1, css(rgb, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, b.rx, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}
