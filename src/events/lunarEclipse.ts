import { greatestOf, LUNAR_ECLIPSES } from './eclipseTable'
import type { Detector } from './types'

/** A bite smaller than this share of the moon is not noticed. */
const NOTICED = 0.1

/** The earth's shadow on the moon, from the published table: its total phase where that is seen, else what is seen of it. */
export const lunarEclipse: Detector = (sky) => LUNAR_ECLIPSES.filter((e) => e.magnitude >= NOTICED).flatMap((e) => {
  const middle = greatestOf(e)
  return [{ what: 'ליקוי ירח מלא', perYear: 0.4, minutes: e.totalMin }, { what: 'ליקוי ירח חלקי', perYear: 0.6, minutes: e.partialMin }]
    .map(({ what, perYear, minutes }) => ({ what, perYear, tell: 'span' as const, leastMin: 20, from: middle - 30_000 * minutes,
      to: middle + 30_000 * minutes, sunBelow: 0, cloud: { thick: 0.7, all: 0.95 }, at: sky.moonAt }))
    .filter((candidate) => candidate.to > candidate.from && candidate.to > sky.from && candidate.from < sky.to)
})
