import { useEffect, useMemo, useState } from 'react'
import type { Place } from '../../config/place'
import { curatedForPlace } from './curated'
import { buildQuery, parseOverpass } from './overpass'
import { offsetKm, toX } from './project'
import { score } from './rank'
import type { Landmark } from './types'

const MONTH = 30 * 24 * 60 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000
const SESSION_STARTED = Date.now()
interface Cache { at?: number; failed?: number; marks?: Landmark[] }

function key(id: string) { return `shamayim:landmarks:v1:${id}` }
function read(id: string): Cache {
  try { return JSON.parse(localStorage.getItem(key(id)) ?? '{}') as Cache } catch { return {} }
}
function write(id: string, value: Cache) {
  try { localStorage.setItem(key(id), JSON.stringify(value)) } catch { /* Memory-only is fine. */ }
}

function fallback(place: Place): Landmark[] {
  if (!place.featureCode?.startsWith('PPL')) return []
  const size = (place.population ?? 0) < 2_000 ? 'small' : (place.population ?? 0) < 50_000 ? 'medium' : 'large'
  const heightM = size === 'small' ? 6 : size === 'medium' ? 8 : 14
  return [{ id: `${place.id}-homes`, kind: 'homes', glyph: `homes-${size}`, nameHe: place.nameHe,
    lat: place.lat, lon: place.lon, heightM, source: 'place' }]
}

function ranked(place: Place, marks: Landmark[]) {
  return marks.flatMap((mark) => {
    const { dx, dy } = offsetKm(place, mark)
    const layer = toX(dx)?.layer
    if (!layer) return []
    const band = layer === 'near' ? 1.5 : 3
    if (Math.abs(dy) > band || (layer === 'far' && mark.heightM < 60
      && !['chimney', 'cooling', 'turbine'].includes(mark.kind))) return []
    return [{ mark, value: score(mark, dx, dy, band) }]
  }).sort((a, b) => b.value - a.value).slice(0, 8).map(({ mark }) => mark)
}

async function request(place: Place, signal: AbortSignal): Promise<Landmark[]> {
  const query = encodeURIComponent(buildQuery(place))
  let lastError: unknown
  for (const host of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const response = await fetch(`${host}?data=${query}`, { signal })
      if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`)
      return ranked(place, parseOverpass(await response.json()))
    } catch (error) {
      if (signal.aborted) throw error
      lastError = error
    }
  }
  throw lastError
}

export function useLandmarks(place: Place) {
  const curated = useMemo(() => curatedForPlace(place), [place])
  const [loaded, setLoaded] = useState<{ placeId: string; marks: Landmark[] } | null>(null)
  const cached = useMemo(() => read(place.id), [place.id])
  const fresh = useMemo(() => cached.at && SESSION_STARTED - cached.at < MONTH ? cached.marks ?? [] : null, [cached])
  const available = loaded?.placeId === place.id ? loaded.marks : fresh
  const marks = curated?.marks ?? (available?.length ? available : fallback(place))

  useEffect(() => {
    if (curated || fresh || (cached.failed && SESSION_STARTED - cached.failed < DAY)) return
    const controller = new AbortController()
    const run = () => request(place, controller.signal).then((next) => {
      write(place.id, { at: Date.now(), marks: next })
      setLoaded({ placeId: place.id, marks: next.length ? next : fallback(place) })
    }).catch(() => { if (!controller.signal.aborted) write(place.id, { failed: Date.now() }) })
    const idle = window.requestIdleCallback?.(run, { timeout: 2_000 })
    if (idle == null) run()
    return () => { controller.abort(); if (idle != null) window.cancelIdleCallback?.(idle) }
  }, [cached.failed, curated, fresh, place])
  return { marks, usesOsm: Boolean(curated || marks.some((mark) => mark.source === 'osm')) }
}
