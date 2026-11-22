import { useEffect, useRef, useState } from 'react'
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

/** Debounced place search for the picker, reporting live-region notes keyed by request id. */
export function usePlaceSearch(
  open: boolean,
  onNote: (note: PickerNote, terminal: boolean, requestId: number) => void,
) {
  const nextId = useRef(0)
  const [request, setRequest] = useState({ query: '', id: 0 })
  const [results, setResults] = useState<Place[]>([])

  useEffect(() => () => {
    // Each opening starts fresh: recents, not the last search.
    setRequest({ query: '', id: 0 })
    setResults([])
  }, [open])

  useEffect(() => {
    const term = request.query.trim()
    if (!open || term.length < MIN_QUERY) return
    const { id } = request
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchPlaces(term, controller.signal)
        .then((places) => {
          if (controller.signal.aborted) return
          setResults(places)
          onNote(searchNote(places.length), true, id)
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted && !isAbort(cause)) {
            onNote({ text: searchErrorText(navigator.onLine), hidden: false }, true, id)
          }
        })
    }, DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, request, onNote])

  const setQuery = (value: string) => {
    const id = ++nextId.current
    setRequest({ query: value, id })
    setResults([])
    onNote(value.trim().length >= MIN_QUERY ? { text: SEARCHING, hidden: false } : EMPTY_NOTE, false, id)
  }

  return { query: request.query, setQuery, results }
}
