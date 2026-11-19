import styles from '../marks.module.css'
import type { BuildingProps } from '../generic/buildingSpecs'

/** Haifa's hand-drawn icon in px (x 0 centre, y 0 ground). */

/**
 * Shrine of the Báb: granite arcade, octagon, drum with tall windows, golden fish-scale dome with a lantern
 * (Wikipedia, Bahá'í World News Service). Below it the garden terraces step down the Carmel face (19 in reality;
 * three drawn). Floodlit at night: the dome stays gold and the arcade glows.
 */
export function BabShrine({ h, night }: BuildingProps) {
  const dome = -h + 1.5
  return <>
    {/* The terraces step down the slope as one stair of gardens, with a light stair line down the middle. */}
    <path className={styles.green} d="M-3 1.5h6l1.5 2.5h-9zM-4.5 4h9l1.5 2.5h-12zM-6 6.5h12l1.5 2.5h-15z" />
    <rect className={styles.lit} x={-.25} y={1.5} width={.5} height={7.5} />
    <rect className={night ? styles.lit : styles.wall} x={-6} y={-4} width={12} height={4} />
    {[-4.5, -1.75, 1, 3.75].map((x) => <rect key={x} className={night ? styles.win : styles.shade} x={x - .25} y={-3}
      width={1.5} height={3} rx={.75} />)}
    {[-6, 5].map((x) => <rect key={x} className={styles.wall} x={x} y={-5.5} width={1} height={1.5} />)}
    <rect className={styles.wall} x={-3.5} y={-7} width={7} height={3} />
    <rect className={styles.wall} x={-2.5} y={-9.5} width={5} height={2.5} />
    {[-1.75, .25].map((x) => <rect key={x} className={night ? styles.win : styles.shade} x={x} y={-9.1} width={1.5} height={1.8} />)}
    <path className={styles.gold} d={`M-2.8 -9.5Q-3 ${dome + 1.3} 0 ${dome}Q3 ${dome + 1.3} 2.8 -9.5z`} />
    <rect className={styles.gold} x={-.5} y={-h} width={1} height={1.8} />
  </>
}
