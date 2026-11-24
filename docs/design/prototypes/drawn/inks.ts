import { labOf } from '../../../../src/scene/model/tone'
import { smoothstep } from '../../../../src/domain/smoothstep'
import type { RGB } from '../../../../src/scene/model/types'
import { mix } from '../../../../src/scene/paint/shared/base/hand'
import type { Inks } from './caps'
import { papered, pigment, valued } from './palette'

/*
 * A cloud's inks from the model's own light, body and shade. The body is the model's value as it is; a shade turns cool only
 * as far as the model's own does, and less where the light itself is coloured (dust, dusk); the line is as dark as the model's
 * own light and shade stand apart, so fog and dust lose it; a heavy cloud shows less paper and stands on a darker foot. Pure.
 */

export interface CloudLight { lit: RGB; bright: RGB; body: RGB; shade: RGB; least?: number; gain?: number }
export interface CloudInks { lit: RGB; local: RGB; half: RGB; shade: RGB; foot: RGB; key: RGB; line: number; heavy: number }

/** How far apart (Oklab) light and shade are without and with a full line, and what hue counts in it against value. */
const APART = [0.02, 0.16] as const, HUE = 0.8
/** The b a shade must be cooler by for a full turn; the chroma of a light that is coloured, and what it takes of the turn. */
const COOLER = 0.02, COLOURED = [0.03, 0.1] as const, HELD = 0.85
/** Where a body must lie between its light and its shade for the cloud to be heavy; what that takes from its foot. */
const HEAVY = [0.15, 0.55] as const, WEIGHT = 0.06
const GAIN = 1.5

export function cloudInks({ lit, bright, body, shade, least = 0, gain = GAIN }: CloudLight): CloudInks {
  const a = labOf(lit), b = labOf(shade), c = labOf(body), apart = Math.hypot(a.l - b.l, HUE * (a.a - b.a), HUE * (a.b - b.b))
  const heavy = Math.max(least, smoothstep(HEAVY[0], HEAVY[1], (a.l - c.l) / Math.max(0.02, a.l - b.l))), paper = 1 - heavy
  const own = 1 - HELD * smoothstep(COLOURED[0], COLOURED[1], Math.hypot(a.a, a.b)), cool = own * Math.min(1, Math.max(0, (a.b - b.b) / COOLER))
  const deep = 1 + (gain - 1) * own, line = smoothstep(APART[0], APART[1], apart)
  const foot = valued(pigment(mix(body, shade, 0.9), -0.8 * cool, deep), -WEIGHT * heavy)
  return {
    lit: papered(pigment(mix(bright, lit, heavy), 0.3, gain), 0.85 * paper),
    local: papered(pigment(mix(body, lit, 0.55), 0, gain), 0.25 * paper),
    half: pigment(body, -0.2 * cool, gain),
    shade: pigment(mix(body, shade, 0.5), -0.6 * cool, deep),
    foot, key: pigment(valued(foot, -0.2 * line), -0.9 * cool), line, heavy,
  }
}

/** The ink at a light `u`: 0 foot … ½ the model's body … 1 lit. */
export function ramp(t: CloudInks, u: number): RGB {
  const at = [t.foot, t.shade, t.half, t.local, t.lit], k = 4 * Math.min(1, Math.max(0, u)), i = Math.min(3, Math.floor(k))
  return mix(at[i], at[i + 1], k - i)
}

/** A cap against the mass's light: its crest over it, its own tone near it, its foot a little under. */
const CREST = 0.3, OWN = 0.06, UNDER = 0.16

/** A cap's inks where the mass's light is `up`. */
export const capInks = (t: CloudInks, up: number): Inks => ({ lit: ramp(t, up + CREST), local: ramp(t, up + OWN), shade: ramp(t, up - UNDER), key: t.key })
