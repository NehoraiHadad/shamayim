import { useEffect } from 'react'
import styles from './States.module.css'

export function LoadingState() {
  return (
    <div className={styles.state} role="status" aria-live="polite">
      <div className={`${styles.skeleton} ${styles.temp}`} />
      <div className={`${styles.skeleton} ${styles.line}`} />
      <div className={`${styles.skeleton} ${styles.line} ${styles.short}`} />
      <span className={styles.visuallyHidden}>מביאים את התחזית…</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  useEffect(() => {
    if (message) console.error(message)
  }, [message])
  return (
    <div className={styles.state} role="alert">
      <p className={styles.title}>אין תחזית כרגע</p>
      <p className={styles.text}>לא הצלחנו להתחבר. בדקו את הרשת ונסו שוב.</p>
      <button type="button" className={styles.button} onClick={onRetry}>לנסות שוב</button>
    </div>
  )
}
