/** Small runtime guards for untrusted API JSON (no schema library needed for v1). */

export class DataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DataError'
  }
}

export type Json = Record<string, unknown>

export function obj(v: unknown, path: string): Json {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new DataError(`${path}: expected object`)
  return v as Json
}

export function num(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new DataError(`${path}: expected number`)
  return v
}

export function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function str(v: unknown, path: string): string {
  if (typeof v !== 'string') throw new DataError(`${path}: expected string`)
  return v
}

/** Read a column array and check it matches the time axis length. */
export function column(block: Json, key: string, length: number, path: string): unknown[] {
  const v = block[key]
  if (!Array.isArray(v)) throw new DataError(`${path}.${key}: missing`)
  if (v.length !== length) throw new DataError(`${path}.${key}: length ${v.length} != ${length}`)
  return v
}

export function expectUnit(units: Json, key: string, expected: string, path: string): void {
  if (units[key] !== undefined && units[key] !== expected) {
    throw new DataError(`${path}.${key}: unit ${String(units[key])}, expected ${expected}`)
  }
}
