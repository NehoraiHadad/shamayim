import { fetchComets } from '../data/comets'
import { cometEvents } from './brightComet'
import { issPasses, loadIssOrbit } from './issPass'
import type { Detector } from './types'

/** The two feeds fail independently. A missing feed leaves the local event calculations usable. */
export async function onlineDetectors(nowMs: number): Promise<Detector[]> {
  const [station, comets] = await Promise.allSettled([loadIssOrbit(nowMs), fetchComets(nowMs)])
  const result: Detector[] = []
  if (station.status === 'fulfilled' && station.value) result.push(issPasses(station.value))
  if (comets.status === 'fulfilled' && comets.value.length) result.push(cometEvents(comets.value))
  return result
}
