import { smoothstep } from '../../../../src/domain/smoothstep'
import type { CloudSprite } from '../../../../src/scene/model/cloudSprite'
import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { mix, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { towerSurface } from './towerLumps'

/*
 * A tower in natural light: its heads lit from the model's own side, its far sides and creases in the model's shade, its
 * lower column in the shade of what stands over it, its foot melting into the rain and haze. Every tone is the model's.
 */

const OPACITY = 0.96, TAU_FULL = 6
/** The light's height toward the viewer, and how far it wraps round a head. */
const FRONT = 0.35, WRAP = 0.45
/** Over the model's lit colour, the brightest crowns. */
const CROWN = 0.16

export function paintCloudCells(ctx: Ctx2D, desc: LayerOf<'cloudCells'>, env: PaintEnv): void {
  for (const { sprite, x, y } of desc.cells) paintTower(ctx, sprite, x, y, env)
}

function paintTower(c: Ctx2D, s: CloudSprite, x: number, y: number, env: PaintEnv): void {
  if (s.w < 0.5 || s.share <= 0.005 || s.tall < 0.5) return
  const f = towerSurface(s), { canvas, ctx } = env.canvas(f.w, f.h)
  const image = ctx.createImageData(f.w, f.h), data = image.data
  for (let j = 0, n = 0, o = 0; j < f.h; j++) {
    const py = f.y + (j + 0.5) / f.k, up = Math.min(1, Math.max(0, -py / s.tall))
    for (let i = 0; i < f.w; i++, n++, o += 4) {
      const a = f.cover[n]
      if (a < 0.004) continue
      const rgb = toneAt(s, f.nx[n], f.ny[n], f.nz[n], f.high[n], up, a)
      data[o] = rgb[0] * 255; data[o + 1] = rgb[1] * 255; data[o + 2] = rgb[2] * 255
      data[o + 3] = a * 255 * footAt(s, up, py)
    }
  }
  ctx.putImageData(image, 0, 0)
  c.save()
  c.globalAlpha *= OPACITY * (1 - Math.exp(-s.tau / TAU_FULL * 3)) * Math.min(1, s.share)
  c.imageSmoothingEnabled = true
  c.imageSmoothingQuality = 'high'
  c.drawImage(canvas as CanvasImageSource, x + f.x, y + f.y, f.w / f.k, f.h / f.k)
  c.restore()
}

/** The foot's own cover: a far tower's melts into the haze, a near one's into the rain under it. */
const footAt = (s: CloudSprite, up: number, py: number) =>
  (0.35 + 0.65 * smoothstep(0, s.w < 70 ? 0.4 : 0.18, up)) * (1 - smoothstep(0, Math.max(2, 0.06 * s.w), py))

function toneAt(s: CloudSprite, nx: number, ny: number, nz: number, high: number, up: number, a: number): RGB {
  const [tx, ty] = s.toward ?? [0, -1], lit = Math.min(1, s.litA)
  const norm = Math.hypot(tx, ty, FRONT), facing = (nx * tx + ny * ty + nz * FRONT) / norm
  const beam = lit * smoothstep(-WRAP, 1, facing)
  const sky = 0.5 - 0.5 * ny
  // A head deep behind its neighbours lies in their shade; the lower column in the whole tower's.
  const crease = smoothstep(0, 0.34, high + 0.06)
  const over = smoothstep(0, 0.62, up)
  const place = Math.min(1, (0.45 * sky + 0.7 * beam + 0.1) * (0.62 + 0.38 * crease) * (0.4 + 0.6 * over))
  let rgb = place < 0.5 ? mix(s.shade, s.body, place * 2) : mix(s.body, s.lit, place * 2 - 1)
  const rim = s.silver * (1 - a) * over
  const crown = Math.min(1, Math.max(0, place - 0.62) * 2.2 * over + 0.6 * rim)
  const bright = s.lit.map((v) => Math.min(1, v * (1 + CROWN))) as unknown as RGB
  rgb = mix(rgb, bright, crown)
  return s.glow > 0 ? mix(rgb, s.lit, 0.5 * s.glow * (1 - over)) : rgb
}
