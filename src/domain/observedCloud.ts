import { bracketAt } from './bracket'
import { arrivalWeight, forecastObservation, readingWeight } from './forecastRefresh'
import { minutesBetweenLocal } from './minutes'
import type { CloudSighting } from './cloudSightings'
import type { Forecast, LocalTime } from './types'

/** What the satellite saw around the place: the cloudy share of pixels (0–100) at a wall-clock time. */
export interface CloudObservation {
  cover: number
  at: LocalTime
  receivedAt?: number
  previous?: CloudObservation
  /** The single cloud patches near the place, biggest-looking first (see `cloudSightings`). */
  sightings?: CloudSighting[]
}

/** Satellite data runs ~20–35 minutes late, so allow full trust through 40 minutes. */
const FRESH_MIN = 40
/** Individual patches are too old to show as live sightings after 100 minutes. */
const STALE_MIN = 100
/** Fade bulk cover to the model by the documented ~2.5-hour horizon as the observed sky loses relevance. */
const COVER_FADE_MIN = 150
/** Cap the error in percentage points because a binary cloud mask can misclassify pixels. */
const MAX_SHIFT = 40

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** 0–1 trust in an observation by its age at `now`. */
export function observationWeight(obs: CloudObservation, now: LocalTime): number {
  const age = minutesBetweenLocal(obs.at, now)
  // Allow a slightly ahead timestamp for live sightings when the clocks differ.
  if (age < -15) return 0
  return clamp(1 - (age - FRESH_MIN) / (STALE_MIN - FRESH_MIN), 0, 1)
}

/** Open-Meteo's sky codes 0–3 follow cloud cover; keep them in step with a corrected cover. */
function skyCode(code: number, cover: number): number {
  if (code > 3) return code
  return cover < 20 ? 0 : cover < 50 ? 1 : cover < 85 ? 2 : 3
}

/** Apply receipt weights from newest to oldest, including the first arrival from a model-only sky. */
export function blendObservations<T>(obs: CloudObservation, nowMs: number | undefined, empty: T,
  sample: (obs: CloudObservation) => T, mix: (before: T, after: T, weight: number) => T): T {
  const weight = obs.receivedAt === undefined || nowMs === undefined ? 1 : arrivalWeight(obs.receivedAt, nowMs)
  if (weight === 1) return sample(obs)
  const before = obs.previous ? blendObservations(obs.previous, nowMs, empty, sample, mix) : empty
  return weight === 0 ? before : mix(before, sample(obs), weight)
}

/** 0–1 trust in what an observation says of the cover at a minute: from its own time on, till the documented horizon. */
function coverTrust(obs: CloudObservation, at: LocalTime): number {
  const age = minutesBetweenLocal(obs.at, at)
  return age < 0 ? 0 : clamp((COVER_FADE_MIN - age) / (COVER_FADE_MIN - FRESH_MIN), 0, 1)
}

const lerp = (from: number, to: number, weight: number) => from + (to - from) * weight

/** Correct the viewed minute with the model error measured at each satellite observation. */
export function correctCloudCover(obs: CloudObservation, at: LocalTime, nowMs: number | undefined, modelAt: number,
  modelCoverAt: (minute: LocalTime) => number): number {
  return blendObservations(obs, nowMs, modelAt, (sample) => {
    const trust = coverTrust(sample, at)
    return trust === 0 ? modelAt : clamp(modelAt + clamp(sample.cover - modelCoverAt(sample.at), -MAX_SHIFT, MAX_SHIFT) * trust, 0, 100)
  }, lerp)
}

/** The model's cover at a minute as the scene takes it (`atmo/weatherAt.ts`): the hours, and the reading near its time. */
function modelCover(forecast: Forecast, at: LocalTime): number {
  const reading = forecastObservation(forecast)
  const { before, after, fraction } = bracketAt(forecast.hours, at)
  const hour = before?.cloudCover ?? reading.cloudCover
  return lerp(lerp(hour, after?.cloudCover ?? hour, fraction), reading.cloudCover,
    readingWeight(minutesBetweenLocal(reading.time, at)))
}

/** Apply the correction to the weather card and hourly strip. The scene samples it at its own exact minute. */
export function withObservedCloud(forecast: Forecast, obs: CloudObservation | null, now: LocalTime, nowMs?: number): Forecast {
  if (!obs) return forecast
  const modelCovers = new Map<LocalTime, number>()
  const modelCoverAt = (at: LocalTime) => {
    const cached = modelCovers.get(at)
    if (cached !== undefined) return cached
    const cover = modelCover(forecast, at)
    modelCovers.set(at, cover)
    return cover
  }
  const adjust = (at: LocalTime, cover: number) => correctCloudCover(obs, at, nowMs, cover, modelCoverAt)
  // The card stands on the scene's corrected minute as far as an observation is trusted, and on its own reading otherwise.
  const trust = blendObservations(obs, nowMs, 0, (sample) => coverTrust(sample, now), lerp)
  const modelNow = modelCoverAt(now)
  const coverNow = trust === 0 ? forecast.current.cloudCover
    : clamp(adjust(now, modelNow) + (forecast.current.cloudCover - modelNow) * (1 - trust), 0, 100)
  let changed = coverNow !== forecast.current.cloudCover
  const hours = forecast.hours.map((h) => {
    const cover = adjust(h.time, h.cloudCover)
    if (cover === h.cloudCover) return h
    changed = true
    return { ...h, cloudCover: cover, weatherCode: skyCode(h.weatherCode, cover) }
  })
  return changed ? {
    ...forecast,
    hours,
    current: coverNow === forecast.current.cloudCover ? forecast.current
      : { ...forecast.current, cloudCover: coverNow, weatherCode: skyCode(forecast.current.weatherCode, coverNow) },
  } : forecast
}
