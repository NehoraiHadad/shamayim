import styles from '../marks.module.css'
import type { BuildingProps } from '../generic/buildingSpecs'
import { Windows } from '../generic/parts'

/** Tel Aviv's hand-drawn icon in px (x 0 centre, y 0 ground). Heights come from curated.ts; massing from photos. */

/**
 * Azrieli Center (reference: Wikipedia, photos from the Ayalon): round (187 m), triangular (169 m) and square (154 m)
 * glass towers on a shared podium; the mid-height mechanical floor shows as a band. West→east order is unverified.
 * Self-lit with the sun on the left: the drum turns through lit / body / shade bands so it reads round, and its
 * crown steps in at the shoulders.
 */
/** The round tower's shading bands, sun side first: [x, width, tone, opacity]. */
const DRUM: [number, number, 'lit' | 'shade', number][] = [
  [-8, .9, 'lit', 1], [-7.1, 1, 'lit', .5], [-4.9, .8, 'shade', .3], [-4.1, .7, 'shade', .6], [-3.4, .9, 'shade', 1]]

export function AzrieliCenter({ h, night, seed = 1, litShare = 1 }: BuildingProps) {
  const [round, tri, square] = [h, h * .9, h * .82 - 1]
  const shoulder = -round + .9
  return <>
    {/* The mall podium the three towers stand on; it seats them as one complex, not three poles. */}
    <rect className={styles.wall} x={-9.5} y={-3} width={19} height={3} />
    <rect className={styles.lit} x={-9.5} y={-3} width={1.5} height={3} />
    {/* Round: a glass drum turned in steps from the light, so it reads as a cylinder, not a slab: lit edge, a softer
        band, the glass body, then the turn into the core shadow on the far side. */}
    <rect className={styles.glass} x={-8} y={shoulder} width={5.5} height={-shoulder} />
    {DRUM.map(([x, w, tone, alpha]) => <rect key={x} className={styles[tone]} x={x} y={shoulder} width={w}
      height={-shoulder} opacity={alpha} />)}
    {/* Circular crown (observation floor, photos from the Ayalon): stepped shoulders suggest the curve at 1x, a lit
        rim arcs over the sun side and the far shoulder turns into the core shadow. */}
    <path className={styles.glass} d={`M-8 ${shoulder}v-.9h.7v-.7h.8v-.5h2.5v.5h.8v.7h.7v.9z`} />
    <path className={styles.lit} d={`M-8 ${shoulder}v-.9h.7v-.7h.8v-.5h1.6v.6h-1.1v.6h-.5v.9z`} />
    <path className={styles.shade} d={`M-2.5 ${shoulder}v-.9h-.7v-.7h-.8v.6h.5v1z`} />
    {/* Triangle: two glass faces meet at a sharp vertical edge, one turned from the light. */}
    <rect className={styles.glass} x={-2} y={-tri} width={2.6} height={tri} />
    <rect className={styles.lit} x={-2} y={-tri} width={.8} height={tri} />
    <rect className={styles.shade} x={.6} y={-tri} width={2.6} height={tri} />
    {/* Square: one flat face, flat roof, a narrow side face in shade. */}
    <rect className={styles.glass} x={3.6} y={-square} width={4.6} height={square} />
    <rect className={styles.shade} x={7.4} y={-square} width={.8} height={square} />
    {[-8, 3.6].map((x) => <rect key={x} className={styles.shade} x={x} y={-square * .5} width={x < 0 ? 5.5 : 4.6}
      height={.5} opacity={.4} />)}
    {night && <>
      <Windows x={-6.5} top={-round + 3} bottom={-2} cols={2} seed={seed} share={litShare} max={6} />
      <Windows x={-1.5} top={-tri + 2} bottom={-2} cols={2} stepX={2.4} seed={seed + 1} share={litShare} max={5} />
      <Windows x={4.2} top={-square + 2} bottom={-2} cols={2} seed={seed + 2} share={litShare} max={5} />
    </>}
  </>
}
