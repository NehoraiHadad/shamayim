import { useMemo } from 'react'
import type { SkylineData } from '../../../../data/city/skylineData'
import type { SkylineTower } from '../../../../data/city/skylineTowers'
import styles from '../marks.module.css'
import { skylineLights } from './skylineLights'
import { skylineColumns, skylinePaths } from './skylinePaths'

interface Props {
  data: SkylineData
  slabs: readonly SkylineTower[]
  centerX: number
  homeHalf: number
  litShare: number
  night: boolean
  seed: number
  visibilityKm?: number
}

export function Skyline({ data, slabs, centerX, homeHalf, litShare, night, seed, visibilityKm }: Props) {
  const columns = useMemo(() => skylineColumns(data.columns, centerX, homeHalf), [data, centerX, homeHalf])
  const paths = useMemo(() => skylinePaths(columns, slabs, visibilityKm), [columns, slabs, visibilityKm])
  const lights = useMemo(() => night ? skylineLights(columns, litShare, seed, visibilityKm) : [],
    [columns, litShare, night, seed, visibilityKm])
  return <>
    {paths.map(({ band, d, opacity }) => d && <path key={band} d={d} opacity={opacity}
      className={`${styles.house} ${styles.wall} ${band === 2 ? styles.recede : ''}`} />)}
    {lights.map(({ d, opacity }, i) => <path key={i} d={d} opacity={opacity} className={styles.win} />)}
  </>
}
