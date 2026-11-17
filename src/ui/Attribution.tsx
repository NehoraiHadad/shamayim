import styles from './Attribution.module.css'

export function Attribution({ withAir, withOsm = false }: { withAir: boolean; withOsm?: boolean }) {
  return (
    <footer className={styles.attribution}>
      נתונים:{' '}
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
      {', '}DWD ICON, ECMWF{withAir ? ', CAMS' : ''}
      {withOsm && <>{' · '}מיקום: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a></>}
      <br />
      התחזית משלבת שני מודלים אירופיים. כשהם לא מסכימים, היום מסומן ״עשוי להשתנות״. מהיום השישי והלאה זו הערכה כללית בלבד.
    </footer>
  )
}
