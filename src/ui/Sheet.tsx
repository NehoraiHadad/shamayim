import type { ReactNode } from 'react'
import styles from './Sheet.module.css'

/** The paper sheet: a separate page laid over the bottom of the landscape, holding the detailed forecast. */
export function Sheet({ children, overlapsScene }: { children: ReactNode; overlapsScene: boolean }) {
  return <div className={styles.sheet} data-overlaps-scene={overlapsScene || undefined}>{children}</div>
}
