import { arrivalWeight } from './forecastRefresh'
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

/** The correction decays to nothing over this much forecast time, so later hours stay the model's. */
const DECAY_MIN = 150
/** An observation counts fully while fresh and not at all once this old (satellite runs ~20–35 min late). */
const FRESH_MIN = 40
const STALE_MIN = 100
/** Never move the model by more than this many points: a cloud mask is binary and can be fooled. */
const MAX_SHIFT = 40

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** 0–1 trust in an observation by its age at `now`. */
export function observationWeight(obs: CloudObservation, now: LocalTime): number {
  const age = minutesBetweenLocal(obs.at, now)
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

/** The satellite can correct a minute only from its observation onward. */
export function correctCloudCover(obs: CloudObservation, now: LocalTime, at: LocalTime, nowMs: number | undefined,
  modelNow: number, modelAt: number): number {
  const decay = clamp(1 - minutesBetweenLocal(now, at) / DECAY_MIN, 0, 1)
  const shift = blendObservations(obs, nowMs, 0, (sample) => {
    if (at < sample.at) return 0
    return clamp((sample.cover - modelNow) * observationWeight(sample, now), -MAX_SHIFT, MAX_SHIFT) * decay
  }, (before, after, weight) => before + (after - before) * weight)
  return clamp(modelAt + shift, 0, 100)
}

/** Apply the correction to the weather card and hourly strip. The scene samples it at its own exact minute. */
export function withObservedCloud(forecast: Forecast, obs: CloudObservation | null, now: LocalTime, nowMs?: number): Forecast {
  if (!obs) return forecast
  const modelNow = (forecast.observation ?? forecast.current).cloudCover
  const adjust = (at: LocalTime, cover: number) => correctCloudCover(obs, now, at, nowMs, modelNow, cover)
  const coverNow = adjust(now, forecast.current.cloudCover)
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
    current: { ...forecast.current, cloudCover: coverNow, weatherCode: skyCode(forecast.current.weatherCode, coverNow) },
  } : forecast
}
