import type { ReactNode } from 'react'
import styles from './Sheet.module.css'

/** The paper's top edge: a low bank of near ground, swelling under the big left ridge and dipping under the village. */
const BANK = 'M0 9 C45 9 60 2 105 2 S180 9 206 9 S290 5 320 6 S360 9 375 9'

/** The paper sheet: the nearest ground, lit, rising over the ridge and holding the detailed forecast. */
export function Sheet({ children }: { children: ReactNode }) {
  return (
    <div className={styles.sheet}>
      <svg className={styles.bank} viewBox="0 0 375 12" preserveAspectRatio="none" aria-hidden="true">
        <path className={styles.ground} d={`${BANK} V12 H0 Z`} />
        <path className={styles.edge} d={BANK} />
      </svg>
      {children}
    </div>
  )
}
