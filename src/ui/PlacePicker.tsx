import { useEffect, useRef, useState } from 'react'
import type { Place } from '../config/place'
import { reversePlace } from '../data/geocoding'
import styles from './PlacePicker.module.css'
import { PlacePickerList } from './PlacePickerList'
import { usePlaceSearch } from './PlacePickerSearch'

interface Props {
  open: boolean
  recent: Place[]
  onClose: () => void
  onSelect: (place: Place) => void
}

/**
 * A bottom sheet in a native modal <dialog>: the page behind is inert, Tab stays inside,
 * Escape closes it, and focus returns to whatever opened it.
 */
export function PlacePicker({ open, recent, onClose, onSelect }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const search = usePlaceSearch(open)
  const opener = useRef<HTMLElement | null>(null)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    const element = dialog.current
    if (!open || !element) return
    const active = document.activeElement
    // A focus already inside the dialog (StrictMode's second run) is not the opener.
    if (active instanceof HTMLElement && !element.contains(active)) opener.current = active
    element.showModal()
    input.current?.focus()
    return () => {
      element.close()
      setLocating(false)
      opener.current?.focus()
    }
  }, [open])

  const choose = (place: Place) => {
    onSelect(place)
    onClose()
  }
  const fail = (message: string) => {
    search.setError(message)
    setLocating(false)
  }
  const locate = () => {
    if (locating) return
    if (!navigator.geolocation) return fail('שירותי המיקום אינם זמינים במכשיר הזה')
    search.setError('')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => reversePlace(coords.latitude, coords.longitude).then(choose).catch(() => fail('לא הצלחנו לזהות את המיקום')),
      () => fail('לא הצלחנו לקבל הרשאה למיקום'),
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 },
    )
  }
  const note = search.pending ? 'מחפש…' : search.error

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="place-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      {open && (
        <div className={styles.panel}>
          <div className={styles.heading}>
            <h2 id="place-title">בחירת מקום</h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label="סגירה">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>
          <button type="button" className={styles.well} onClick={locate} aria-disabled={locating}>
            {locating ? 'מאתר מיקום…' : 'המיקום שלי'}
          </button>
          <label>
            <span className="visually-hidden">חיפוש מקום</span>
            <input
              ref={input}
              className={styles.input}
              type="search"
              value={search.query}
              onChange={(event) => search.setQuery(event.target.value)}
              placeholder="חיפוש יישוב"
              autoComplete="off"
            />
          </label>
          <div>
            <p className={styles.note} role="status">{note}</p>
            <PlacePickerList
              title={search.results.length ? 'תוצאות' : 'מקומות אחרונים'}
              places={search.results.length ? search.results : recent}
              onSelect={choose}
            />
          </div>
        </div>
      )}
    </dialog>
  )
}
