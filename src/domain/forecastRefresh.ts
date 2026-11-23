import type { Forecast } from './types'
import { smoothstep } from './smoothstep'

export const forecastObservation = (forecast: Forecast) => forecast.observation ?? forecast.current

/** The provider's reading tells the sky within 15 minutes of its time and gives way to the hours by 45. */
export const readingWeight = (minutesOff: number) => 1 - smoothstep(15, 45, Math.abs(minutesOff))

/** The transition is evaluated against the scene minute, in epoch milliseconds. */
const EASE_MS = 10 * 60_000

export const arrivalWeight = (receivedAt: number, at: number) => smoothstep(receivedAt, receivedAt + EASE_MS, at)

/** Attach the outgoing data. Keep overlapping transitions so a rapid refresh starts from the same timeline. */
export function withForecastRefresh(next: Forecast, outgoing: Forecast | null, receivedAt: number): Forecast {
  if (next === outgoing) return next
  const incoming = { ...next, receivedAt }
  if (!outgoing || outgoing.placeId !== next.placeId) return incoming
  if (outgoing.previous && arrivalWeight(outgoing.previous.receivedAt, receivedAt) === 1) {
    outgoing = { ...outgoing, previous: undefined }
  }
  return { ...incoming, previous: { forecast: outgoing, receivedAt } }
}

/** Sample the same minute on both timelines. No clock or frame history enters this calculation. */
export function blendForecast<T>(forecast: Forecast, nowMs: number, sample: (forecast: Forecast) => T,
  mix: (before: T, after: T, weight: number) => T): T {
  const previous = forecast.previous
  if (!previous) return sample(forecast)
  const weight = arrivalWeight(previous.receivedAt, nowMs)
  if (weight === 1) return sample(forecast)
  const before = blendForecast(previous.forecast, nowMs, sample, mix)
  return weight === 0 ? before : mix(before, sample(forecast), weight)
}

/** Cache keys stay stable before receipt and after the latest transition finishes. */
export function forecastArrivalProgress(forecast: Forecast, nowMs: number): number {
  return forecast.receivedAt === undefined ? 1 : arrivalWeight(forecast.receivedAt, nowMs)
}
