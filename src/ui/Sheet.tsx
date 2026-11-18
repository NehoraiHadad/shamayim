import type { ReactNode } from 'react'
import styles from './Sheet.module.css'

/** The paper sheet: a separate page laid over the bottom of the landscape, holding the detailed forecast. */
export function Sheet({ children }: { children: ReactNode }) {
  return <div className={styles.sheet}>{children}</div>
}
