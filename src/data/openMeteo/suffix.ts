import { column, type Json } from './guards'

/** Open-Meteo model identifiers used to read suffixed forecast columns. */
export const MODELS = ['icon_seamless', 'ecmwf_ifs025'] as const

export type Model = (typeof MODELS)[number]

export function modelColumn(block: Json, key: string, model: Model, length: number, path: string): unknown[] {
  const name = `${key}_${model}`
  return block[name] === undefined ? Array(length).fill(null) : column(block, name, length, path)
}
