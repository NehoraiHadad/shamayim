import { lowBaseM } from './clouds'
import { RANGES } from './field/cells'
import { layerSnapshot } from './field/density'
import { buildField } from './field/field'
import type { FieldInput } from './field/types'
import type { AirInput } from '../atmo/airTypes'

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
    shown: Pick<AirInput, 'temperature' | 'humidity' | 'weatherCode'>, sunAltitude: number,
    wind10: FieldInput['wind10'], rain: FieldInput['rain'], weatherForced = false) => {
    const lowBaseKm = lowBaseM(shown.temperature, shown.humidity) / 1000
    const key = JSON.stringify([at, covers.low, covers.mid, covers.high, lowBaseKm, shown.weatherCode,
      sunAltitude, wind10.speedKmh, wind10.fromDeg, rain?.level, rain?.rate, weatherForced])
    const cached = recent.get(key)
    if (cached) return cached
    const field = buildField({ hours, placeId, elevationKm: elevation / 1000, at, covers,
      lowBaseKm, weatherCode: shown.weatherCode,
      sunAltitude, wind10, rain, weatherForced })
    const snapshot = field.layers.map(({ lattice }) => layerSnapshot(field, lattice, 0, 0, RANGES[lattice][1]))
    const result = { field, snapshot }
    if (recent.size === 3) recent.delete(recent.keys().next().value!)
    recent.set(key, result)
    return result
  }
}

export type WorldCloudField = ReturnType<ReturnType<typeof cloudFieldAt>>
