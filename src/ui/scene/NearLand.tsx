import type { ReactNode } from 'react'
import type { SceneTerrain } from '../../data/terrain/terrain'
import { FloorShadow } from './FloorShadow'
import { RidgeLight } from './RidgeLight'
import { seaSpan } from './seaLine'
import { SnowCap } from './SnowCap'
import type { SnowFall } from './snowLine'
import { SCENE_H, SCENE_W } from './sunPath'
import type { RidgeLighting } from './useRidgeLighting'
import styles from './ValleyScene.module.css'

interface Props {
  terrain: SceneTerrain
  /** The sea-level datum: a dashed line where sea level meets the slopes (the place is below sea level). */
  datum: boolean
  /** The water on the near plane (`Water`). */
  water?: ReactNode
  snow: SnowFall | null
  snowPlaceM: number | null
  lighting: RidgeLighting | null
  ridgeLit: RidgeLighting | null
}

export function NearLand({ terrain, datum, water, snow, snowPlaceM, lighting, ridgeLit }: Props) {
  return (
    <svg className={`${styles.land} ${styles.landNear}`} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} preserveAspectRatio="none" aria-hidden="true">
      {datum && (
        <line {...seaSpan(terrain.nearPoints, terrain.seaY)} y1={terrain.seaY} y2={terrain.seaY} className={styles.sea} vectorEffect="non-scaling-stroke" />
      )}
      <path d={terrain.near} className={styles.near} />
      {/* Snow under the light and the floor shadow, so a cap takes the same sun and shade as the land. */}
      {snow && <SnowCap d={terrain.near} snow={snow} elevations={terrain.nearElevations} placeM={snowPlaceM}
        edge={terrain.snowEdge?.('near', snow.lineM)} />}
      {lighting && <FloorShadow path={terrain.near} points={terrain.nearPoints} ray={lighting.ray} day={lighting.day} />}
      {ridgeLit?.near && <RidgeLight path={terrain.near} points={terrain.nearPoints} ray={ridgeLit.ray} rayAt={ridgeLit.rayAt}
        noonWeight={ridgeLit.noonWeight} rimX={ridgeLit.near.rimAlpha ? ridgeLit.rimX : null} depth={16} tone={ridgeLit.near} />}
      {water}
    </svg>
  )
}
