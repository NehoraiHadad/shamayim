import { useEffect, useState } from 'react'
import type { Place } from '../config/place'
import { searchPlaces } from '../data/geocoding'

const DEBOUNCE_MS = 550
const MIN_QUERY = 2

const isAbort = (cause: unknown) => cause instanceof DOMException && cause.name === 'AbortError'

/** Debounced place search for the picker. `pending` covers both the debounce and the request. */
export function usePlaceSearch(open: boolean) {
  const [query, setQueryValue] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => () => {
    // Each opening starts fresh: recents, not the last search.
    setQueryValue('')
    setResults([])
    setError('')
    setPending(false)
  }, [open])

  useEffect(() => {
    const term = query.trim()
    if (!open || term.length < MIN_QUERY) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchPlaces(term, controller.signal)
        .then((places) => {
          setResults(places)
          setError(places.length ? '' : 'לא נמצאו מקומות')
        })
        .catch((cause: unknown) => {
          if (!isAbort(cause)) setError('לא הצלחנו לחפש כרגע')
        })
        .finally(() => {
          if (!controller.signal.aborted) setPending(false)
        })
    }, DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, query])

  const setQuery = (value: string) => {
    setQueryValue(value)
    setResults([])
    setError('')
    setPending(value.trim().length >= MIN_QUERY)
  }

  return { query, setQuery, results, pending, error, setError }
}
