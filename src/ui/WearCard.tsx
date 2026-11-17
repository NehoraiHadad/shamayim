import type { WearTip } from '../text/wear'
import styles from './WearCard.module.css'

/** One-line clothing advice for the rest of today, or tomorrow. */
export function WearCard({ tip }: { tip: WearTip | null }) {
  if (!tip) return null
  return (
    <section className={styles.card} aria-labelledby="wear-title">
      <div>
        <h2 id="wear-title" className={styles.title}>מה ללבוש {tip.when}</h2>
        <p className={styles.text}>{tip.text}</p>
      </div>
    </section>
  )
}
