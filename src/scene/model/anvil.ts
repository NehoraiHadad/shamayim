import type { Glaciation } from '../../world/glaciation'
import { smoothstep } from '../../world/ridgeLighting'
import type { CloudSprite } from '../paint/cloudSprite'

/*
 * The anvils: ice spreading from the tops of the largest mature Cb in view. A top spreads once it has risen to where its
 * water freezes (`world/glaciation.ts`), and only over a column that stands taller than it is wide (a cap on a squat body
 * reads as a disc floating in the sky).
 */

interface Standing { sprite: CloudSprite; /** The cell's top (km above the ground). */ top: number }

/** The tropopause over the Levant in the cool season (km): the rule where the forecast gives no freezing level. */
const TROPOPAUSE_KM = 11
/** Anvils in view at most: only the most mature cells of a storm line have spread theirs. */
const ANVILS = 2

/** How far a Cb's top has spread into an anvil (0–1). */
export function anvilOf(topKm: number, ice: Glaciation | null): number {
  return ice ? smoothstep(ice.fromKm, ice.fullKm, topKm) : smoothstep(TROPOPAUSE_KM - 1.5, TROPOPAUSE_KM, topKm)
}

/** Marks the anvils among the towers in view. */
export function spreadAnvils(placed: readonly Standing[], ice: Glaciation | null) {
  placed.flatMap((c) => {
    const anvil = c.sprite.genus === 'cb' && c.sprite.tall >= 1.5 * c.sprite.w ? anvilOf(c.top, ice) : 0
    return anvil > 0 ? [{ sprite: c.sprite, anvil }] : []
  }).sort((a, b) => b.anvil * b.sprite.w - a.anvil * a.sprite.w).slice(0, ANVILS)
    .forEach(({ sprite, anvil }) => { sprite.anvil = anvil })
}
