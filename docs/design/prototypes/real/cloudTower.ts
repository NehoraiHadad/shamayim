import { smoothstep } from '../../../../src/domain/smoothstep'
import type { CloudSprite } from '../../../../src/scene/model/cloudSprite'
import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { mix, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { cloudLight } from './cloudLight'
import { cloudTone } from './cloudTone'
import { towerField } from './towerField'

/*
 * A tower in natural light, by the sheets' own hand: a soft body the light goes through, lit from the model's side, its
 * lower column and flat base in its shade, its foot melting into the rain and haze. Every tone is the model's.
 */

const OPACITY = 0.97, TAU_FULL = 6
/** Where the light stands, in the sprite's own px. */
const AFAR = 1e4
/** A tower this wide (px) keeps its whole contrast, one this narrow a far cloud's. */
const NEAR = [14, 90] as const, KEEP = 0.3
/** The tone of a column's foot and of its top: the tower's own mean, darker to its base. */
const FOOT_TONE = 0.72, TOP_TONE = 0.3

export function paintCloudCells(ctx: Ctx2D, desc: LayerOf<'cloudCells'>, env: PaintEnv): void {
  for (const { sprite, x, y } of desc.cells) paintTower(ctx, sprite, x, y, env)
}

function paintTower(c: Ctx2D, s: CloudSprite, x: number, y: number, env: PaintEnv): void {
  if (s.w < 0.5 || s.share <= 0.005 || s.tall < 0.5) return
  const toward = s.toward ?? [0, -1] as const, f = towerField(s, toward)
  const light = cloudLight(f, { x: toward[0] * AFAR, y: toward[1] * AFAR }, f.x, f.y)
  const { canvas, ctx } = env.canvas(f.w, f.h)
  const image = ctx.createImageData(f.w, f.h), data = image.data
  const beam = Math.min(1, s.litA), near = KEEP + (1 - KEEP) * smoothstep(NEAR[0], NEAR[1], s.w)
  for (let j = 0, n = 0, o = 0; j < f.h; j++) {
    const py = f.y + (j + 0.5) / f.k, up = Math.min(1, Math.max(0, -py / s.tall)), foot = footAt(s, up, py)
    for (let i = 0; i < f.w; i++, n++, o += 4) {
      const a = f.alpha[n]
      if (a < 0.004) continue
      const over = smoothstep(0, 0.7, up)
      let rgb: RGB = cloudTone(s, { tone: FOOT_TONE + (TOP_TONE - FOOT_TONE) * over, sun: beam * light.sun[n], sky: light.sky[n] * (0.4 + 0.6 * over),
        deep: light.deep[n], base: Math.max(light.base[n], 1 - smoothstep(0, 0.16, up)), relief: f.relief[n] * beam, thick: f.thick[n], near, own: 1, wall: 0, flat: 0 })
      rgb = mix(rgb, s.lit, 0.5 * s.silver * (1 - a) * over)
      if (s.glow > 0) rgb = mix(rgb, s.lit, 0.5 * s.glow * (1 - over))
      data[o] = rgb[0] * 255; data[o + 1] = rgb[1] * 255; data[o + 2] = rgb[2] * 255
      data[o + 3] = a * 255 * foot
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
  (s.w < 70 ? 0.35 + 0.65 * smoothstep(0, 0.4, up) : 0.94 + 0.06 * smoothstep(0, 0.15, up)) * (1 - smoothstep(-0.04 * s.w, Math.max(2, 0.07 * s.w), py))
