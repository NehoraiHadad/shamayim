import type { RGB } from '../../../../../world/types'
import type { FloodlitDome } from '../../../../model/metalLight'
import { roundGradient } from './roundGradient'
import { mix } from '../../base/hand'
import { rect, type Kit, type Tracer } from './kit'
import { sectorGradient } from './kitLight'

/** The original gold silhouette and falloff under the shrine's floodlights. */
export function paintFloodlitDome(k: Kit, h: number, t: FloodlitDome) {
  const c = k.c, dome = -h + 1.5
  c.fillStyle = roundGradient(c, t, k.l, -2.8, 2.8, .62, t.gold, mix(t.gold, t.rim, .45))
  c.beginPath()
  c.moveTo(-2.8, -9.5)
  c.quadraticCurveTo(-3, dome + 1.3, 0, dome)
  c.quadraticCurveTo(3, dome + 1.3, 2.8, -9.5)
  c.closePath()
  c.fill()
  for (let i = 1; i < 3; i++) k.fill(rect(-2.6 + i * .3, -9.5 - i * 1.3, 5.2 - i * .6, .3), t.shade, .18)
  k.fill(rect(-.5, -h, 1, 1.8), t.gold)
  k.fill(rect(-.5, -h, .4, 1.8), k.face(t.gold, t.rim, 1))
  k.fill(rect(.1, -h, .4, 1.8), k.face(t.gold, t.rim, -1))
}

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
