import { useEffect, useState } from 'react'
import type { Place } from '../config/place'
import { searchPlaces } from '../data/geocoding'
import {
  EMPTY_NOTE,
  SEARCHING,
  searchErrorText,
  searchNote,
  type PickerNote,
} from '../text/placePicker'

const DEBOUNCE_MS = 550
const MIN_QUERY = 2

const isAbort = (cause: unknown) => cause instanceof DOMException && cause.name === 'AbortError'

/** Debounced place search for the picker, reporting its own live-region notes independently of GPS. */
export function usePlaceSearch(open: boolean, onNote: (note: PickerNote) => void) {
  const [query, setQueryValue] = useState('')
  const [results, setResults] = useState<Place[]>([])

  useEffect(() => () => {
    // Each opening starts fresh: recents, not the last search.
    setQueryValue('')
    setResults([])
  }, [open])

  useEffect(() => {
    const term = query.trim()
    if (!open || term.length < MIN_QUERY) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchPlaces(term, controller.signal)
        .then((places) => {
          if (controller.signal.aborted) return
          setResults(places)
          onNote(searchNote(places.length))
        })
        .catch((cause: unknown) => {
          if (!isAbort(cause)) onNote({ text: searchErrorText(navigator.onLine), hidden: false })
        })
    }, DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, query, onNote])

  const setQuery = (value: string) => {
    setQueryValue(value)
    setResults([])
    onNote(value.trim().length >= MIN_QUERY ? { text: SEARCHING, hidden: false } : EMPTY_NOTE)
  }

  return { query, setQuery, results }
}
