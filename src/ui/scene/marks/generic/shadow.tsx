import styles from '../marks.module.css'

/**
 * Shadow thrown on the ground away from the sun, plus a contact line under the whole base so the form sits in the
 * ridge instead of on it (drawn before the body, local coords: sun on the left).
 */
export function CastShadow({ w, h }: { w: number; h: number }) {
  const half = w / 2
  const reach = Math.min(8, .4 * h)
  return <>
    <path className={styles.cast} d={`M${-half + 1} 0H${half}L${half + reach} .8L${half + reach - 1.2} 1.6H${-half + 1}z`} />
    <rect className={styles.shade} x={-half} y={-.1} width={w} height={.7} />
  </>
}

/** A dome lit from the left: a full lit cap with a shade crescent on the far side, so it reads round. */
export function Dome({ cx, y, r }: { cx: number; y: number; r: number }) {
  return <>
    <path className={styles.lit} d={`M${cx - r} ${y}a${r} ${r} 0 0 1 ${2 * r} 0z`} />
    <path className={styles.shade} d={`M${cx} ${y - r}a${r} ${r} 0 0 1 ${r} ${r}h${-.4 * r}a${.6 * r} ${r} 0 0 0 ${-.6 * r} ${-r}z`} />
  </>
}
