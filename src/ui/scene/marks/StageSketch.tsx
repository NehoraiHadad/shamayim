import type { Settlement } from '../../../data/landmarks/settlement'
import styles from './marks.module.css'

/**
 * The stage's houses while the view turns: each as its wall and roof in two flat paths for the whole place (a few
 * nodes instead of a dozen a house), in the houses' own tones. The full drawing (light, shadows, windows) comes back
 * as soon as the turn settles.
 */
export function StageSketch({ settlement, width, night }: { settlement: Settlement | null; width: number; night: boolean }) {
  if (!settlement?.houses.length) return null
  let walls = '', roofs = ''
  for (const { x, w, h, baseY } of settlement.houses) {
    const roof = Math.min(h * .3, 2.2)
    walls += `M${(x - w / 2).toFixed(1)} ${baseY.toFixed(1)}h${w.toFixed(1)}v${(-(h - roof)).toFixed(1)}h${(-w).toFixed(1)}Z`
    roofs += `M${(x - w / 2 - .3).toFixed(1)} ${(baseY - h + roof).toFixed(1)}h${(w + .6).toFixed(1)}l${(-w * .15).toFixed(1)} ${(-roof).toFixed(1)}h${(-w * .7).toFixed(1)}Z`
  }
  return (
    <svg className={styles.px} viewBox={`0 0 ${width} 128`} aria-hidden="true">
      <path d={walls} className={styles.wall} opacity={night ? .7 : 1} />
      <path d={roofs} className={settlement.style === 'tile' ? styles.roof : styles.top} />
    </svg>
  )
}
