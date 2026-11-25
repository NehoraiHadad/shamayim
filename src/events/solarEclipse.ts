import { ELEMENTS_RADIUS_MS, localSolarEclipse } from '../astro/solarEclipse'
import { SOLAR_ECLIPSES } from '../astro/solarEclipseElements'
import { apparentAltitude } from '../world/skyProjection'
import type { Candidate, Detector } from './types'

/** The locally visible phase of a solar eclipse, with weather and terrain checked by the shared event filter. */
export const solarEclipse: Detector = (sky) => SOLAR_ECLIPSES.flatMap((elements) => {
  if (elements.epoch + ELEMENTS_RADIUS_MS < sky.from || elements.epoch - ELEMENTS_RADIUS_MS > sky.to) return []
  const local = localSolarEclipse(elements, sky.place)
  if (!local) return []

  const at: Candidate['at'] = (ms) => {
    const sun = local.sunAt(ms)
    // The conventional sunrise/sunset geometric altitude for the center of the Sun.
    return sun.altitude > -0.833 ? { azimuth: sun.azimuth, altitude: apparentAltitude(sun.altitude) } : null
  }
  const candidate = ({ from, to, peak }: typeof local.partial, what: string, perYear: number): Candidate => ({
    kind: 'solar-eclipse', what, from, to, perYear, at, tell: 'span', stepMin: 2,
    peakAt: peak, sampleAt: [from, peak, to], cloud: { thick: 0.65, all: 0.9 },
  })
  const partial = candidate(local.partial, 'ליקוי חמה חלקי', 0.4)
  const central = local.central && candidate(local.central, local.central.kind === 'total' ? 'ליקוי חמה מלא' : 'ליקוי חמה טבעתי', 0.01)
  return (central ? [central, partial] : [partial]).filter(({ from, to }) => from < sky.to && to > sky.from)
})
