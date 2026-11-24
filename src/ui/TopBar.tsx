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

/** Place and data freshness. */
export function TopBar({ place, recent, onSelectPlace, status }: Props) {
  const [pickerOpen, setPickerOpen] = useState(pickerOpenOnLoad)
  return (
    <header className={styles.bar}>
      <h1 className="visually-hidden">מזג האוויר ב{place.nameHe}</h1>
      <div className={styles.location}>
        {/* One line: the place, its region muted beside it, and the chevron. The whole line opens the picker. */}
        <button
          type="button"
          className={styles.place}
          onClick={() => setPickerOpen(true)}
          aria-haspopup="dialog"
          aria-label={`${place.nameHe}${place.regionHe ? `, ${place.regionHe}` : ''}. החלפת מקום`}
        >
          <span className={styles.name}>{place.nameHe}</span>
          {place.regionHe && <span className={styles.region}>{place.regionHe}</span>}
          <svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2.5 4.5L6 8l3.5-3.5" />
          </svg>
        </button>
      </div>
      {status}
      <PlacePicker open={pickerOpen} recent={recent} onClose={() => setPickerOpen(false)} onSelect={onSelectPlace} />
    </header>
  )
}
