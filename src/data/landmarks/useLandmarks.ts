import { useEffect, useMemo, useState } from 'react'
import type { Place } from '../../config/place'
import { mappedCropAreas, type CropArea } from './cropAreas'
import { withIcons } from './curated'
import { loadIsrael } from './israelData'
import { fetchOverpass } from './overpass'
import { withPlaceHomes } from './placeMarks'
import { panoramaShortlist, seatCandidates, shortlist } from './shortlist'
import type { Landmark } from './types'

const MONTH = 30 * 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000
const SESSION_STARTED = Date.now()
const EMPTY: Landmark[] = []
const isOsm = (mark: Landmark) => mark.source === 'osm' || mark.source === 'curated'
interface Cache { at?: number; failed?: number; marks?: Landmark[]; panoramaMarks?: Landmark[]; aroundMarks?: Landmark[]
  sceneMarks?: Landmark[]; seatCandidates?: Landmark[]; cropAreas?: readonly CropArea[] }

const EMPTY_CROPS: readonly CropArea[] = []
// v7: landmarks carry their fame (wikidata / wikipedia), and the three curated cities are read from the data too.
// v8: rows cached before evidence-based worship heights carry the legacy 30 m minaret / 25 m church defaults.
// v9: beyond-town seat candidates are carried separately from sceneMarks so the own portrait shortlist stays unchanged.
// v10: crop footprints overlapping CROP_REACH_KM travel beside the marks, so localStorage stays compact.
// v11: rerank before the drawing budgets so cached minarets no longer displace visible marks.
function key(id: string) { return `shamayim:landmarks:v11:${id}` }
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

/** Every place alike: its mapped landmarks, ranked by kind, size and fame, with the hand-drawn icons in reach. */
export async function loadLandmarkSource(place: Place, signal: AbortSignal, loaders: Loaders = {}) {
  const rank = (mapped: Landmark[]) => {
    const raw = withIcons(place, mapped.filter((mark) => !mark.areaOnly))
    const sceneMarks = panoramaShortlist(place, raw, false, 'landmark')
    return { marks: shortlist(place, raw), panoramaMarks: panoramaShortlist(place, raw), cropAreas: mappedCropAreas(mapped),
      aroundMarks: panoramaShortlist(place, raw, true),
      // The canvas scene's pool (C5): beyond the place only landmarks; remaining skyline settlement marks travel separately to beyond seating.
      sceneMarks, seatCandidates: seatCandidates(place, raw, sceneMarks) }
  }
  try {
    const israel = await (loaders.israel ?? loadIsrael)(place, signal)
    if (israel !== null) return rank(israel)
  } catch (error) {
    if (signal.aborted) throw error
  }
  const overpass = await (loaders.overpass ?? fetchOverpass)(place, signal)
  return rank(overpass)
}

/** `scene`: the scene's pool over a panorama (beyond the place only landmarks, C5); the older panorama pool otherwise. */
export function useLandmarks(place: Place, panorama = false, around = false, scene = false) {
  const [loaded, setLoaded] = useState<(Awaited<ReturnType<typeof loadLandmarkSource>> & { placeId: string }) | null>(null)
  const cached = useMemo(() => read(place.id), [place.id])
  const fresh = useMemo(() => cached.at && SESSION_STARTED - cached.at < MONTH ? cached : null, [cached])
  const available = loaded?.placeId === place.id ? loaded : fresh
  const pool = around ? available?.aroundMarks : panorama ? (scene ? available?.sceneMarks ?? available?.panoramaMarks
    : available?.panoramaMarks) : available?.marks
  const marks = useMemo(() => withPlaceHomes(place, pool ?? []), [place, pool])
  const beyond = !around && panorama && scene ? available?.seatCandidates ?? EMPTY : EMPTY

  useEffect(() => {
    if (fresh !== null || (cached.failed && SESSION_STARTED - cached.failed < HOUR)) return
    const controller = new AbortController()
    const run = () => loadLandmarkSource(place, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      write(place.id, { at: Date.now(), ...result })
      setLoaded({ placeId: place.id, ...result })
    }).catch(() => { if (!controller.signal.aborted) write(place.id, { failed: Date.now() }) })
    const idle = window.requestIdleCallback?.(run, { timeout: 2_000 })
    if (idle == null) run()
    return () => { controller.abort(); if (idle != null) window.cancelIdleCallback?.(idle) }
  }, [cached.failed, fresh, place])
  return { marks, seatCandidates: beyond, cropAreas: available?.cropAreas ?? EMPTY_CROPS,
    usesOsm: Boolean(available?.cropAreas?.length) || marks.some(isOsm) || beyond.some(isOsm) }
}
