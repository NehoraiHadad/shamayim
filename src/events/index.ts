import { fullMoonRise } from './fullMoonRise'
import { haloChance } from './haloChance'
import { lunarEclipse } from './lunarEclipse'
import { lunarOccultation } from './lunarOccultation'
import { meteorShower } from './meteorShower'
import { milkyWayWindow } from './milkyWayWindow'
import { moonByStar } from './moonByStar'
import { planetByMoon } from './planetByMoon'
import { planetPair } from './planetPair'
import { rainbowChance } from './rainbowChance'
import { seen } from './seen'
import { solarEclipse } from './solarEclipse'
import { thinEveningCrescent } from './thinEveningCrescent'
import type { Detector, EventSky, SpecialEvent } from './types'

export { eventSky } from './sky'

const DETECTORS: readonly Detector[] = [
  solarEclipse, lunarEclipse, lunarOccultation, meteorShower, planetPair, planetByMoon, moonByStar,
  fullMoonRise, thinEveningCrescent, milkyWayWindow, rainbowChance, haloChance,
]

/** Viewing opportunities through the next sunrise, ordered by confidence, rarity and time. */
export function eventsOf(sky: EventSky, detectors: readonly Detector[] = DETECTORS): SpecialEvent[] {
  return detectors.flatMap((detect) => detect(sky)).map((candidate) => seen(candidate, sky)).filter((event) => event !== null)
    .sort((a, b) => Number(b.viewing === 'expected') - Number(a.viewing === 'expected')
      || a.perYear - b.perYear || a.when.from.localeCompare(b.when.from))
}

/** The one event to tell, or null on most days. */
export const specialEvent = (sky: EventSky, additional: readonly Detector[] = []): SpecialEvent | null =>
  eventsOf(sky, [...DETECTORS, ...additional])[0] ?? null
