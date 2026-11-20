import { useEffect, useState } from 'react'
import type { Place } from '../../config/place'
import { loadLandCover, type LandCover } from './landData'
import type { Land } from './landPaint'
import { fetchLandColour, type LandColour } from './satellite'

const key = (id: string) => `shamayim:land-colour:v1:${id}`
/** A satellite colour older than this is fetched again (a clear scene comes every 2–5 days). */
const FRESH_MS = 5 * 86_400_000

function readColour(id: string): LandColour | null {
  try {
    const stored = JSON.parse(localStorage.getItem(key(id)) ?? 'null') as (Omit<LandColour, 'rgb'> & { rgb: string }) | null
    if (!stored) return null
    return { ...stored, rgb: Uint8Array.from(atob(stored.rgb), c => c.charCodeAt(0)) }
  } catch { return null }
}

function writeColour(id: string, colour: LandColour) {
  try {
    let binary = ''
    for (const byte of colour.rgb) binary += String.fromCharCode(byte)
    localStorage.setItem(key(id), JSON.stringify({ ...colour, rgb: btoa(binary) }))
  } catch { /* Memory only is fine. */ }
}

/** The land around a place (cover from our data, this week's colour from Sentinel-2); fields stay null until known. */
export function useLand(place: Place, enabled: boolean): Land {
  const [land, setLand] = useState<Land & { id: string }>(() => ({ id: place.id, cover: null, colour: enabled ? readColour(place.id) : null }))
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const stored = readColour(place.id)
    setLand({ id: place.id, cover: null, colour: stored })
    loadLandCover(place, controller.signal).then(cover => {
      if (!controller.signal.aborted) setLand(now => ({ ...now, id: place.id, cover }))
    }).catch(() => undefined)
    if (!stored || Date.now() - stored.fetchedAt > FRESH_MS) {
      fetchLandColour(place, controller.signal).then(colour => {
        if (!colour || controller.signal.aborted) return
        writeColour(place.id, colour)
        setLand(now => ({ ...now, id: place.id, colour }))
      }).catch(() => undefined)
    }
    return () => controller.abort()
  }, [place, enabled])
  return land.id === place.id ? land : { cover: null, colour: null }
}

/** Only the land cover round a place (within `radiusKm`), for its portrait (`coverMarks`); null until known or outside. */
export function useLandCover(place: Place, radiusKm = 2): LandCover | null {
  const [cover, setCover] = useState<{ id: string; cover: LandCover | null } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    loadLandCover(place, controller.signal, radiusKm).then(next => {
      if (!controller.signal.aborted) setCover({ id: place.id, cover: next })
    }).catch(() => undefined)
    return () => controller.abort()
  }, [place, radiusKm])
  return cover?.id === place.id ? cover.cover : null
}
