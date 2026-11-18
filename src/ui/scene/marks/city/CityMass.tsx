import { useMemo } from 'react'
import type { House } from '../../../../data/landmarks/settlement'
import styles from '../marks.module.css'
import { massPaths } from './massPath'

/**
 * One depth row of the city away from the dot as a merged mass (massPath.ts). Plain wall tone, no washes and no
 * cast shadows: the home blocks at the dot stay the most detailed and most coloured part of the frame.
 */
interface Props { houses: House[]; row: number; sunWest: boolean | null; night: boolean; litShare: number }

export function CityMass({ houses, row, sunWest, night, litShare }: Props) {
  const paths = useMemo(() => massPaths(houses, { sunWest, night, litShare, back: row === 0 }),
    [houses, row, sunWest, night, litShare])
  if (!houses.length) return null
  return <g className={`${styles.house} ${row === 0 ? styles.recede : ''}`}>
    <path className={styles.wall} d={paths.body} />
    {paths.faces && <path className={styles.side} d={paths.faces} />}
    <path className={styles.top} d={paths.roofs} />
    {paths.panes && <path className={styles.pane} d={paths.panes} />}
    {paths.lights && <path className={styles.win} d={paths.lights} />}
  </g>
}
