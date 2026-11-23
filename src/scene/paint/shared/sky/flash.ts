import type { FallingCloud, LayerOf, RGB } from '../../../model/types'
import { rng } from '../base/core'
import { css, type Ctx2D, type PaintEnv } from '../base/hand'

/**
 * In-cloud lightning: the raining cloud lit from within, brightest low in its core where the stroke is, the light spilling
 * a little into the air round it. Laid with the flash schedule's alpha (`anim.ts`), so the painter draws one still sprite.
 * Worked at no finer than the CSS pixel (a soft glow has no sharper edge) on a scratch sheet, then laid 1:1.
 */
export function paintFlash(ctx: Ctx2D, desc: LayerOf<'flash'>, env: PaintEnv): void {
  const k = Math.min(env.scale, 1)
  if (k >= env.scale) { paintFlashAt(ctx, desc); return }
  const { x, y, w, h } = desc.bounds
  const sheet = env.canvas(Math.ceil(w * k) + 1, Math.ceil(h * k) + 1)
  sheet.ctx.setTransform(k, 0, 0, k, -x * k, -y * k)
  paintFlashAt(sheet.ctx, desc)
  ctx.drawImage(sheet.canvas as CanvasImageSource, x, y, sheet.canvas.width / k, sheet.canvas.height / k)
}

function paintFlashAt(ctx: Ctx2D, desc: LayerOf<'flash'>): void {
  const b = desc.cloud
  const r = rng(b.seed ^ 0x5eed)
  const cx = b.x + (r() - 0.5) * b.w * 0.4, cy = b.y - b.h * (0.25 + 0.3 * r())
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.w * 0.75)
  halo.addColorStop(0, css(desc.rgb, 0.35))
  halo.addColorStop(1, css(desc.rgb, 0))
  ctx.fillStyle = halo
  ctx.fillRect(cx - b.w * 0.75, cy - b.w * 0.75, b.w * 1.5, b.w * 1.5)
  for (const p of heapPuffs(b)) {
    const near = Math.exp(-Math.hypot(p.x - cx, p.y - cy) / (b.w * 0.35))
    glow(ctx, p, desc.rgb, 0.2 + 0.6 * near)
  }
}

interface Puff { x: number; y: number; rx: number; ry: number }

/** Domes in the glow: as many as the old heap had for a rain cell, so the lit shape is the one it was. */
const PUFFS = 9

/** The glow's heap: a soft flat base, domes piled on it highest near the middle, seeded by the cloud. */
function heapPuffs(b: FallingCloud): Puff[] {
  const r = rng(b.seed)
  const out: Puff[] = [{ x: b.x, y: b.y - b.h * 0.2, rx: b.w * 0.48, ry: b.h * 0.22 }]
  const crown = (r() - 0.5) * 0.3
  for (let i = 0; i < PUFFS; i++) {
    const t = r()
    const dome = Math.max(0, Math.sin(t * Math.PI) * (1 - 1.4 * Math.abs(t - 0.5 - crown)) + 0.15)
    const rx = b.w * (0.07 + r() * 0.1) * (0.6 + dome * 0.8)
    const ry = Math.min(rx * (0.7 + r() * 0.25), b.h * 0.5)
    const lift = Math.min(1, dome) * (b.h - ry) * (0.3 + r() * 0.7)
    out.push({ x: b.x + (t - 0.5) * b.w * 0.82, y: b.y - ry * 0.8 - lift, rx, ry })
  }
  return out.sort((a, c) => (a.y + a.ry) - (c.y + c.ry))
}

/** A dome of the glow: solid in its core, soft at its edge. */
function glow(ctx: Ctx2D, p: Puff, rgb: RGB, alpha: number) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.scale(1, p.ry / p.rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.rx)
  g.addColorStop(0, css(rgb, alpha))
  g.addColorStop(0.6, css(rgb, alpha))
  g.addColorStop(0.84, css(rgb, alpha * 0.55))
  g.addColorStop(1, css(rgb, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, p.rx, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
