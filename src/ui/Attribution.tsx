import styles from './Attribution.module.css'

const OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright'

export function Attribution({ withAir, withOsm = false, withLandmarks = false, landDate = null }: { withAir: boolean; withOsm?: boolean; withLandmarks?: boolean
  /** The Sentinel-2 scene's date when the land is drawn in its real colours. */
  landDate?: string | null }) {
  return (
    <footer className={styles.attribution}>
      <ul className={styles.sources}>
        <li>
          נתונים: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
          {', '}DWD ICON, ECMWF{withAir ? ', CAMS' : ''}
        </li>
        <li>תצפיות לכיול: <a href="https://ims.gov.il/" target="_blank" rel="noreferrer">השירות המטאורולוגי</a></li>
        <li>גבהי השטח: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer">Terrain Tiles</a> (SRTM ועוד)</li>
        {landDate && (
          <li>
            כיסוי הקרקע: <a href="https://esa-worldcover.org/" target="_blank" rel="noreferrer">© ESA WorldCover 2021 (CC BY 4.0)</a>
            {'; '}צבעי הקרקע: Copernicus Sentinel-2, {landDate}
          </li>
        )}
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
