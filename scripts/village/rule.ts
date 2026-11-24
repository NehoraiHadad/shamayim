import { cornerOf, extentOf, osmShareOf, spotsOf, type RawGroup } from './input'

/**
 * When a group's footprints are good enough to be drawn: small enough to be a village seen whole, enough houses to be a
 * settlement, and mostly drawn by people. Below OSM's half the machine-read footprints are the body of the group, and
 * they miss houses and take sheds and greenhouses for them. `measure.ts` prints the numbers the limits are judged by.
 */
export const RULE = { extentM: 2000, houses: 10, osmShare: .5 } as const

export type Verdict = 'good' | 'wide' | 'few' | 'machine'

export function verdictOf(group: RawGroup): Verdict {
  if (extentOf(spotsOf(group.houses, cornerOf(group.houses))) > RULE.extentM) return 'wide'
  if (group.houses.length < RULE.houses) return 'few'
  return osmShareOf(group.houses) < RULE.osmShare ? 'machine' : 'good'
}
