import type { ReactNode } from 'react'
import styles from './Sheet.module.css'

/** The yard's top: a low bank of near ground, swelling under the big left ridge and dipping under the village. */
const YARD_TOP = 'M0 9 C45 9 60 2 105 2 S180 9 206 9 S290 5 320 6 S360 9 375 9'
/** Where the lit paper begins: out of phase with the bank, so the yard between them is 9–27 px thick. */
const YARD_FOOT = 'M0 20 C40 20 70 30 120 29 S200 16 245 17 S330 28 375 24'

/** The paper sheet: the nearest ground, lit, rising over the ridge and holding the detailed forecast. */
export function Sheet({ children }: { children: ReactNode }) {
  return (
    <div className={styles.sheet}>
      {/* A half-tone strip of ground between the dark ridge and the light paper, so the eye steps down in two moves. */}
      <svg className={styles.bank} viewBox="0 0 375 34" preserveAspectRatio="none" aria-hidden="true">
        <path className={styles.yard} d={`${YARD_TOP} V34 H0 Z`} />
        <path className={styles.ground} d={`${YARD_FOOT} V34 H0 Z`} />
      </svg>
      {children}
    </div>
  )
}
