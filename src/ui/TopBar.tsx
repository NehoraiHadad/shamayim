import type { Place } from '../config/place'
import styles from './TopBar.module.css'

interface Props {
  place: Place
  status: React.ReactNode
}

/** Place and data freshness. The depth below sea level is told by the valley scene. */
export function TopBar({ place, status }: Props) {
  return (
    <header className={styles.bar}>
      <div>
        <h1 className={styles.place}>{place.nameHe}</h1>
        <p className={styles.region}>{place.regionHe}</p>
      </div>
      {status}
    </header>
  )
}
