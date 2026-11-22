import { smoothstep } from '../../world/ridgeLighting'
import type { CloudLevel, WorldState } from '../../world/types'
import type { RGB } from './types'

/** The towns' light as a cloud base gives it back: sodium and warm LED, greyed by the cloud. */
const CITY_RGB: RGB = [0.34, 0.27, 0.21]
/** How much of the towns' light reaches a layer's base: the low deck is nearest and takes most. */
const CITY_REACH: Record<CloudLevel, number> = { low: 1, mid: 0.65, high: 0.3 }
/**
 * The deck's base takes the light of the towns under it: overhead only the place's own streets, toward the horizon the
 * ring of towns out to the deck's edge and the glow of the air the slant ray crosses. The zenith gets this share of the
 * mean weight, the horizon (the sheet's shade endpoint, where its ramp runs) the rest.
 */
export const CITY_ZENITH = 0.55, CITY_HORIZON = 1.35

/**
 * A layer's base lit from below by the towns at night: the place's artificial sky glow (`env.glow`, Walker's law: ~1 at a
 * town's edge, 10+ in a metropolis) saturating as a deck closes over it, while the windows and streets are lit. Returns
 * the tone and its weight (0 by day, in the desert, or with no cloud to give the light back).
 */
export function cityLit(world: WorldState, level: CloudLevel, cover: number): { rgb: RGB; weight: number } {
  const glow = 1 - Math.exp(-world.env.glow / 4)
  const lit = 0.5 + 0.5 * world.night.litShare
  return { rgb: CITY_RGB, weight: world.night.dark * glow * lit * CITY_REACH[level] * smoothstep(0.3, 0.9, cover) }
}
