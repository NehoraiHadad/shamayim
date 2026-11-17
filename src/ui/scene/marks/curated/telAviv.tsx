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
 * axes, so the tower reads twisted (skyrisecities.com 2016, Wikipedia). Self-lit: the west block takes the light, the
 * east block turns away from it, and the S-shaped seam between them carries the twist.
 */
export function Sarona({ h, night, seed = 1, litShare = 1 }: BuildingProps) {
  const [a, b, top] = [-.35 * h, -.65 * h, -h + 1.5]
  const seam = (dx: number) => `${.8 + dx} 0C${2.2 + dx} ${a} ${-.6 + dx} ${b} ${.8 + dx} ${top}`
  const back = (dx: number) => `C${-.6 + dx} ${b} ${2.2 + dx} ${a} ${.8 + dx} 0`
  return <>
    <path className={styles.glass} d={`M-4.5 0C-5 ${-.4 * h} -3.6 ${-.75 * h} -4 ${-h}H1.4V${top}${back(.6)}z`} />
    <path className={styles.lit} d={`M-4.5 0C-5 ${-.4 * h} -3.6 ${-.75 * h} -4 ${-h}h1.5C-2.2 ${-.75 * h} -3.5 ${-.4 * h} -3 0z`} />
    <path className={styles.glass} d={`M${seam(0)}H3.6C5.2 ${-.7 * h} 5.4 ${-.35 * h} 4.5 0z`} />
    <path className={styles.shade} opacity={.45} d={`M${seam(0)}H3.6C5.2 ${-.7 * h} 5.4 ${-.35 * h} 4.5 0z`} />
    <path className={styles.shade} opacity={.6} d={`M3.5 0h1C5.4 ${-.35 * h} 5.2 ${-.7 * h} 3.6 ${top}h-.9C4.3 ${-.7 * h} 4.4 ${-.35 * h} 3.5 0z`} />
    {/* The seam: a 0.6 px S where the two curved blocks meet the core. */}
    <path className={styles.shade} d={`M${seam(0)}h.6${back(.6)}z`} />
    <rect className={styles.solid} x={-2} y={-h - 1} width={2} height={1.2} />
    {night && <Windows x={-3} top={-h + 2.5} bottom={-2} cols={3} seed={seed} share={litShare} max={9} />}
  </>
}

/**
 * Azrieli Center (reference: Wikipedia, photos from the Ayalon): round (187 m), triangular (169 m) and square (154 m)
 * glass towers on a shared podium; the mid-height mechanical floor shows as a band. West→east order is unverified.
 * Self-lit with the sun on the left: the drum turns through lit / body / shade bands so it reads round.
 */
export function AzrieliCenter({ h, night, seed = 1, litShare = 1 }: BuildingProps) {
  const [round, tri, square] = [h, h * .9, h * .82 - 1]
  return <>
    {/* The mall podium the three towers stand on; it seats them as one complex, not three poles. */}
    <rect className={styles.wall} x={-9.5} y={-3} width={19} height={3} />
    <rect className={styles.lit} x={-9.5} y={-3} width={1.5} height={3} />
    {/* Round: a glass drum, 1.5 px lit band toward the sun, 1 px core shadow on the far side. */}
    <rect className={styles.glass} x={-8} y={-round} width={5.5} height={round} />
    <rect className={styles.lit} x={-8} y={-round} width={1.5} height={round} />
    <rect className={styles.shade} x={-3.5} y={-round} width={1} height={round} />
    {/* The set-back crown (observation floor / helipad): its top catches the sky, its side stays in body tone. */}
    <rect className={styles.wall} x={-7.2} y={-round - 1.2} width={3.9} height={1.2} />
    <rect className={styles.lit} x={-7.2} y={-round - 1.2} width={3.9} height={.5} />
    <rect className={styles.shade} x={-4} y={-round - .7} width={.7} height={.7} />
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
