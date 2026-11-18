import type { CSSProperties, ReactNode } from 'react'
import type { SceneTerrain } from '../../data/terrain/terrain'
import { RidgeLight } from './RidgeLight'
import { Shimmer } from './Shimmer'
import { SnowCap } from './SnowCap'
import type { SnowFall } from './snowLine'
import { SCENE_H, SCENE_W } from './sunPath'
import type { RidgeLighting } from './useRidgeLighting'
import styles from './ValleyScene.module.css'

interface Props {
  terrain: SceneTerrain
  lighting: RidgeLighting | null
  /** Heat shimmer amplitude (0: none) and the id its filter goes by. */
  heat: number
  shimmerId: string
  snow: SnowFall | null
  snowPlaceM: number | null
  mist: number
  mistColor: string
  city?: ReactNode
}

/** The far ridge (the Gilead): its sun light or plain fill, heat shimmer, snow cap, and the morning mist before it. */
export function FarLand({ terrain, lighting, heat, shimmerId, snow, snowPlaceM, mist, mistColor, city }: Props) {
  const shimmer = heat > 0 ? `url(#${shimmerId})` : undefined
  return (
    <svg className={`${styles.land} ${styles.landFar}`} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} preserveAspectRatio="none" aria-hidden="true">
      {heat > 0 && <Shimmer id={shimmerId} amplitude={heat} />}
      {lighting?.far ? <RidgeLight path={terrain.far} points={terrain.farPoints} ray={lighting.ray}
        noonWeight={lighting.noonWeight} rimX={lighting.far.rimAlpha ? lighting.rimX : null} depth={9}
        tone={lighting.far} baseClass={styles.far} shimmer={shimmer} />
        : <path d={terrain.far} className={styles.far} filter={shimmer} />}
      {snow && <SnowCap d={terrain.far} snow={snow} elevations={terrain.farElevations} placeM={snowPlaceM} />}
      {city}
      <foreignObject x="0" y="72" width={SCENE_W} height="33" className={styles.mistObject}>
        <div className={styles.mist} style={{ '--mist': mist.toFixed(3), '--mist-color': mistColor } as CSSProperties} />
      </foreignObject>
    </svg>
  )
}
