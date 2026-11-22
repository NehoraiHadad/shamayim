import { lowBaseM } from './clouds'
import { RANGES } from './field/cells'
import { layerSnapshot } from './field/density'
import { seenCells } from './field/seenCells'
import { hereCell } from './field/hereCell'
import { smoothstep } from './field/genus'
import type { WeightedSighting } from '../domain/cloudSightings'
import { buildField, fieldSteering } from './field/field'
import type { FieldInput } from './field/types'
import type { AirInput } from '../atmo/airTypes'
import type { Weather } from '../atmo/weatherMix'
import { arrivalWeight, blendForecast, forecastObservation } from '../domain/forecastRefresh'
import type { Forecast } from '../domain/types'
import { wallMinutes } from './field/advect'

type Snapshot = { field: ReturnType<typeof buildField>; snapshot: ReturnType<typeof layerSnapshot>[] }
const byForecast = new WeakMap<FieldInput['hours'], Map<string, Map<string, Snapshot>>>()

export function cloudFieldAt(hours: FieldInput['hours'], placeId: string, elevation: number) {
  // Keep a small window of exact snapshots. A published grid can still be
  // read by an older world, so its storage must never be overwritten.
  let places = byForecast.get(hours)
  if (!places) byForecast.set(hours, places = new Map())
  const placeKey = JSON.stringify([placeId, elevation])
  let recent = places.get(placeKey)
  if (!recent) {
    if (places.size === 4) places.delete(places.keys().next().value!)
    places.set(placeKey, recent = new Map())
  }
  return (at: FieldInput['at'], covers: FieldInput['covers'],
    shown: Pick<AirInput, 'temperature' | 'humidity'> & (Pick<Weather, 'fieldWeather' | 'mist'> | Pick<FieldInput, 'weatherCode'>),
    sunAltitude: number, wind10: FieldInput['wind10'], rain: FieldInput['rain'], motion?: FieldInput['motion'], seen: readonly WeightedSighting[] = []) => {
    const baseM = lowBaseM(shown.temperature, shown.humidity)
    const fallbackM = lowBaseM(shown.temperature, null)
    const humidityWeight = 'mist' in shown ? shown.mist.humidityWeight : 1
    const lowBaseKm = (fallbackM + (baseM - fallbackM) * humidityWeight) / 1000
    const weather = 'fieldWeather' in shown ? { weather: shown.fieldWeather } : { weatherCode: shown.weatherCode }
    const key = motion ? undefined : JSON.stringify([at, covers.low, covers.mid, covers.high, lowBaseKm, weather,
      sunAltitude, wind10.speedKmh, wind10.fromDeg, rain, seen])
    const cached = key === undefined ? undefined : recent.get(key)
    if (cached) return cached
    const field = buildField({ hours, placeId, elevationKm: elevation / 1000, at, covers,
      lowBaseKm, ...weather, sunAltitude, wind10, rain, motion })
    const snapshot = field.layers.map((layer) => layerSnapshot(field, layer.lattice, 0, 0, RANGES[layer.lattice][1], field.t,
      layer.lattice === 'low' ? seenCells(seen, layer)
        : layer.lattice === 'tower' ? hereCell(layer, rain, smoothstep(0.3, 0.9, layer.form.conv), wind10.fromDeg, placeId) : []))
    const result = { field, snapshot }
    if (key !== undefined) {
      if (recent.size === 3) recent.delete(recent.keys().next().value!)
      recent.set(key, result)
    }
    return result
  }
}

/** The field's integrated steering history comes in on the same clock as the sampled weather. */
export function cloudMotion(forecast: Forecast, at: FieldInput['at'], nowMs: number, forced: Partial<AirInput>): FieldInput['motion'] {
  const unsettled = forecast.previous && arrivalWeight(forecast.previous.receivedAt, nowMs) < 1
  if (forecast.hours.length && !unsettled) return undefined
  return blendForecast(forecast, nowMs, (source) => {
    const observation = forecastObservation(source)
    return fieldSteering({ hours: source.hours, placeId: forecast.placeId, elevationKm: forecast.elevation / 1000, at,
      wind10: { speedKmh: forced.windSpeed ?? observation.windSpeed, fromDeg: forced.windDirection ?? observation.windDirection },
    }, wallMinutes(observation.time)).at
  }, (before, after, weight) => (index, minute) => {
    const a = before(index, minute), b = after(index, minute)
    const mix = (x: number, y: number) => x + (y - x) * weight
    return { d: [mix(a.d[0], b.d[0]), mix(a.d[1], b.d[1])], vel: [mix(a.vel[0], b.vel[0]), mix(a.vel[1], b.vel[1])] }
  })
}

export type WorldCloudField = ReturnType<ReturnType<typeof cloudFieldAt>>
