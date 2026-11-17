import { useCallback, useState } from 'react'
import type { Place } from '../config/place'
import { persistPlace, readPlace, readRecentPlaces } from './placeStorage'

export interface PlaceState {
  place: Place
  recent: Place[]
  selectPlace: (place: Place) => void
}

export function usePlace(): PlaceState {
  const [place, setPlace] = useState(readPlace)
  const [recent, setRecent] = useState(readRecentPlaces)
  const selectPlace = useCallback((next: Place) => {
    setPlace(next)
    setRecent(persistPlace(next))
  }, [])
  return { place, recent, selectPlace }
}
