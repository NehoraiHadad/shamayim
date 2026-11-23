import type { RGB } from '../../../world/types'
import { mix } from '../hand'
import type { Kit, Tracer } from './kit'
import { sectorGradient } from './kitLight'

/** Paint the projected sector grid, interpolated in elevation and across the curved shell. */
export function paintGilding(k: Kit, shape: Tracer, top: number, base: number, colours: RGB[][]) {
  const c = k.c
  const { d: scale = 1, f: offset = 0 } = c.getTransform() ?? {}
  const first = Math.floor(top * scale + offset), last = Math.ceil(base * scale + offset)
  c.save()
  shape(c)
  c.clip()
  // One fill per device row prevents overlap between partially covered strips.
  // The outline clip handles the subpixel coverage of the curved silhouette.
  for (let row = first; row < last; row++) {
    const y = (row - offset) / scale
    const fraction = Math.min(.999, Math.max(0, (base - y - .5 / scale) / (base - top)))
    const position = fraction * (colours.length - 1)
    const sector = Math.floor(position), sweep = Math.sqrt(1 - fraction ** 2)
    const coloursAtRow = colours[sector].map((tone, x) => mix(tone, colours[sector + 1][x], position - sector))
    c.fillStyle = sectorGradient(c, -2.8 * sweep, 2.8 * sweep, coloursAtRow)
    c.fillRect(-2.8, y, 5.6, 1 / scale)
  }
  c.restore()
}
