import { roundTemperature } from '../../domain/blend'
import { numOrNull, type Json } from './guards'
import { modelColumn } from './suffix'

export interface Pair {
  icon: number | null
  ecmwf: number | null
}

export function pairs(block: Json, key: string, length: number, path: string): Pair[] {
  const icon = modelColumn(block, key, 'icon_seamless', length, path)
  const ecmwf = modelColumn(block, key, 'ecmwf_ifs025', length, path)
  return icon.map((value, index) => ({ icon: numOrNull(value), ecmwf: numOrNull(ecmwf[index]) }))
}

export function spread(pair: Pair): number {
  const icon = pair.icon ?? pair.ecmwf ?? 0
  const ecmwf = pair.ecmwf ?? pair.icon ?? 0
  return roundTemperature(Math.abs(icon - ecmwf))
}
