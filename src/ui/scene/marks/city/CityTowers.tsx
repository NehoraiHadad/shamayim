import type { PlacedTower } from '../../../../data/city/cityTowers'
import { Highrise } from '../generic/industry'
import styles from '../marks.module.css'

interface Props {
  towers: readonly PlacedTower[]
  night: boolean
  litShare: number
  backRow?: number
}

export function CityTowers({ towers, night, litShare, backRow = 0 }: Props) {
  return towers.map(({ x, baseY, w, h, row, seed }) => (
    <g key={seed} className={row === backRow ? `${styles.house} ${styles.recede}` : undefined}
      transform={`translate(${x} ${baseY}) scale(${w / 7} 1)`}>
      <Highrise h={h} night={night} seed={seed} litShare={litShare} />
    </g>
  ))
}
