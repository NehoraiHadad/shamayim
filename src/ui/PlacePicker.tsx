import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { Place } from '../config/place'
import { reversePlace } from '../data/geocoding'
import {
  geolocationErrorText,
  LIVE_GAP_MS,
  LIVE_HOLD_MS,
  LOCATING,
  NO_GEOLOCATION,
  PICKER_LIVE_INITIAL,
  pickerLiveReducer,
  pickerVisible,
  REVERSE_FAILED,
  type PickerNote,
} from '../text/placePicker'
import { IconButton } from './IconButton'
import { CloseIcon } from './icons'
import styles from './PlacePicker.module.css'
import { PlacePickerList } from './PlacePickerList'
import { usePlaceSearch } from './PlacePickerSearch'
import { createRequestGuard } from './requestGuard'

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
  const [live, dispatch] = useReducer(pickerLiveReducer, PICKER_LIVE_INITIAL)
  const onSearchNote = useCallback((note: PickerNote, terminal: boolean, requestId: number) => {
    dispatch({ type: 'search', note, terminal, requestId })
  }, [])
  const search = usePlaceSearch(open, onSearchNote)
  const opener = useRef<HTMLElement | null>(null)
  const [locateGuard] = useState(createRequestGuard)
  const gpsRequestId = useRef(0)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (live.phase !== 'holding' && live.phase !== 'gap') return
    const timer = setTimeout(
      () => dispatch({ type: 'advance' }),
      live.phase === 'holding' ? LIVE_HOLD_MS : LIVE_GAP_MS,
    )
    return () => clearTimeout(timer)
  }, [live.phase, live.spoken])

  useEffect(() => {
    const element = dialog.current
    if (!open || !element) return
    const active = document.activeElement
    // A focus already inside the dialog (StrictMode's second run) is not the opener.
    if (active instanceof HTMLElement && !element.contains(active)) opener.current = active
    element.showModal()
    input.current?.focus()
    return () => {
      locateGuard.cancel()
      element.close()
      setLocating(false)
      dispatch({ type: 'reset' })
      opener.current?.focus()
    }
  }, [open, locateGuard])

  const choose = (place: Place) => {
    locateGuard.cancel()
    onSelect(place)
    onClose()
  }
  const fail = (message: string, requestId: number) => {
    dispatch({ type: 'gps', note: { text: message, hidden: false }, terminal: true, requestId })
    setLocating(false)
  }
  const locate = () => {
    if (locating) return
    const requestId = ++gpsRequestId.current
    if (!navigator.geolocation) return fail(NO_GEOLOCATION, requestId)
    setLocating(true)
    dispatch({ type: 'gps', note: { text: LOCATING, hidden: true }, terminal: false, requestId })
    const req = locateGuard.start()
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!req.isCurrent()) return
        reversePlace(coords.latitude, coords.longitude, req.signal)
          .then((place) => { if (req.isCurrent()) choose(place) })
          .catch(() => { if (req.isCurrent()) fail(REVERSE_FAILED, requestId) })
      },
      (err) => { if (req.isCurrent()) fail(geolocationErrorText(err.code), requestId) },
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 },
    )
  }
  const visible = pickerVisible(live)

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
            <IconButton label="סגירה" onClick={onClose}><CloseIcon /></IconButton>
          </div>
          <button type="button" className={styles.well} onClick={locate} aria-disabled={locating}>
            {locating ? LOCATING : 'המיקום שלי'}
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
            <p className={styles.note}>{visible}</p>
            <span className="visually-hidden" role="status">{live.spoken}</span>
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
