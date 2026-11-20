import type { ReactNode } from 'react'
import styles from './Sky.module.css'

interface Props {
  /** What lives in the sky: the scene's sky canvas (portalled in by `scene/react/useSkyHost.ts`); the birds,
   * aircraft and meteors are drawn in it (C10). */
  children?: ReactNode
}

/**
 * The sky behind everything: the theme gradient, the first paint before the scene's sky canvas covers it (the canvas
 * draws the stars, clouds, sun and moon), then what lives in it.
 */
export function Sky({ children }: Props) {
  return (
    <div className={styles.sky} data-sky aria-hidden="true">
      {children}
    </div>
  )
}
