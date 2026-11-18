import { useEffect, useMemo, useState } from 'react'
import type { Place } from '../../config/place'
import { curatedForPlace } from './curated'
import { loadIsrael } from './israelData'
import { fetchOverpass } from './overpass'
import { withPlaceHomes } from './placeMarks'
import { shortlist } from './shortlist'
import type { Landmark } from './types'

const MONTH = 30 * 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000
const SESSION_STARTED = Date.now()
interface Cache { at?: number; failed?: number; marks?: Landmark[] }

function key(id: string) { return `shamayim:landmarks:v3:${id}` }
function read(id: string): Cache {
  try { return JSON.parse(localStorage.getItem(key(id)) ?? '{}') as Cache } catch { return {} }
}
function write(id: string, value: Cache) {
  try { localStorage.setItem(key(id), JSON.stringify(value)) } catch { /* Memory-only is fine. */ }
}

interface Loaders {
  israel?: typeof loadIsrael
  overpass?: typeof fetchOverpass
}

export async function loadLandmarkSource(place: Place, signal: AbortSignal, loaders: Loaders = {}) {
  const curated = curatedForPlace(place)
  if (curated) return { marks: curated.marks, curated: true }
  try {
    const israel = await (loaders.israel ?? loadIsrael)(place, signal)
    if (israel !== null) return { marks: shortlist(place, israel), curated: false }
  } catch (error) {
    if (signal.aborted) throw error
  }
  const overpass = await (loaders.overpass ?? fetchOverpass)(place, signal)
  return { marks: shortlist(place, overpass), curated: false }
}

export function useLandmarks(place: Place) {
  const curated = useMemo(() => curatedForPlace(place), [place])
  const [loaded, setLoaded] = useState<{ placeId: string; marks: Landmark[] } | null>(null)
  const cached = useMemo(() => read(place.id), [place.id])
  const fresh = useMemo(() => cached.at && SESSION_STARTED - cached.at < MONTH ? cached.marks ?? [] : null, [cached])
  const available = loaded?.placeId === place.id ? loaded.marks : fresh
  const marks = withPlaceHomes(place, curated?.marks ?? available ?? [], Boolean(curated))

  useEffect(() => {
    if (curated || fresh !== null || (cached.failed && SESSION_STARTED - cached.failed < HOUR)) return
    const controller = new AbortController()
    const run = () => loadLandmarkSource(place, controller.signal).then(({ marks: next }) => {
      write(place.id, { at: Date.now(), marks: next })
      setLoaded({ placeId: place.id, marks: next })
    }).catch(() => { if (!controller.signal.aborted) write(place.id, { failed: Date.now() }) })
    const idle = window.requestIdleCallback?.(run, { timeout: 2_000 })
    if (idle == null) run()
    return () => { controller.abort(); if (idle != null) window.cancelIdleCallback?.(idle) }
  }, [cached.failed, curated, fresh, place])
  return { marks, usesOsm: Boolean(curated || marks.some((mark) => mark.source === 'osm')) }
}
