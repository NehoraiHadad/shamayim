import { smoothstep } from '../../../../domain/smoothstep'
import type { Lamp } from '../../../model/layers/lamp'

/** Sky px at which a light stands straight overhead of every cloud: the open sky's own. */
const ZENITH = { x: 0, y: -1e6 }
/** The altitudes (deg) over which a set sun's light on the clouds goes, and a rising moon's comes. */
const SUN = [-4, -1] as const, MOON = [0, 4] as const
/** The sun's altitudes over which a moon's light comes out of the dusk (the lamp turns from the one to the other at once). */
const DUSK = [-10, -4] as const
/** How high (px) the light stands over its own place at half a beam: as the beam goes, it turns to the open sky's, from above. */
const RISE = 400

/**
 * Where a sheet's light comes from (px of its surface), and how much of it is direct (0–1). Not the beam on the ground: a
 * cloud's own lit colour says how bright it is, and the clouds keep the sun after the ground has lost it.
 */
export function lampLight(lamp?: Lamp): { x: number; y: number; beam: number } {
  if (!lamp) return { ...ZENITH, beam: 0 }
  const [from, to] = lamp.body === 'sun' ? SUN : MOON, dusk = lamp.body === 'moon' && lamp.sun ? smoothstep(DUSK[0], DUSK[1], lamp.sun.altitude) : 0
  const beam = smoothstep(from, to, lamp.altitude) * (1 - dusk)
  return { x: lamp.x, y: lamp.domeY - (RISE * (1 - beam)) / Math.max(1e-3, beam), beam }
}
