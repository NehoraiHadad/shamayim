import type { Place } from '../config/place'
import { SHADMOT_MEHOLA } from '../config/place'

const PLACE_KEY = 'shamayim:place:v1'
const RECENT_KEY = 'shamayim:recent-places:v1'
const MAX_RECENT = 4
type Store = Pick<Storage, 'getItem' | 'setItem'>

function valid(value: unknown): value is Place {
  if (!value || typeof value !== 'object') return false
  const place = value as Partial<Place>
  return typeof place.id === 'string' && typeof place.nameHe === 'string'
    && typeof place.regionHe === 'string' && typeof place.lat === 'number'
    && typeof place.lon === 'number' && typeof place.timezone === 'string'
}

function storage(): Store | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

export function readPlace(store: Store | null = storage()): Place {
  try {
    const value = store?.getItem(PLACE_KEY)
    const parsed: unknown = value ? JSON.parse(value) : null
    return valid(parsed) ? parsed : SHADMOT_MEHOLA
  } catch {
    return SHADMOT_MEHOLA
  }
}

export function readRecentPlaces(store: Store | null = storage()): Place[] {
  try {
    const value = store?.getItem(RECENT_KEY)
    const parsed: unknown = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed.filter(valid).slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

export function persistPlace(place: Place, store: Store | null = storage()): Place[] {
  const recent = [place, ...readRecentPlaces(store).filter(({ id }) => id !== place.id)].slice(0, MAX_RECENT)
  try {
    store?.setItem(PLACE_KEY, JSON.stringify(place))
    store?.setItem(RECENT_KEY, JSON.stringify(recent))
  } catch {
    // Storage can be blocked or full; selection still works for this session.
  }
  return recent
}
