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

/**
 * Dagon grain silo (1955) at the port, 65 m (data; one source says 70): a row of tall cylindrical concrete bins and
 * the taller elevator head house with its roof box (photos from the port road). Which end carries the head house is
 * unverified; drawn at the east end. Self-lit: each bin turns lit / body / shade so the row reads as cylinders.
 */
export function DagonSilo({ h, night, seed = 1, litShare = 1 }: BuildingProps) {
  const bins = h * .7
  return <>
    {[-8, -5.6, -3.2, -.8].map((x) => <g key={x}>
      <path className={styles.wall} d={`M${x} 0V${-bins}a1.2 .9 0 0 1 2.4 0V0z`} />
      <rect className={styles.lit} x={x} y={-bins} width={.7} height={bins} />
      <rect className={styles.shade} x={x + 1.8} y={-bins} width={.6} height={bins} />
      <path className={styles.lit} d={`M${x} ${-bins}a1.2 .9 0 0 1 1.2 -.9v.9z`} />
    </g>)}
    {/* Head house: a tall plain block, a darker roof box, a vertical strip of stair windows. */}
    <rect className={styles.wall} x={1.6} y={-h + 1.5} width={6.4} height={h - 1.5} />
    <rect className={styles.lit} x={1.6} y={-h + 1.5} width={1.2} height={h - 1.5} />
    <rect className={styles.shade} x={7} y={-h + 1.5} width={1} height={h - 1.5} />
    <rect className={styles.solid} x={3} y={-h} width={3.4} height={1.5} />
    {!night && [4, 7, 10].map((y) => <rect key={y} className={styles.shade} x={4.2} y={-h + y} width={1} height={1.4}
      opacity={.6} />)}
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
