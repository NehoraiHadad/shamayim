import type { Place } from '../config/place'
import styles from './PlacePicker.module.css'

interface Props {
  title: string
  places: Place[]
  onSelect: (place: Place) => void
}

/** Recent places or search results, one 44 px row each. */
export function PlacePickerList({ title, places, onSelect }: Props) {
  if (!places.length) return null
  return (
    <div className={styles.list}>
      <h3>{title}</h3>
      {places.map((place) => (
        <button type="button" key={place.id} className={styles.row} onClick={() => onSelect(place)}>
          <span>{place.nameHe}</span>
          {place.regionHe && <small>{place.regionHe}</small>}
        </button>
      ))}
    </div>
  )
}
