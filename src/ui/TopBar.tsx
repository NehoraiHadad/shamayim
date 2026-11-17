import { useState } from 'react'
import type { Place } from '../config/place'
import { pickerOpenOnLoad } from './devParams'
import { PlacePicker } from './PlacePicker'
import styles from './TopBar.module.css'

interface Props {
  place: Place
  recent: Place[]
  onSelectPlace: (place: Place) => void
  status: React.ReactNode
}

/** Place and data freshness. The depth below sea level is told by the valley scene. */
export function TopBar({ place, recent, onSelectPlace, status }: Props) {
  const [pickerOpen, setPickerOpen] = useState(pickerOpenOnLoad)
  return (
    <header className={styles.bar}>
      <h1 className="visually-hidden">מזג האוויר ב{place.nameHe}</h1>
      <div className={styles.location}>
        <button
          type="button"
          className={styles.place}
          onClick={() => setPickerOpen(true)}
          aria-haspopup="dialog"
          aria-label={`${place.nameHe}, החלפת מקום`}
        >
          {place.nameHe}
          <svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2.5 4.5L6 8l3.5-3.5" />
          </svg>
        </button>
        <p className={styles.region}>{place.regionHe}</p>
      </div>
      {status}
      <PlacePicker open={pickerOpen} recent={recent} onClose={() => setPickerOpen(false)} onSelect={onSelectPlace} />
    </header>
  )
}
