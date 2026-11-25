import { toLinear, toSrgb } from '../../../model/tone'
import type { RGB, Tones } from '../../../model/types'

/*
 * The town's trees in the real hand: an olive's, a pine's, a fig's leaf (a dark warm green, sRGB about .15, .20, .10)
 * where the model's tones carry its one sea-green leaf (.19, .28, .21), which reads cyan beside the dry ground. Each of
 * the leaf's tones is turned by the two albedos' ratio, channel by channel in linear light, so its light and its air
 * stay the model's. The tones are cached by the tier's own object. Pure.
 */

const MODEL: RGB = [.19, .28, .21], OWN: RGB = [.15, .2, .1]
const RATIO = [0, 1, 2].map((c) => toLinear(OWN[c]) / toLinear(MODEL[c]))

const turned = (c: RGB): RGB => [toSrgb(toLinear(c[0]) * RATIO[0]), toSrgb(toLinear(c[1]) * RATIO[1]), toSrgb(toLinear(c[2]) * RATIO[2])]

const held = new WeakMap<Tones, Tones>()

/** The tier's tones with the real hand's leaf. */
export function leafy(t: Tones): Tones {
  let out = held.get(t)
  if (!out) held.set(t, out = { ...t, green: turned(t.green), greenLit: turned(t.greenLit) })
  return out
}
