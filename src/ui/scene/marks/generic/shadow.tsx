import styles from '../marks.module.css'

/** Shadow thrown on the ground away from the sun (drawn before the body, local coords: sun on the left). */
export function CastShadow({ w, h }: { w: number; h: number }) {
  const half = w / 2
  const reach = Math.min(8, .4 * h)
  return <path className={styles.cast} d={`M${-half + 1} 0H${half}L${half + reach} .6L${half + reach - 1} 1.3H${-half + 1}z`} />
}
