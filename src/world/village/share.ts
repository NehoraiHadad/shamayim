import { seeded } from '../../data/landmarks/hash'
import { TOWN_KM } from '../../data/village/cellSource'

/** A settlement no wider than this is all village: the widest one footprints are kept of (`scripts/village/rule.ts`). */
export const VILLAGE_KM = 2

/**
 * How much a settlement this wide (its larger side, km) is drawn by the village's rules: all of it up to `VILLAGE_KM`, none
 * from `TOWN_KM` on (a town's and a city's picture is not touched), smoothly between.
 */
export function villageShare(extentKm: number): number {
  const t = Math.max(0, Math.min(1, (TOWN_KM - extentKm) / (TOWN_KM - VILLAGE_KM)))
  return t * t * (3 - 2 * t)
}

/** Between a town's value (share 0) and the village's (share 1). */
export const mixed = (town: number, village: number, share: number) =>
  share <= 0 ? town : share >= 1 ? village : town + (village - town) * share

/**
 * Whether a spot's houses are the village's, the rest being drawn as a town's: by its own seed, so a settlement a little
 * wider hands a few more spots over, and none back.
 */
export const isVillageSpot = (seed: number, share: number) => seeded(seed + 7)() < share