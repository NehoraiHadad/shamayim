import { labOf } from '../../../../src/scene/model/tone'
import { smoothstep } from '../../../../src/domain/smoothstep'
import type { RGB } from '../../../../src/scene/model/types'
import { mix } from '../../../../src/scene/paint/shared/base/hand'
import type { Inks } from './caps'
import { papered, pigment, valued } from './palette'

/*
 * A cloud's inks from the model's own light, body and shade. Three rules: the print's mean value is the model's, the more so
 * the heavier the cloud; a shade turns cool only as far as the model's own does; and the line is as dark as the model's own
 * light and shade stand apart, so fog and dust lose it. Pure.
 */

export interface CloudLight { lit: RGB; bright: RGB; body: RGB; shade: RGB; heavy: number; gain?: number }
export interface CloudInks { lit: RGB; local: RGB; half: RGB; shade: RGB; foot: RGB; key: RGB; line: number; heavy: number }

/** How far apart (Oklab) light and shade are without and with a full line; the b a shade must be cooler by for a full turn. */
const APART = [0.02, 0.16] as const, COOLER = 0.02, COOL_LEAST = 0.1
/** The share each ink covers; how far the mean is taken to the model's for a light cloud. */
const SHARE = [0.22, 0.26, 0.22, 0.2, 0.1] as const, TRUE = 0.3
/** A heavy cloud's foot, further down. */
const WEIGHT = 0.07

export function cloudInks({ lit, bright, body, shade, heavy, gain }: CloudLight): CloudInks {
  const a = labOf(lit), b = labOf(shade), apart = Math.hypot(a.l - b.l, 1.5 * (a.a - b.a), 1.5 * (a.b - b.b))
  const line = smoothstep(APART[0], APART[1], apart), cool = Math.min(1, Math.max(COOL_LEAST, (a.b - b.b) / COOLER)), light = 1 - heavy
  const raw: RGB[] = [
    papered(pigment(mix(bright, mix(lit, body, 0.35), heavy), 0.3, gain), 0.85 * light),
    papered(pigment(mix(body, lit, 0.6), 0, gain), 0.2 * light),
    pigment(mix(body, lit, 0.14), -0.4 * cool, gain),
    pigment(mix(body, shade, 0.5), -0.8 * cool, gain),
    valued(pigment(mix(body, shade, 0.85), -0.9 * cool, gain), -WEIGHT * heavy),
  ]
  const mean = raw.reduce((sum, rgb, i) => sum + SHARE[i] * labOf(rgb).l, 0), by = (labOf(body).l - mean) * (TRUE + (1 - TRUE) * heavy)
  const [light0, local, half, dark, foot] = raw.map((rgb) => valued(rgb, by))
  return { lit: light0, local, half, shade: dark, foot, key: pigment(valued(foot, -0.2 * line), -0.9 * cool), line, heavy }
}

/** A cap's inks where it stands `up` (0 shade … 1 light): the mass's light, not the cap's own, gives its value. */
export function capInks(t: CloudInks, up: number): Inks {
  return { lit: mix(mix(t.shade, t.half, 0.7), t.lit, up), local: mix(t.shade, t.local, up), shade: mix(t.foot, t.half, 0.7 * up), key: t.key }
}
