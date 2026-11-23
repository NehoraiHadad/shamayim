import { labOf, rgbOfLab } from '../../../../src/scene/model/tone'
import type { RGB } from '../../../../src/scene/model/types'

/*
 * The drawn hand's paint box: every colour is the model's, in the hour's light and air, taken to a purer pigment. Value is
 * the model's, so the hour reads as it is; chroma is the hand's: a grey-blue haze becomes a clear blue, a muddy slope an
 * olive one. One rule for every layer. Pure.
 */

/** How far a colour's chroma goes, and the most it may reach (Oklab). */
const GAIN = 1.62, MOST = 0.17
/** The cool a shade takes and the warmth a light takes (Oklab a, b), at full strength. */
const COOL = { a: -0.004, b: -0.03 }, WARM = { a: 0.006, b: 0.03 }
const HELD = 4000

const held = new Map<string, RGB>()

/** A model colour as the hand paints it; `turn` -1 a shade (cooler) … 1 a light (warmer). */
export function pigment(rgb: RGB, turn = 0, gain = GAIN): RGB {
  const key = `${rgb[0].toFixed(3)},${rgb[1].toFixed(3)},${rgb[2].toFixed(3)},${turn},${gain}`
  const known = held.get(key)
  if (known) return known
  const lab = labOf(rgb), chroma = Math.hypot(lab.a, lab.b)
  const to = MOST * Math.tanh((chroma * gain) / MOST), k = chroma > 1e-5 ? to / chroma : 1
  const lean = turn < 0 ? COOL : WARM, by = Math.abs(turn) * Math.min(1, lab.l * 1.6)
  const out = rgbOfLab({ l: lab.l, a: lab.a * k + lean.a * by, b: lab.b * k + lean.b * by })
  if (held.size > HELD) held.clear()
  held.set(key, out)
  return out
}

/** A colour at another value (Oklab lightness), hue and chroma held. */
export function valued(rgb: RGB, by: number): RGB {
  const lab = labOf(rgb)
  return rgbOfLab({ ...lab, l: Math.min(1, Math.max(0, lab.l + by)) })
}
