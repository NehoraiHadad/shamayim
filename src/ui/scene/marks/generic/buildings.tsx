import styles from '../marks.module.css'
import type { BuildingProps } from './buildingSpecs'

/**
 * Buildings drawn in px around their base point: x 0 is the centre, y 0 the ground, up is negative
 * (docs/design/ILLUSTRATION.md §3). Each returns the body; `night` adds its own lights.
 */

export function Mosque({ h, night }: BuildingProps) {
  const shaft = h - 9.5
  return <>
    <rect className={styles.wall} x={-7} y={-5} width={9} height={5} />
    <path className={styles.solid} d="M-5.5 -5a3 3 0 0 1 6 0z" />
    <rect className={styles.solid} x={2.25} y={-shaft} width={2.5} height={shaft} />
    <rect className={styles.solid} x={0.75} y={-shaft - 1.5} width={5.5} height={1.5} />
    <rect className={styles.solid} x={2.5} y={-shaft - 4.5} width={2} height={3} />
    <path className={styles.solid} d={`M2.25 ${-shaft - 4.5}h2.5l-1.25 -4z`} />
    <rect className={styles.solid} x={3} y={-h} width={1} height={1} />
    {night && <>
      <rect className={styles.win} x={-3.25} y={-3.25} width={1.5} height={1.5} />
      <circle className={styles.lamp} cx={3.5} cy={-shaft + 1} r={1.6} opacity={.3} />
      <circle className={styles.lamp} cx={3.5} cy={-shaft + 1} r={.75} />
    </>}
  </>
}

export function Synagogue({ night }: BuildingProps) {
  return <>
    <rect className={styles.wall} x={-5.5} y={-6} width={11} height={6} />
    <path className={styles.roof} d="M-3.5 -6h7l-3.5 -3z" />
    {[-3.75, -0.75, 2.25].map((x) => (
      <rect key={x} className={night ? styles.win : styles.shade} x={x} y={-5} width={1.5} height={3.5} rx={.75} />
    ))}
  </>
}

export function Church({ night }: BuildingProps) {
  return <>
    <rect className={styles.wall} x={-6} y={-6} width={8} height={6} />
    <path className={styles.roof} d="M-6 -6h8l-4 -3z" />
    <rect className={styles.wall} x={2} y={-11} width={3.5} height={11} />
    <path className={styles.roof} d="M2 -11h3.5l-1.75 -3z" />
    <rect className={styles.solid} x={3.5} y={-15.5} width={0.75} height={1.5} />
    {night && <rect className={styles.win} x={3.1} y={-8.5} width={1.3} height={2.2} rx={.6} />}
  </>
}

export function WaterTower({ h }: BuildingProps) {
  const shaft = h - 7
  return <>
    <path className={styles.solid} d={`M-1.5 0h3l-.3 ${-shaft}h-2.4z`} />
    <path className={styles.shade} d={`M-1.2 ${-shaft}h2.4l3.3 -2.5h-9z`} />
    <rect className={styles.solid} x={-4.5} y={-shaft - 6} width={9} height={3.5} />
    <rect className={styles.solid} x={-1} y={-shaft - 7} width={2} height={1} />
  </>
}

export function Castle() {
  return <path className={styles.wall}
    d="M-8 0V-9.5h1.5V-8H-5v-1.5h1.5V-8h.5v2H1v2h3v1.5h4V0H2v-2a1.25 1.25 0 0 0-2.5 0V0z" />
}
