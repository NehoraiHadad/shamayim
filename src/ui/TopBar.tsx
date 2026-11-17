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
      <div className={styles.location}>
        <button type="button" className={styles.place} onClick={() => setPickerOpen(true)} aria-haspopup="dialog">
          {place.nameHe}
        </button>
        <p className={styles.region}>{place.regionHe}</p>
      </div>
      {status}
      <PlacePicker open={pickerOpen} recent={recent} onClose={() => setPickerOpen(false)} onSelect={onSelectPlace} />
    </header>
  )
}
