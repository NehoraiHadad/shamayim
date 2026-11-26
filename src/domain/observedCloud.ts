import { bracketAt } from './bracket'
import { skyCodeForCover } from './conditions'
import { arrivalWeight, forecastObservation, readingWeight } from './forecastRefresh'
import { minutesBetweenLocal } from './minutes'
import { smoothstep } from './smoothstep'
import type { CloudSighting } from './cloudSightings'
import type { Forecast, LocalTime } from './types'

/** What the satellite saw around the place: the cloudy share of pixels (0–100) at a wall-clock time. */
export interface CloudObservation {
  cover: number
  at: LocalTime
  receivedAt?: number
  previous?: CloudObservation
  /** The covers of the slots right before it, newest first, as far as they are known without a gap. */
  before?: readonly number[]
  /** The place is within the region where the short-range persistence forecast was verified. */
  calibratedPersistence?: boolean
  /** 0–1: how much daylight the satellite saw by; without it the mask misses fog and takes cold ground for cloud. */
  daylight?: number
  /** The single cloud patches near the place, biggest-looking first (see `cloudSightings`). */
  sightings?: CloudSighting[]
}

/** Satellite data runs ~20–35 minutes late, so allow full trust through 40 minutes. */
const FRESH_MIN = 40
/** Individual patches are too old to show as live sightings after 100 minutes. */
const STALE_MIN = 100
/** Fade bulk cover to the model by the documented ~2.5-hour horizon as the observed sky loses relevance. */
const COVER_FADE_MIN = 150
/** Cap the error in percentage points because a binary cloud mask can misclassify pixels: the most one slot alone may say. */
const MAX_SHIFT = 40
/** This many slots in a row, all clear or all cloudy, are no pixel's mistake: the cap gives way. */
export const AGREEING_SLOTS = 3
/** Points off all clear (or all cloudy): a slot this near it agrees wholly, one this far not at all. */
const UNANIMOUS = 2
const DIVIDED = 10
/** Without daylight, an error this big may be fog the mask misses, or cold ground it takes for cloud: the cap comes back. */
const NIGHT_DOUBT = [70, 90] as const

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** 0–1 trust in an observation by its age at `now`. */
export function observationWeight(obs: CloudObservation, now: LocalTime): number {
  const age = minutesBetweenLocal(obs.at, now)
  // Allow a slightly ahead timestamp for live sightings when the clocks differ.
  if (age < -15) return 0
  return clamp(1 - (age - FRESH_MIN) / (STALE_MIN - FRESH_MIN), 0, 1)
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
function coverTrust(age: number): number {
  return age < 0 ? 0 : clamp((COVER_FADE_MIN - age) / (COVER_FADE_MIN - FRESH_MIN), 0, 1)
}

const lerp = (from: number, to: number, weight: number) => from + (to - from) * weight

/** 0–1: the slots up to the observation's agree on a wholly clear sky, or on a wholly cloudy one. */
function agreement({ cover, before = [] }: CloudObservation): number {
  if (before.length < AGREEING_SLOTS - 1) return 0
  const covers = [cover, ...before.slice(0, AGREEING_SLOTS - 1)]
  const on = (sky: number) => 1 - smoothstep(UNANIMOUS, DIVIDED, Math.max(...covers.map((seen) => Math.abs(seen - sky))))
  return Math.max(on(0), on(100))
}

/** Maximum departure from the model supported by the mask. */
function correctionLimit(obs: CloudObservation, error: number): number {
  const doubt = (1 - (obs.daylight ?? 0)) * smoothstep(...NIGHT_DOUBT, Math.abs(error))
  return lerp(MAX_SHIFT, 100, agreement(obs) * (1 - doubt))
}

/**
 * A short forecast that the latest cover persists. Give it less weight if the three masks disagree,
 * the model expects a rapid change, or a large discrepancy in low light could be a mask error.
 * The lead-time blend was replayed against later masks (research/verification).
 */
function persistenceWeight(obs: CloudObservation, age: number, error: number, modelChange: number): number {
  const [previous, oldest] = obs.before ?? []
  if (!obs.calibratedPersistence || previous === undefined || oldest === undefined || age >= 105) return 0
  const spread = Math.max(obs.cover, previous, oldest) - Math.min(obs.cover, previous, oldest)
  const stability = 1 - smoothstep(10, 30, spread)
  const doubt = (1 - (obs.daylight ?? 0)) * smoothstep(55, 85, Math.abs(error))
  const tendency = 1 - smoothstep(25, 60, Math.abs(modelChange))
  const lead = smoothstep(0, 30, age) * (1 - smoothstep(45, 105, age))
  return 0.8 * (0.5 + 0.5 * stability) * (1 - doubt) * tendency * lead
}

/** Combine cloud persistence and the observation-corrected model at the viewed minute. */
export function correctCloudCover(obs: CloudObservation, at: LocalTime, nowMs: number | undefined, modelAt: number,
  modelCoverAt: (minute: LocalTime) => number): number {
  return blendObservations(obs, nowMs, modelAt, (sample) => {
    const age = minutesBetweenLocal(sample.at, at)
    const trust = coverTrust(age)
    if (trust === 0) return modelAt
    const observedModel = modelCoverAt(sample.at)
    const error = sample.cover - observedModel
    const limit = correctionLimit(sample, error)
    const correctedModel = clamp(modelAt + clamp(error, -limit, limit) * trust, 0, 100)
    const persistence = clamp(sample.cover, modelAt - limit, modelAt + limit)
    return lerp(correctedModel, persistence, persistenceWeight(sample, age, error, modelAt - observedModel))
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
  const trust = blendObservations(obs, nowMs, 0, (sample) => coverTrust(minutesBetweenLocal(sample.at, now)), lerp)
  const modelNow = modelCoverAt(now)
  const coverNow = trust === 0 ? forecast.current.cloudCover
    : clamp(adjust(now, modelNow) + (forecast.current.cloudCover - modelNow) * (1 - trust), 0, 100)
  let changed = coverNow !== forecast.current.cloudCover
  const hours = forecast.hours.map((h) => {
    const cover = adjust(h.time, h.cloudCover)
    if (cover === h.cloudCover) return h
    changed = true
    return { ...h, cloudCover: cover, weatherCode: skyCodeForCover(h.weatherCode, cover) }
  })
  return changed ? {
    ...forecast,
    hours,
    current: coverNow === forecast.current.cloudCover ? forecast.current
      : { ...forecast.current, cloudCover: coverNow, weatherCode: skyCodeForCover(forecast.current.weatherCode, coverNow) },
  } : forecast
}
