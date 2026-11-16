import type { Place } from '../config/place'
import styles from './TopBar.module.css'

interface Props {
  place: Place
  elevation: number | null
  status: React.ReactNode
}

export function TopBar({ place, elevation, status }: Props) {
  const below = elevation !== null && elevation < 0
  return (
    <header className={styles.bar}>
      <div>
        <h1 className={styles.place}>{place.nameHe}</h1>
        <p className={styles.region}>
          {place.regionHe}
          {below && (
            <span className={styles.chip}>
              <bdi>{Math.abs(Math.round(elevation))}</bdi> מ׳ מתחת לפני הים
            </span>
          )}
        </p>
      </div>
      <div className={styles.status}>{status}</div>
    </header>
  )
}
