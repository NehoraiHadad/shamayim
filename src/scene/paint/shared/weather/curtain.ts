import { smoothstep } from '../../../../domain/smoothstep'
import type { LayerOf, ShaftDesc } from '../../../model/types'
import { detailTile, tileAt } from '../base/detailTile'
import type { Ctx2D, PaintEnv } from '../base/hand'

/*
 * A curtain of rain or snow (stage C7; reference in `weather.ts`): one soft body leaning downwind, densest in its middle
 * under the base and thinning to its edges and toward the ground, and broad fibres of heavier fall in it. A raster on a
 * scratch sheet, stretched with the canvas's own smoothing: stacked faint gradients add up to a visible dither grid.
 * Pure: the shaft alone, seeded, and the scratch surface from `env`.
 */

/** The fall's density down the curtain: [height from the base, share], for rain and for snow. */
const RAIN_DOWN = [[0, 0], [0.18, 0.9], [0.4, 1], [0.75, 0.8], [1, 0.5]] as const
const SNOW_DOWN = [[0, 0], [0.18, 0.8], [0.6, 0.65], [1, 0.3]] as const
/** Half the body's reach across, against the shaft's width; how far its edge wavers (of that). */
const REACH = 0.62, WAVER = 0.35
/**
 * A hand's fibres: how far they thicken and thin the body, their rate (tile widths over the shaft's width), their rate
 * down against across (long streaks of heavier fall), the octaves of their noise, and how it is gathered (1 as it is; more
 * gathers it into planes of heavier and lighter fall).
 */
export interface Fibres { thick: number; rate: number; long: number; octaves: number; gather: number }
/** A thin fibre stops short of the ground (virga): the height it fades from. */
const VIRGA = 0.45
/** The middle of the curtain against the shaft's own strength: its soft flanks take the rest. */
const HEAVY = 1.5
/** Raster px per sky px at most, and raster px in a curtain at most. */
const RASTER = 0.6, RASTER_PX = 6000
const NOISE_SEED = 7351

function shareDown(stops: typeof RAIN_DOWN | typeof SNOW_DOWN, t: number): number {
  for (let n = 1; n < stops.length; n++) {
    const [t0, a0] = stops[n - 1], [t1, a1] = stops[n]
    if (t <= t1) return a0 + (a1 - a0) * smoothstep(t0, t1, t)
  }
  return 0
}

export function curtain(ctx: Ctx2D, s: Omit<ShaftDesc, 'id'>, snow: boolean, env: PaintEnv, fibres: Fibres) {
  const { top, bottom, w, lean, rgb, seed } = s
  const h = bottom - top, alpha = Math.min(0.95, s.alpha)
  if (h <= 1 || w < 1 || alpha < 0.01) return
  const side = w * REACH * (1 + WAVER), left = Math.min(0, lean) - side, wide = 2 * side + Math.abs(lean)
  const k = Math.min(RASTER, Math.sqrt(RASTER_PX / (wide * h)))
  const cols = Math.max(2, Math.ceil(wide * k)), rows = Math.max(2, Math.ceil(h * k))
  const sheet = env.canvas(cols, rows)
  const image = sheet.ctx.createImageData(cols, rows)
  const tile = detailTile(NOISE_SEED, fibres.octaves), ou = (seed % 991) / 991, ov = (seed % 617) / 617
  const [r, g, b] = rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255))
  for (let j = 0, at = 0; j < rows; j++) {
    const t = (j + 0.5) / rows, down = shareDown(snow ? SNOW_DOWN : RAIN_DOWN, t)
    for (let i = 0; i < cols; i++, at += 4) {
      const across = (left + ((i + 0.5) / cols) * wide - lean * t) / w
      const noise = 2 * tileAt(tile, across * fibres.rate + ou, t * fibres.rate * fibres.long + ov) - 1
      const fibre = Math.max(-1, Math.min(1, fibres.gather * noise))
      const out = Math.min(1, Math.abs(across) / (REACH * (1 + WAVER * fibre)))
      const body = (1 - out * out) ** 1.2
      const short = 1 - smoothstep(VIRGA, 1.2, t) * smoothstep(0.1, -0.5, fibre)
      const density = Math.max(0, HEAVY * down * body * short * (1 + fibres.thick * fibre))
      image.data[at] = r; image.data[at + 1] = g; image.data[at + 2] = b
      image.data[at + 3] = Math.round(255 * (1 - (1 - alpha) ** density))
    }
  }
  sheet.ctx.putImageData(image, 0, 0)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(sheet.canvas as CanvasImageSource, s.x + left, top, wide, h)
  ctx.restore()
}

/** The curtains under the far banks that rain or snow, on their cloud layer's band (each also a period over, to wrap). */
export function paintShafts(ctx: Ctx2D, desc: LayerOf<'shafts'>, env: PaintEnv, fibres: Fibres): void {
  const { bounds, period } = desc
  for (const s of desc.shafts) {
    for (const k of [-1, 0, 1]) {
      const x = s.x + k * period
      if (x + s.w + Math.abs(s.lean) < bounds.x || x - s.w - Math.abs(s.lean) > bounds.x + bounds.w) continue
      curtain(ctx, { ...s, x }, desc.precip === 'snow', env, fibres)
    }
  }
}
