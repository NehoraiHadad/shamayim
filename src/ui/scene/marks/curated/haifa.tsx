import styles from '../marks.module.css'
import type { BuildingProps } from '../generic/buildingSpecs'
import { Windows } from '../generic/parts'

/** Haifa's curated marks in px (x 0 centre, y 0 ground). The Bazan cooling tower reuses the generic `Cooling`. */

/**
 * Shrine of the Báb: granite arcade, octagon, drum with tall windows, golden fish-scale dome with a lantern
 * (Wikipedia, Bahá'í World News Service). Below it the garden terraces step down the Carmel face (19 in reality;
 * three drawn). Floodlit at night: the dome stays gold and the arcade glows.
 */
export function BabShrine({ h, night }: BuildingProps) {
  const dome = -h + 1.5
  return <>
    {[[1.5, 9], [4, 12], [6.5, 15]].map(([y, w]) => <rect key={y} className={styles.green} x={-w / 2} y={y} width={w} height={1.5} />)}
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

/**
 * Dagon grain silo (1955) at the port, 65 m (data; one source says 70): a long block of concrete bins with a taller
 * elevator house. Which end carries the tall house is unverified; drawn at the east end.
 */
export function DagonSilo({ h, night, seed = 1, litShare = 1 }: BuildingProps) {
  const bins = h * .72
  return <>
    <rect className={styles.wall} x={-8} y={-bins} width={11} height={bins} />
    {[-6, -3.5, -1, 1.5].map((x) => <rect key={x} className={styles.shade} x={x} y={-bins + 1} width={.6}
      height={bins - 2} opacity={.5} />)}
    <rect className={styles.wall} x={2.5} y={-h + 1.5} width={5.5} height={h - 1.5} />
    <rect className={styles.wall} x={3.5} y={-h} width={3} height={1.5} />
    {night && <Windows x={3.5} top={-h + 4} bottom={-3} cols={2} seed={seed} share={litShare} max={4} />}
  </>
}

/**
 * Sail Tower (Migdal HaMifras, 2002, 137 m): one straight edge and one curved, like a sail, rising to a narrow top.
 * Which edge faces west is unverified.
 */
export function SailTower({ h, night, seed = 1, litShare = 1 }: BuildingProps) {
  return <>
    <path className={styles.glass} d={`M-4 0V${-h}h1.6C1 ${-.72 * h} 4.5 ${-.42 * h} 4.5 0z`} />
    <rect className={styles.solid} x={-4} y={-h + 1} width={1.6} height={h - 1} />
    {night && <Windows x={-1.5} top={-h * .7} bottom={-2} cols={2} seed={seed} share={litShare} max={6} />}
  </>
}
