import { useEffect } from 'react'
import type { FailureCause, FetchFailure } from '../data/fetchFailure'
import styles from './States.module.css'

export function LoadingState() {
  return (
    <div className={styles.state} role="status" aria-live="polite">
      <div className={`${styles.skeleton} ${styles.temp}`} />
      <div className={`${styles.skeleton} ${styles.line}`} />
      <div className={`${styles.skeleton} ${styles.line} ${styles.short}`} />
      <span className="visually-hidden">מביאים את התחזית…</span>
    </div>
  )
}

const FAILURE_TEXT: Record<FailureCause, string> = {
  network: 'לא הצלחנו להתחבר. בדקו את הרשת ונסו שוב.',
  busy: 'השירות עמוס, נסו שוב בעוד דקה.',
}

export function ErrorState({ failure, onRetry }: { failure: FetchFailure | null; onRetry: () => void }) {
  const message = failure?.message
  useEffect(() => {
    if (message) console.error(message)
  }, [message])
  return (
    <div className={styles.state} role="alert">
      <p className={styles.title}>אין תחזית כרגע</p>
      <p className={styles.text}>{FAILURE_TEXT[failure?.cause ?? 'network']}</p>
      <button type="button" className={styles.button} onClick={onRetry}>לנסות שוב</button>
    </div>
  )
}
