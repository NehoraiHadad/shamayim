//# allFunctionsCalledOnLoad
/** Distance tiers (km): geometric, so each holds a similar change of haze. */
export const TIER_KM = Array.from({ length: 19 }, (_, i) => 2 * 1.22 ** i)

/** The last tier whose edge `km` reaches (0 below the first): a plain loop, run for every town box of a place. */
export const farTownTier = (km: number) => {
  for (let i = TIER_KM.length - 1; i > 0; i--) if (km >= TIER_KM[i]) return i
  return 0
}

/** The representative distance is near the geometric midpoint of the tier's 1.22× range. */
export const farTownHazeAtTier = (tier: number) => TIER_KM[tier] * 1.1
