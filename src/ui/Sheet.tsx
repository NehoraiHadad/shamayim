import type { ReactNode } from 'react'
import styles from './Sheet.module.css'

/** The paper sheet that rises over the ridge and holds the detailed forecast. */
export function Sheet({ children }: { children: ReactNode }) {
  return (
    <div className={styles.sheet}>
      {children}
    </div>
  )
}
