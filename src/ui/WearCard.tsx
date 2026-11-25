import type { WearTip } from '../text/wear'
import { ChevronIcon } from './icons'
import styles from './WearCard.module.css'

/** Timing and gear stay visible. A uniform recommendation can be read by opening the details. */
export function WearCard({ tip, restOfDay }: { tip: WearTip | null; restOfDay: string | null }) {
  if (!tip && !restOfDay) return null
  return (
    <div className={styles.card}>
      {restOfDay && (
        <section className={styles.restOfDay} aria-labelledby="wear-today-title">
          <h2 id="wear-today-title" className={styles.title}>להמשך היום</h2>
          <p className={styles.text}>{restOfDay}</p>
        </section>
      )}
      {tip && (
        <section className={styles.outfit} aria-labelledby="wear-title">
          <h2 id="wear-title" className={styles.title}>מה ללבוש {tip.when}</h2>
          {tip.hasTimingOrGear && <p className={styles.text}>{tip.text}</p>}
          <div className={styles.line} data-wear-line>
            {!tip.hasTimingOrGear && <p className={`${styles.text} ${styles.fallback}`}>{tip.text}</p>}
          </div>
          {!tip.hasTimingOrGear && (
            <details className={styles.details}>
              <summary className={styles.summary}>פירוט לבוש <ChevronIcon className={styles.chevron} /></summary>
              <p className={styles.text}>{tip.text}</p>
            </details>
          )}
        </section>
      )}
    </div>
  )
}
