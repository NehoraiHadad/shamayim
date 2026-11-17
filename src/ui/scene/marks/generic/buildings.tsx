import styles from '../marks.module.css'
import type { BuildingProps } from './buildingSpecs'
import { Dome } from './shadow'

/**
 * Buildings drawn in px around their base point: x 0 is the centre, y 0 the ground, up is negative
 * (docs/design/ILLUSTRATION.md §3). Convention: the sun is on the LEFT. HillMarks mirrors the glyph when the sun is
 * east, and `.flat` tones lit faces down to wall when there is no sun. Each form has a lit face and a body/shade
 * face; no silhouette-only marks. References: Galilee/Triangle village mosques (slim cylinder minaret, one balcony,
 * pencil cone), small Israeli town synagogues (flat-roofed hall, arched windows), kibbutz mushroom water towers,
 * Crusader ruins such as Yehiam and Montfort (broken ashlar tower stub).
 */

export function Mosque({ h, night }: BuildingProps) {
  const balcony = -h * .68
  const drumTop = -h + 4
  return <>
    <rect className={styles.wall} x={-7} y={-5} width={9} height={5} />
    <rect className={styles.lit} x={-7} y={-5} width={2} height={5} />
    <Dome cx={-2.5} y={-5} r={3} />
    <rect className={styles.wall} x={2} y={balcony} width={2} height={-balcony} />
    <rect className={styles.lit} x={2} y={balcony} width={.9} height={-balcony} />
    <rect className={styles.wall} x={1.25} y={balcony - .75} width={3.5} height={.75} />
    <rect className={styles.shade} x={1.75} y={balcony} width={2.5} height={.5} />
    <rect className={styles.wall} x={2.25} y={drumTop} width={1.5} height={balcony - .75 - drumTop} />
    <path className={styles.lit} d={`M2.25 ${drumTop}h1.5l-.75 -3z`} />
    <circle className={styles.lit} cx={3} cy={-h + .5} r={.5} />
    {night && <>
      <rect className={styles.win} x={-3.25} y={-3.25} width={1.5} height={1.5} />
      <circle className={styles.lamp} cx={3} cy={balcony - .4} r={1.6} opacity={.3} />
      <circle className={styles.lamp} cx={3} cy={balcony - .4} r={.75} />
    </>}
  </>
}

export function Synagogue({ night }: BuildingProps) {
  return <>
    <rect className={styles.wall} x={-5.5} y={-7} width={11} height={7} />
    <rect className={styles.lit} x={-5.5} y={-7} width={2} height={7} />
    <rect className={styles.lit} x={-5.5} y={-7.75} width={11} height={.75} />
    <Dome cx={0} y={-7.75} r={1.75} />
    {[-2.5, 0, 2.5].map((x) => (
      <path key={x} className={night ? styles.win : styles.shade}
        d={`M${x - .7} -1.5v-2.6a.7 .7 0 0 1 1.4 0v2.6z`} />
    ))}
  </>
}

export function Church({ night }: BuildingProps) {
  return <>
    <rect className={styles.wall} x={-6} y={-6} width={8} height={6} />
    <rect className={styles.lit} x={-6} y={-6} width={2.5} height={6} />
    <path className={styles.lit} d="M-6 -6h2.5l-1.25 -2z" />
    <path className={styles.roof} d="M-4.75 -8h6.75l0 2h-5.5z" />
    <rect className={styles.wall} x={2} y={-12} width={3.5} height={12} />
    <rect className={styles.lit} x={2} y={-12} width={1.4} height={12} />
    <rect className={night ? styles.win : styles.shade} x={3.1} y={-11} width={1.3} height={2} rx={.6} />
    <Dome cx={3.75} y={-12} r={1.75} />
    <rect className={styles.solid} x={3.4} y={-15.75} width={.7} height={2} />
    <rect className={styles.solid} x={3.05} y={-15.1} width={1.4} height={.5} />
  </>
}

export function WaterTower({ h, night }: BuildingProps) {
  const shaft = h - 7
  return <>
    <path className={styles.wall} d={`M-1.5 0h3l-.3 ${-shaft}h-2.4z`} />
    <path className={styles.lit} d={`M-1.5 0h1.2v${-shaft}h-.9z`} />
    <path className={styles.shade} d={`M-1.2 ${-shaft}h2.4l3.3 -2.5h-9z`} />
    <rect className={styles.wall} x={-4.5} y={-shaft - 6} width={9} height={3.5} />
    <rect className={styles.lit} x={-4.5} y={-shaft - 6} width={4} height={3.5} />
    <rect className={styles.shade} x={-4.5} y={-shaft - 4} width={9} height={.5} />
    <path className={styles.wall} d={`M-4.5 ${-shaft - 6}l1.5 -1h6l1.5 1z`} />
    {night && <circle className={styles.win} cx={0} cy={-shaft - 7.2} r={.5} />}
  </>
}

export function Castle() {
  return <>
    <path className={styles.wall} d="M-8 0v-7.5l1 -.8 .6 1 .9 -1.6 1.1 .4 .4 -.9 1 .6V-5h1.5l.8 -.7 1.2 .5 .9 -.4 1.3.6 1.6 -.3L5.2 -3.4h1l.2 -.3.4 1.7h.8L8 0z" />
    <path className={styles.lit} d="M-8 0v-7.5l1 -.8 .6 1 .4 -.7V0z" />
    <path className={styles.lit} d="M-3 -5h1.5l.8 -.7 1.2 .5 .9 -.4 1.3 .6 1.6 -.3v.5l-1.6 .3 -1.3 -.6 -.9 .4 -1.2 -.5 -.8 .7H-3z" />
    <rect className={styles.wall} x={5.5} y={-1} width={1} height={1} />
    <rect className={styles.wall} x={7.2} y={-.7} width={.8} height={.7} />
  </>
}
