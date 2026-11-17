import { useEffect, useMemo, useState } from 'react'
import type { Place } from '../../config/place'
import { curatedForPlace } from './curated'
import { fetchOverpass } from './overpass'
import { withPlaceHomes } from './placeMarks'
import { offsetKm, toX } from './project'
import { score } from './rank'
import type { Landmark } from './types'

const MONTH = 30 * 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000
const SESSION_STARTED = Date.now()
interface Cache { at?: number; failed?: number; marks?: Landmark[] }

function key(id: string) { return `shamayim:landmarks:v1:${id}` }
function read(id: string): Cache {
  try { return JSON.parse(localStorage.getItem(key(id)) ?? '{}') as Cache } catch { return {} }
}
function write(id: string, value: Cache) {
  try { localStorage.setItem(key(id), JSON.stringify(value)) } catch { /* Memory-only is fine. */ }
}

function ranked(place: Place, marks: Landmark[]) {
  const ordered = marks.flatMap((mark) => {
    const { dx, dy } = offsetKm(place, mark)
    const layer = toX(dx)?.layer
    if (!layer) return []
    const band = layer === 'near' ? 1.5 : 3
    if (Math.abs(dy) > band || (layer === 'far' && mark.heightM < 60
      && !['chimney', 'cooling', 'turbine'].includes(mark.kind))) return []
    return [{ mark, value: score(mark, dx, dy, band) }]
  }).sort((a, b) => b.value - a.value)
  const selected = ordered.slice(0, 8)
  const skyline = ordered.find(({ mark }) => mark.kind === 'highrise'
    && Math.hypot(offsetKm(place, mark).dx, offsetKm(place, mark).dy) <= 1)
  if (skyline && !selected.includes(skyline)) selected.splice(7, 1, skyline)
  return selected.map(({ mark }) => mark)
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
    const run = () => fetchOverpass(place, controller.signal).then((found) => ranked(place, found)).then((next) => {
      write(place.id, { at: Date.now(), marks: next })
      setLoaded({ placeId: place.id, marks: next })
    }).catch(() => { if (!controller.signal.aborted) write(place.id, { failed: Date.now() }) })
    const idle = window.requestIdleCallback?.(run, { timeout: 2_000 })
    if (idle == null) run()
    return () => { controller.abort(); if (idle != null) window.cancelIdleCallback?.(idle) }
  }, [cached.failed, curated, fresh, place])
  return { marks, usesOsm: Boolean(curated || marks.some((mark) => mark.source === 'osm')) }
}
