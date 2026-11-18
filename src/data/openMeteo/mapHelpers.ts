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

/**
 * Low and mid cloud together (0–100), the cloud the moon does not shine through: the two layers taken as independent,
 * so 50 % low and 50 % mid cover 75 % of the sky. Null when either layer is unknown.
 */
export function thickCloud(low: number | null, mid: number | null): number | null {
  if (low === null || mid === null) return null
  return Math.round(100 * (1 - (1 - low / 100) * (1 - mid / 100)))
}

export function spread(pair: Pair): number {
  const icon = pair.icon ?? pair.ecmwf ?? 0
  const ecmwf = pair.ecmwf ?? pair.icon ?? 0
  return roundTemperature(Math.abs(icon - ecmwf))
}
