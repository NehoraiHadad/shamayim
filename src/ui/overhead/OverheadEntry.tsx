import { RAIN_MAP } from './rainMapName'
import styles from './OverheadEntry.module.css'

/** One entry point, with an extra forecast line when there is rain to watch. */
export function OverheadEntry({ headline, onOpen }: { headline: string | null; onOpen: () => void }) {
  return (
    <button type="button" className={styles.entry} aria-haspopup="dialog" data-overhead-entry
      onClick={(event) => {
        event.currentTarget.focus({ preventScroll: true })
        onOpen()
      }}>
      <span className={styles.label}>{RAIN_MAP}<span aria-hidden="true">‹</span></span>
      {headline && <span className={styles.story}>{headline}</span>}
    </button>
  )
}
