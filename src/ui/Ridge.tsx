import styles from './Ridge.module.css'

/**
 * Silhouette of the Gilead ridge east of the Jordan Valley, as seen from Shadmot Mehola.
 * Two layers with a slow parallax drift; colours come from the active theme.
 */
export function Ridge() {
  return (
    <div className={styles.ridge} aria-hidden="true">
      <svg className={styles.far} viewBox="0 0 400 120" preserveAspectRatio="none">
        <path d="M0 70 C30 58 52 62 78 50 S128 30 160 38 S214 56 246 44 S300 22 336 30 S380 46 400 40 V120 H0Z" />
      </svg>
      <svg className={styles.near} viewBox="0 0 400 120" preserveAspectRatio="none">
        <path d="M0 92 C40 84 70 88 104 78 S160 62 196 70 S250 90 290 80 S350 64 400 72 V120 H0Z" />
      </svg>
    </div>
  )
}
