import { cornerOf, extentOf, osmShareOf, spotsOf, type RawGroup } from './input'

/**
 * When a group's footprints are good enough to be drawn: small enough to be a village seen whole, enough houses to be a
 * settlement, and mostly drawn by people. Measured (release 2026-11-18.0): footprints under
 * 60 m² are 22 % where OSM drew almost none, 17 to 19 % up to its third, and 11 to 15 % above; large footprints and
 * the built cover tell nothing. Few groups stand between a third and two thirds, so the half's exact place matters little.
 * `measure.ts` prints the numbers.
 */
export const RULE = { extentM: 2000, houses: 10, osmShare: .5 } as const

export type Verdict = 'good' | 'wide' | 'few' | 'machine'

export function verdictOf(group: RawGroup): Verdict {
  if (extentOf(spotsOf(group.houses, cornerOf(group.houses))) > RULE.extentM) return 'wide'
  if (group.houses.length < RULE.houses) return 'few'
  return osmShareOf(group.houses) < RULE.osmShare ? 'machine' : 'good'
}
