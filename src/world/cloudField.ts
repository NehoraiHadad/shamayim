import { lowBaseM } from './clouds'
import { RANGES } from './field/cells'
import { layerSnapshot } from './field/density'
import { buildField } from './field/field'
import type { FieldInput } from './field/types'
import type { AirInput } from '../atmo/airTypes'

export function cloudFieldAt(hours: FieldInput['hours'], placeId: string, elevation: number) {
  // The field core keeps the forecast's steering integrals and seeded site blocks.
  return (at: FieldInput['at'], covers: FieldInput['covers'], shown: AirInput, sunAltitude: number,
    wind10: FieldInput['wind10'], rain: FieldInput['rain'], weatherForced = false) => {
    const field = buildField({ hours, placeId, elevationKm: elevation / 1000, at, covers,
      lowBaseKm: lowBaseM(shown.temperature, shown.humidity) / 1000, weatherCode: shown.weatherCode,
      sunAltitude, wind10, rain, weatherForced })
    const snapshot = field.layers.map(({ lattice }) => layerSnapshot(field, lattice, 0, 0, RANGES[lattice][1]))
    return { field, snapshot }
  }
}

export type WorldCloudField = ReturnType<ReturnType<typeof cloudFieldAt>>
