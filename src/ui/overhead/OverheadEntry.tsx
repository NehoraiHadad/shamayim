import { RAIN_MAP } from './rainMapName'
import styles from './OverheadEntry.module.css'

/** Opens the rain map: the verdict's headline at the top when rain is near, else a quiet link at the end. */
export function OverheadEntry({ rainy, headline, position, onOpen }: {
  rainy: boolean
  headline: string
  position: 'top' | 'bottom'
  onOpen: () => void
}) {
  if (rainy !== (position === 'top')) return null
  return (
    <button type="button" className={rainy ? styles.row : styles.link} aria-haspopup="dialog" data-overhead-entry
      onClick={(event) => {
        event.currentTarget.focus({ preventScroll: true })
        onOpen()
      }}>
      {rainy ? (
        <>
          <span className={styles.story}>{headline}</span>
          <span className={styles.more}>למפת הגשם <span aria-hidden="true">‹</span></span>
        </>
      ) : RAIN_MAP}
    </button>
  )
}
