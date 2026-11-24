import { smoothstep } from '../../../../domain/smoothstep'
import { labOf, rgbOfLab } from '../../../model/tone'
import type { RGB } from '../../../model/types'
import { kept } from './kept'

/*
 * The drawn hand's paint box: every colour is the model's, in the hour's light and air, taken to a purer pigment. Value is
 * the model's, so the hour reads as it is; chroma is the hand's: a grey-blue haze becomes a clear blue, a muddy slope an
 * olive one. One rule for every layer. Pure.
 */

/** How far a colour's chroma goes, and the most it may reach (Oklab). */
const GAIN = 1.5, MOST = 0.15
/** The values (Oklab) a dark takes its gain through: a night ink stays the night's, no blue of its own. */
const DARK = [0.15, 0.5] as const
/** The cool a shade takes and the warmth a light takes (Oklab a, b), at full strength. */
const COOL = { a: -0.004, b: -0.03 }, WARM = { a: 0.006, b: 0.03 }
/** Colours are mixed at this many steps a channel, so a kept mix is the mix made again. */
const STEPS = 1000

const held = kept<RGB>(4000)

/** A model colour as the hand paints it; `turn` -1 a shade (cooler) … 1 a light (warmer). */
export function pigment(rgb: RGB, turn = 0, gain = GAIN): RGB {
  const [r, g, b] = rgb.map((v) => Math.round(v * STEPS))
  return held(`${r},${g},${b},${turn},${gain}`, () => {
    const lab = labOf([r / STEPS, g / STEPS, b / STEPS]), chroma = Math.hypot(lab.a, lab.b)
    const most = 1 + (gain - 1) * smoothstep(DARK[0], DARK[1], lab.l)
    const k = chroma > 1e-5 ? (MOST * Math.tanh((chroma * most) / MOST)) / chroma : 1
    const lean = turn < 0 ? COOL : WARM, by = Math.abs(turn) * Math.min(1, lab.l * 1.6)
    return rgbOfLab({ l: lab.l, a: lab.a * k + lean.a * by, b: lab.b * k + lean.b * by })
  })
}

/** A colour at another value (Oklab lightness), hue and chroma held. */
export function valued(rgb: RGB, by: number): RGB {
  const lab = labOf(rgb)
  return rgbOfLab({ ...lab, l: Math.min(1, Math.max(0, lab.l + by)) })
}
