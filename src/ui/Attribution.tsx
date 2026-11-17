import styles from './Attribution.module.css'

const OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright'

export function Attribution({ withAir, withOsm = false, withLandmarks = false }: { withAir: boolean; withOsm?: boolean; withLandmarks?: boolean }) {
  return (
    <footer className={styles.attribution}>
      <ul className={styles.sources}>
        <li>
          נתונים: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
          {', '}DWD ICON, ECMWF{withAir ? ', CAMS' : ''}
        </li>
        {withOsm && <li>מיקום: <a href={OSM_COPYRIGHT} target="_blank" rel="noreferrer">OpenStreetMap</a></li>}
        {withLandmarks && (
          <li>נתוני ציוני דרך: <a href={OSM_COPYRIGHT} target="_blank" rel="noreferrer">© תורמי OpenStreetMap (ODbL)</a></li>
        )}
      </ul>
      <p className={styles.note}>
        התחזית משלבת שני מודלים אירופיים. כשהם לא מסכימים, היום מסומן ״עשוי להשתנות״. מהיום השישי והלאה זו הערכה כללית בלבד.
      </p>
    </footer>
  )
}
