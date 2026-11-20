import type { WearTip } from '../text/wear'
import styles from './WearCard.module.css'

/**
 * One-line clothing advice for the rest of today, or tomorrow, under today's clothes pegged on a line. The line is drawn
 * on canvas by the scene's chunk, from the scene's own world (`scene/react/WearCanvas.tsx`, portalled into the box held
 * here): the box keeps its size before the drawing arrives, so nothing moves. Decorative; the sentence carries the words.
 */
export function WearCard({ tip }: { tip: WearTip | null }) {
  if (!tip) return null
  return (
    <section className={styles.card} aria-labelledby="wear-title">
      <div className={styles.line} data-wear-line aria-hidden="true" />
      <h2 id="wear-title" className={styles.title}>מה ללבוש {tip.when}</h2>
      <p className={styles.text}>{tip.text}</p>
    </section>
  )
}
