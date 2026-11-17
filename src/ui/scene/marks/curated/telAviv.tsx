import styles from '../marks.module.css'
import type { BuildingProps } from '../generic/buildingSpecs'
import { taper } from '../generic/geometry'
import { Windows } from '../generic/parts'

/** Tel Aviv's curated towers in px (x 0 centre, y 0 ground). Heights come from curated.ts; massing from photos. */

/** Shalom Meir Tower (1965, 142 m): a plain banded slab with a set-back roof storey; the city's first skyscraper. */
export function ShalomMeir({ h, night, seed = 1, litShare = 1 }: BuildingProps) {
  const slab = h - 1.5
  return <>
    <rect className={styles.wall} x={-4} y={-slab} width={8} height={slab} />
    <rect className={styles.wall} x={-3} y={-h} width={6} height={1.5} />
    {[.3, .55, .8].map((t) => <rect key={t} className={styles.shade} x={-4} y={-slab * t} width={8} height={.5} opacity={.45} />)}
    {night && <Windows x={-3.25} top={-slab + 1.5} bottom={-2} cols={3} seed={seed} share={litShare} max={9} />}
  </>
}

/**
 * Reading power station: the turbine hall and its single tall chimney (retired 2024, chimney kept by plan).
 * Height and any banding are unverified; at 2.7 km behind the crest it draws in the back tone anyway.
 */
export function ReadingChimney({ h }: BuildingProps) {
  return <>
    <rect className={styles.wall} x={-6} y={-5} width={9} height={5} />
    <path className={styles.roof} d="M-6 -5h9l-1 -1.5h-7z" />
    <path className={styles.solid} d={taper(4, 3, 2, h - 1, 0)} />
    <rect className={styles.solid} x={2.7} y={-h} width={2.6} height={1} />
  </>
}

/**
 * Azrieli Sarona (2017, 238 m): a core wrapped by two vertical blocks whose offset floor plates curve on different
 * axes, so the tower reads twisted (skyrisecities.com 2016, Wikipedia). The S-edges below are a simplification.
 */
export function Sarona({ h, night, seed = 1, litShare = 1 }: BuildingProps) {
  return <>
    <path className={styles.glass} d={`M-4.5 0C-5 ${-.4 * h} -3.6 ${-.75 * h} -4 ${-h}H1V0z`} />
    <path className={styles.glass} d={`M.5 0H4.5C5.4 ${-.35 * h} 5.2 ${-.7 * h} 3.6 ${-h + 1.5}H.5z`} />
    {/* The seam where the two curved blocks meet the core. */}
    <rect className={styles.shade} x={.5} y={-h + 1.5} width={.6} height={h - 1.5} />
    <rect className={styles.solid} x={-2} y={-h - 1} width={2} height={1.2} />
    {night && <Windows x={-3} top={-h + 2.5} bottom={-2} cols={3} seed={seed} share={litShare} max={9} />}
  </>
}

/**
 * Azrieli Center (reference: Wikipedia, photos from the Ayalon): round (187 m), triangular (169 m) and square (154 m)
 * glass towers on a shared podium; the mid-height mechanical floor shows as a band. West→east order is unverified.
 */
export function AzrieliCenter({ h, night, seed = 1, litShare = 1 }: BuildingProps) {
  const [round, tri, square] = [h, h * .9, h * .82]
  return <>
    {/* The mall podium the three towers stand on; it seats them as one complex, not three poles. */}
    <rect className={styles.wall} x={-9.5} y={-3} width={19} height={3} />
    {/* Round: a glass drum with a flat top and the set-back observation / helipad crown. */}
    <rect className={styles.glass} x={-8} y={-round} width={5.5} height={round} />
    <rect className={styles.solid} x={-7.2} y={-round - 1.2} width={3.9} height={1.2} />
    {/* Triangle: two glass faces meet at a sharp vertical edge, one turned from the light. */}
    <rect className={styles.glass} x={-2} y={-tri} width={2.6} height={tri} />
    <rect className={styles.shade} x={.6} y={-tri} width={2.6} height={tri} />
    {/* Square: one flat face, flat roof. */}
    <rect className={styles.glass} x={3.6} y={-square} width={4.6} height={square} />
    {[-8, 3.6].map((x) => <rect key={x} className={styles.shade} x={x} y={-square * .5} width={x < 0 ? 5.5 : 4.6}
      height={.5} opacity={.4} />)}
    {night && <>
      <Windows x={-6.5} top={-round + 3} bottom={-2} cols={2} seed={seed} share={litShare} max={6} />
      <Windows x={-1.5} top={-tri + 2} bottom={-2} cols={2} stepX={2.4} seed={seed + 1} share={litShare} max={5} />
      <Windows x={4.2} top={-square + 2} bottom={-2} cols={2} seed={seed + 2} share={litShare} max={5} />
    </>}
  </>
}
