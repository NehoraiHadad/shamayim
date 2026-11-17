import type { WearTip } from '../text/wear'
import styles from './WearCard.module.css'

/** One-line clothing advice for the rest of today, or tomorrow. */
export function WearCard({ tip }: { tip: WearTip | null }) {
  if (!tip) return null
  return (
    <section className={styles.card} aria-labelledby="wear-title">
      <svg className={styles.icon} viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
        <path d="M9 3.5 4 6l-1.5 5 3 1.2L6.5 10v10.5h11V10l1 2.2 3-1.2L20 6l-5-2.5a3 3 0 0 1-6 0z" />
      </svg>
      <div>
        <h2 id="wear-title" className={styles.title}>מה ללבוש {tip.when}</h2>
        <p className={styles.text}>{tip.text}</p>
      </div>
    </section>
  )
}
