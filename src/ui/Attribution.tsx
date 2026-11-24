import styles from './Attribution.module.css'
import { SceneFacts } from './SceneFacts'

const OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright'
const ODBL = 'https://opendatacommons.org/licenses/odbl/1-0/'

export function Attribution({ facts, withAir, withOsm = false, withLandmarks = false, withFootprints = false, landDate = null }: {
  /** The line about the scene (`text/sceneFacts`). */
  facts: string | null
  withAir: boolean; withOsm?: boolean; withLandmarks?: boolean
  /** The scene draws a village's real building footprints. */
  withFootprints?: boolean
  /** The Sentinel-2 scene's date when the land is drawn in its real colours. */
  landDate?: string | null }) {
  return (
    <footer className={styles.attribution}>
      <SceneFacts text={facts} />
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
        {withFootprints && (
          <li>
            מבני היישוב: <a href={OSM_COPYRIGHT} target="_blank" rel="noreferrer">© תורמי OpenStreetMap</a>
            {', '}<a href="https://docs.overturemaps.org/attribution/" target="_blank" rel="noreferrer">Overture Maps Foundation</a>
            {', '}Global ML Building Footprints, ברישיון Microsoft (<a href={ODBL} target="_blank" rel="noreferrer">ODbL</a>)
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
