import { smoothstep } from '../../../../domain/smoothstep'
import type { Lamp } from '../../../model/layers/lamp'

/** Sky px at which a light stands straight overhead of every cloud: the open sky's own. */
const ZENITH = { x: 0, y: -1e6 }
/** The altitudes (deg) over which a set sun's light on the clouds goes, and a rising moon's comes. */
const SUN = [-4, -1] as const, MOON = [0, 4] as const

/**
 * Where a sheet's light comes from (px of its surface), and how much of it is direct (0–1). Not the beam on the ground: a
 * cloud's own lit colour says how bright it is, and the clouds keep the sun after the ground has lost it.
 */
export function lampLight(lamp?: Lamp): { x: number; y: number; beam: number } {
  if (!lamp) return { ...ZENITH, beam: 0 }
  const [from, to] = lamp.body === 'sun' ? SUN : MOON
  return { x: lamp.x, y: lamp.domeY, beam: smoothstep(from, to, lamp.altitude) }
}
