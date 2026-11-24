import { fullMoonRise } from './fullMoonRise'
import { lunarEclipse } from './lunarEclipse'
import { meteorShower } from './meteorShower'
import { planetByMoon } from './planetByMoon'
import { rainbowChance } from './rainbowChance'
import { seen } from './seen'
import type { Detector, EventSky, SpecialEvent } from './types'

export { eventSky } from './sky'

const DETECTORS: readonly Detector[] = [lunarEclipse, meteorShower, planetByMoon, rainbowChance, fullMoonRise]

/** Everything the place will see from now to the next sunrise, the rarest first (of two as rare, the sooner). */
export function eventsOf(sky: EventSky, detectors: readonly Detector[] = DETECTORS): SpecialEvent[] {
  return detectors.flatMap((detect) => detect(sky)).map((candidate) => seen(candidate, sky)).filter((event) => event !== null)
    .sort((a, b) => a.perYear - b.perYear || a.when.from.localeCompare(b.when.from))
}

/** The one event to tell: the rarest; null on most days. */
export const specialEvent = (sky: EventSky): SpecialEvent | null => eventsOf(sky)[0] ?? null
