import { useEffect, useMemo, useState } from 'react'
import type { Place } from '../../config/place'
import { footprintSettlement } from './footprintSource'
import type { VillageTile } from './tile'
import { loadVillageTile, villageTileKey } from './villageData'

/** The place's footprint tile: `undefined` until settled, `null` at once where none was built. */
export function useVillageTile(place: Place): VillageTile | null | undefined {
  const [loaded, setLoaded] = useState<{ place: Place; tile: VillageTile | null } | null>(null)
  useEffect(() => {
    if (!villageTileKey(place)) return
    const controller = new AbortController()
    loadVillageTile(place, controller.signal).catch(() => null).then(tile => {
      if (!controller.signal.aborted) setLoaded({ place, tile })
    })
    return () => controller.abort()
  }, [place])
  if (!villageTileKey(place)) return null
  return loaded?.place === place ? loaded.tile : undefined
}

/** Whether the place is drawn from real footprints, so their credit is owed. */
export function useHasFootprints(place: Place): boolean {
  const tile = useVillageTile(place)
  return useMemo(() => Boolean(tile && footprintSettlement(tile, place)), [tile, place])
}