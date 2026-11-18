import { minutesBetweenLocal } from './minutes'
import type { CloudSighting } from './cloudSightings'
import type { Forecast, LocalTime } from './types'

/** What the satellite saw around the place: the cloudy share of pixels (0–100) at a wall-clock time. */
export interface CloudObservation {
  cover: number
  at: LocalTime
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

/**
 * The forecast with "now" nudged toward what the satellite saw: the difference from the model, weighted by how
 * fresh the observation is, applied in full now and fading linearly to zero over the next ~2.5 h of hours.
 * The same corrected values feed the icon, the sentence and the scene, so the screen does not contradict itself.
 */
export function withObservedCloud(forecast: Forecast, obs: CloudObservation | null, now: LocalTime): Forecast {
  if (!obs) return forecast
  const weight = observationWeight(obs, now)
  if (weight <= 0) return forecast
  const shift = clamp((obs.cover - forecast.current.cloudCover) * weight, -MAX_SHIFT, MAX_SHIFT)
  if (Math.abs(shift) < 3) return forecast
  const adjust = (cover: number, lead: number) => clamp(cover + shift * clamp(1 - lead / DECAY_MIN, 0, 1), 0, 100)
  const coverNow = adjust(forecast.current.cloudCover, 0)
  return {
    ...forecast,
    current: { ...forecast.current, cloudCover: coverNow, weatherCode: skyCode(forecast.current.weatherCode, coverNow) },
    hours: forecast.hours.map((h) => {
      const lead = minutesBetweenLocal(now, h.time)
      if (lead <= -60 || lead >= DECAY_MIN) return h
      const cover = adjust(h.cloudCover, Math.max(0, lead))
      return { ...h, cloudCover: cover, weatherCode: skyCode(h.weatherCode, cover) }
    }),
  }
}
