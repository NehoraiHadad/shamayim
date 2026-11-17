import type { Place } from '../config/place'
import type { DayNormal, LocalDate } from '../domain/types'
import { column, num, obj } from './openMeteo/guards'
import { normalsUrl } from './weatherApi'

const FIELDS = ['tempMax', 'tempMaxSd', 'tempMin', 'gustMax', 'gustMaxSd'] as const
export type NormalsTable = Record<typeof FIELDS[number], number[]>
const KEEP_MS = 180 * 24 * 3600_000
const key = (id: string) => `shamayim:normals:v1:${id}`

export function validateNormals(input: unknown): NormalsTable {
  const raw = obj(input, 'normals')
  return Object.fromEntries(FIELDS.map((field) => [field,
    column(raw, field, 366, 'normals').map((v) => num(v, `normals.${field}`)),
  ])) as NormalsTable
}

function read(placeId: string): NormalsTable | null {
  try {
    const raw = localStorage.getItem(key(placeId))
    if (!raw) return null
    const cached = JSON.parse(raw)
    const age = Date.now() - num(cached.savedAt, 'savedAt')
    return age >= 0 && age < KEEP_MS ? validateNormals(cached.table) : null
  } catch { return null }
}

export async function fetchNormals(place: Place, signal?: AbortSignal): Promise<NormalsTable | null> {
  const url = normalsUrl(new URLSearchParams({ latitude: String(place.lat), longitude: String(place.lon) }))
  if (!url) return null
  const cached = read(place.id)
  if (cached) return cached
  const timeout = AbortSignal.timeout(8000)
  const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
  if (!res.ok) throw new Error(`Normals HTTP ${res.status}`)
  const table = validateNormals(await res.json())
  try {
    localStorage.setItem(key(place.id), JSON.stringify({ savedAt: Date.now(), table }))
  } catch { /* Storage may be blocked or full. */ }
  return table
}

/** Always index a leap year, including for dates in non-leap forecast years. */
export function normalsFor(table: NormalsTable, dates: LocalDate[]): Record<LocalDate, DayNormal> {
  return Object.fromEntries(dates.map((date) => {
    const slot = (Date.parse(`2000-${date.slice(5)}T00:00:00Z`) - Date.UTC(2000, 0, 1)) / 86400_000
    const day: DayNormal = { tempMax: table.tempMax[slot], tempMaxSd: table.tempMaxSd[slot],
      tempMin: table.tempMin[slot], gustMax: table.gustMax[slot], gustMaxSd: table.gustMaxSd[slot] }
    return [date, day]
  }))
}
