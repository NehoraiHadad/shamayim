import type { Forecast } from './types'
import { smoothstep } from './smoothstep'

export const forecastObservation = (forecast: Forecast) => forecast.observation ?? forecast.current

/** The provider's reading tells the sky within 15 minutes of its time and gives way to the hours by 45. */
export const readingWeight = (minutesOff: number) => 1 - smoothstep(15, 45, Math.abs(minutesOff))

/** The transition is evaluated against the scene minute, in epoch milliseconds. */
const EASE_MS = 10 * 60_000

export const arrivalWeight = (receivedAt: number, at: number) => smoothstep(receivedAt, receivedAt + EASE_MS, at)

/**
 * Attach the outgoing data. Keep overlapping transitions so a rapid refresh starts from the same timeline. With nothing of
 * this place shown before there is nothing to ease from: the forecast stands as it is, as a reload reads it from the store.
 */
export function withForecastRefresh(next: Forecast, outgoing: Forecast | null, receivedAt: number): Forecast {
  if (next === outgoing) return next
  if (!outgoing || outgoing.placeId !== next.placeId) return next
  if (outgoing.previous && arrivalWeight(outgoing.previous.receivedAt, receivedAt) === 1) {
    outgoing = { ...outgoing, previous: undefined }
  }
  return { ...next, previous: { forecast: outgoing, receivedAt } }
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
  return forecast.previous ? arrivalWeight(forecast.previous.receivedAt, nowMs) : 1
}
