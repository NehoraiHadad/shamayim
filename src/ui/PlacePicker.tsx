import { useEffect, useRef, useState } from 'react'
import type { Place } from '../config/place'
import { reversePlace, searchPlaces } from '../data/geocoding'
import styles from './PlacePicker.module.css'

interface Props {
  open: boolean
  recent: Place[]
  onClose: () => void
  onSelect: (place: Place) => void
}

export function PlacePicker({ open, recent, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    input.current?.focus()
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open, onClose])

  useEffect(() => () => {
    // Each opening starts fresh: recents, not the last search.
    setQuery('')
    setResults([])
    setError('')
  }, [open])

  useEffect(() => {
    if (!open || query.trim().length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchPlaces(query.trim(), controller.signal)
        .then((places) => {
          setResults(places)
          setError(places.length ? '' : 'לא נמצאו מקומות')
        })
        .catch((cause: unknown) => {
          if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError('לא הצלחנו לחפש כרגע')
        })
    }, 550)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, query])

  if (!open) return null
  const choose = (place: Place) => {
    onSelect(place)
    onClose()
  }
  const locate = () => {
    if (!navigator.geolocation) {
      setError('שירותי המיקום אינם זמינים במכשיר הזה')
      return
    }
    setError('')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => reversePlace(coords.latitude, coords.longitude).then(choose).catch(() => {
        setError('לא הצלחנו לזהות את המיקום')
        setLocating(false)
      }),
      () => {
        setError('לא הצלחנו לקבל הרשאה למיקום')
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 },
    )
  }

  return (
    <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="place-title">
        <div className={styles.heading}>
          <h2 id="place-title">בחירת מקום</h2>
          <button type="button" onClick={onClose} aria-label="סגירה">×</button>
        </div>
        <button type="button" className={styles.locate} onClick={locate} disabled={locating}>
          {locating ? 'מאתרת…' : 'המיקום שלי'}
        </button>
        <label className={styles.search}>
          <span className="visually-hidden">חיפוש מקום</span>
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setResults([])
              setError('')
            }}
            placeholder="חיפוש יישוב"
            autoComplete="off"
          />
        </label>
        {error && <p className={styles.error} role="status">{error}</p>}
        <PlaceList title={results.length ? 'תוצאות' : 'מקומות אחרונים'} places={results.length ? results : recent} onSelect={choose} />
      </section>
    </div>
  )
}

function PlaceList({ title, places, onSelect }: { title: string; places: Place[]; onSelect: (place: Place) => void }) {
  if (!places.length) return null
  return (
    <div className={styles.list}>
      <h3>{title}</h3>
      {places.map((place) => (
        <button type="button" key={place.id} onClick={() => onSelect(place)}>
          <span>{place.nameHe}</span>
          {place.regionHe && <small>{place.regionHe}</small>}
        </button>
      ))}
    </div>
  )
}
