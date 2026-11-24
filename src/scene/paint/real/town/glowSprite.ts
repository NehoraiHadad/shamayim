import type { RGB } from '../../../model/types'
import type { PaintEnv, Scratch } from '../../shared/base/hand'

const SIDE = 32
const sprites = new Map<string, Scratch['canvas']>()

/** A round glow of one colour, full at its centre and nothing at its rim: one small raster for every light. */
export function glowSprite(env: PaintEnv, rgb: RGB): Scratch['canvas'] {
  const bytes = rgb.map((c) => Math.round(255 * c)), key = bytes.join()
  const known = sprites.get(key)
  if (known) return known
  const { canvas, ctx } = env.canvas(SIDE, SIDE), image = ctx.createImageData(SIDE, SIDE)
  for (let y = 0, i = 0; y < SIDE; y++) {
    for (let x = 0; x < SIDE; x++, i += 4) {
      const fall = Math.max(0, 1 - Math.hypot(x + .5 - SIDE / 2, y + .5 - SIDE / 2) / (SIDE / 2))
      image.data[i] = bytes[0]
      image.data[i + 1] = bytes[1]
      image.data[i + 2] = bytes[2]
      image.data[i + 3] = Math.round(255 * fall * fall * (.4 + .6 * fall))
    }
  }
  ctx.putImageData(image, 0, 0)
  if (sprites.size > 7) sprites.clear()
  sprites.set(key, canvas)
  return canvas
}
