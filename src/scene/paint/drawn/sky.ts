import type { LayerOf } from '../../model/types'
import { css, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { fractal, rng } from '../shared/base/core'
import { paintSky } from '../shared/sky/sky'
import { skyBackground } from '../shared/sky/skyBackground'
import { kept } from './kit/kept'

/*
 * The sky as one inked block: the model's gradient, band, glows and arch as they are, and the plank's grain through them:
 * level lines that waver a little, some of paper and some of ink, scattered and faint, so that a row keeps its own colour. One set of
 * lines for both forms of the base: an image over the CSS one, a path over the canvas one. Pure: the desc alone.
 */

/** The lines for a px of the sky's height; their length and thickness (px), the share that are paper. */
const LINES = 0.45, LONG = [24, 130] as const, THIN = [0.35, 0.8] as const, PAPER = 0.5
/** The rings' slow wave: its height (px) and frequency (1/px), and its seed and the lines' own. */
const WAVE = 9, FREQ = [0.004, 0.012] as const, WAVES = 311, SEED = 4177
/** A line's strength over the ink (the paper's the less: it shows by night); how far (px) under the eye's level the last one lies. */
const INKS = [{ rgb: [1, 1, 1], alpha: 0.02 }, { rgb: [0, 0, 0], alpha: 0.03 }] as const, UNDER = 8

/** The grain's lines of paper and of ink, as path data. */
interface Grain { paths: readonly [string, string]; image: string }
const held = kept<Grain>(8)

function grainOf({ bounds: { w, h }, band }: LayerOf<'sky'>): Grain {
  const foot = Math.round(band ? Math.min(h, band.y + UNDER) : h)
  return held(`${w},${h},${foot}`, () => {
    const r = rng(SEED), paths: [string, string] = ['', ''], many = Math.round(foot * LINES)
    const wave = (x: number, y: number) => y + WAVE * (fractal(WAVES, x, y, FREQ[0], FREQ[1], 2) - 0.5)
    for (let n = 0; n < many; n++) {
      const y = ((n + r()) / many) * foot, long = LONG[0] + (LONG[1] - LONG[0]) * r() ** 2, x = r() * (w + long) - long
      const thin = THIN[0] + (THIN[1] - THIN[0]) * r(), [a, m, b] = [0, 0.5, 1].map((u) => wave(x + u * long, y)), bend = 2 * m - (a + b) / 2
      const at = (px: number, py: number) => `${px.toFixed(1)} ${py.toFixed(2)}`
      paths[r() < PAPER ? 0 : 1] += `M${at(x, a)}Q${at(x + long / 2, bend - thin)} ${at(x + long, b)}Q${at(x + long / 2, bend + thin)} ${at(x, a)}`
    }
    const shapes = INKS.map(({ rgb, alpha }, i) => `<path fill="${css(rgb, alpha)}" d="${paths[i]}"/>`).join('')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${shapes}</svg>`
    return { paths, image: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` }
  })
}

export const drawnSkyBase = (desc: LayerOf<'sky'>): string => `${grainOf(desc).image}, ${skyBackground(desc)}`

export function paintDrawnSky(ctx: Ctx2D, desc: LayerOf<'sky'>, env: PaintEnv): void {
  paintSky(ctx, desc, env)
  const { paths } = grainOf(desc)
  ctx.save()
  ctx.translate(desc.bounds.x, desc.bounds.y)
  INKS.forEach(({ rgb, alpha }, i) => {
    ctx.fillStyle = css(rgb, alpha)
    ctx.fill(new Path2D(paths[i]))
  })
  ctx.restore()
}
